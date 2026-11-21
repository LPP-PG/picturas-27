"""RabbitMQ transport shared by the three video workers."""
import datetime
import json
import shutil
import signal
import tempfile
import time
import uuid
from pathlib import Path

import pika
import pytz
from pika.exchange_type import ExchangeType

import utils.env as env
from video_media import InvalidSpeed, InvalidTrim, InvalidVideo, UnsupportedEffect

EXCHANGE = "picturas"
RESULT_QUEUE = "video_result_queue"
WS_QUEUE = "ws_queue"
ERROR_CODES = {UnsupportedEffect: 2002, InvalidTrim: 2003, InvalidVideo: 2004, InvalidSpeed: 2005}


def now():
    return datetime.datetime.now(pytz.utc)


class VideoWorker:
    def __init__(self, procedure, process):
        self._draining = False
        self.procedure = procedure
        self.process = process
        self.queue = f"{procedure}_queue"
        self._connection = self._connect()
        self._channel = self._connection.channel()
        self._channel.exchange_declare(exchange=EXCHANGE,
                                       exchange_type=ExchangeType.direct, durable=True)
        self._channel.queue_declare(queue=self.queue, durable=True)
        self._channel.queue_bind(queue=self.queue, exchange=EXCHANGE, routing_key=self.queue)
        self._channel.basic_qos(prefetch_count=1)
        # Confirm results before acknowledging jobs. Progress is transient.
        self._results = self._connection.channel()
        self._results.confirm_delivery()

    @staticmethod
    def _connect():
        credentials = pika.PlainCredentials(env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        params = pika.ConnectionParameters(
            env.RABBITMQ_HOST, int(env.RABBITMQ_PORT), "/", credentials,
            # Processing blocks this thread, as in the original video worker.
            heartbeat=0,
        )
        for _ in range(30):
            try:
                return pika.BlockingConnection(params)
            except pika.exceptions.AMQPConnectionError:
                time.sleep(2)
        raise RuntimeError("Could not connect to RabbitMQ")

    def _progress(self, params, percent):
        progress = params.get("progress") or {}
        if not progress.get("user"):
            return
        start, end = params["progressStart"], params["progressEnd"]
        percent = int(start + (end - start) * percent / 100)
        if not params["terminal"]:
            percent = min(99, percent)
        self._channel.basic_publish(exchange=EXCHANGE, routing_key=WS_QUEUE, body=json.dumps({
            "messageId": f"update-client-video-progress-{uuid.uuid4()}",
            "timestamp": now().isoformat(),
            "status": "success",
            "user": progress["user"],
            "projectId": progress.get("projectId"),
            "imgId": progress.get("imgId"),
            "preview": params["progressPreview"],
            "percent": percent,
        }))

    def callback(self, ch, method, properties, body):
        if self._draining:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            return
        started = now()
        try:
            info = json.loads(body)
            msg_id = info["messageId"]
            params = info["parameters"]
            index = params["stageIndex"]
            input_uri = params["inputImageURI"]
            target = Path(params["outputImageURI"]).resolve()
        except (ValueError, KeyError, TypeError) as error:
            print(f"[{self.procedure}] invalid message discarded: {error}", flush=True)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        attempt = None
        try:
            if info.get("procedure") != self.procedure:
                raise ValueError("The procedure received does not fit into this tool")
            # Distinct render paths prevent redeliveries from overwriting files
            # that a later stage or the projects service is reading.
            attempt = tempfile.mkdtemp(prefix="render-", dir=target.parent)
            output_path = str(Path(attempt) / target.name)
            self._progress(params, 0)
            video_info = self.process(input_uri, output_path, params,
                                      lambda pct: self._progress(params, pct))
            output = {"type": video_info.get("output_type", "video"),
                      "imageURI": video_info.get("output_path", output_path)}
            if output["type"] == "frames":
                output["frames"] = video_info["frames"]
            reply = {"status": "success", "output": output}
        except Exception as error:
            if attempt:
                shutil.rmtree(attempt, ignore_errors=True)
            code = 2000 if info.get("procedure") != self.procedure else ERROR_CODES.get(type(error), 2001)
            reply = {"status": "error", "error": {
                "code": code, "message": str(error), "msg": str(error),
                "details": {"inputFileURI": input_uri},
            }}

        reply.update({
            "messageId": f"video-{uuid.uuid4()}",
            "correlationId": msg_id,
            "stageIndex": index,
            "timestamp": now().isoformat(),
            "metadata": {
                "processingTime": (now() - started).total_seconds() * 1000,
                "microservice": f"picturas-{self.procedure.replace('_', '-')}-tool-ms",
            },
        })
        self._results.basic_publish(exchange=EXCHANGE, routing_key=RESULT_QUEUE,
                                    body=json.dumps(reply), mandatory=True,
                                    properties=pika.BasicProperties(delivery_mode=2))
        print(f"[{self.procedure}] msg={msg_id} stage={index} status={reply['status']}", flush=True)
        ch.basic_ack(delivery_tag=method.delivery_tag)

    def _request_drain(self, *_):
        # The signal handler never touches Pika; the active callback finishes first.
        self._draining = True

    def run(self):
        signal.signal(signal.SIGUSR1, self._request_drain)
        self._channel.basic_consume(queue=self.queue, on_message_callback=self.callback,
                                    auto_ack=False)
        print(f"[{self.procedure}] waiting for jobs on {self.queue}", flush=True)
        try:
            while not self._draining:
                self._connection.process_data_events(time_limit=1)
            self._channel.stop_consuming()
            print(f"[{self.procedure}] drained; exiting successfully", flush=True)
        finally:
            if self._connection.is_open:
                self._connection.close()
