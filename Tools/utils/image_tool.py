"""RabbitMQ worker shared by the PIL image tools.

Each tool consumes `<tool>_queue`, applies the filter of the same name from
utils/filters.py to the input image and replies to the projects service on
project_queue. Only the tool name and its two error codes differ per tool.
"""
import datetime
import inspect
import json

import pytz

from utils import filters
from utils.img_handler import Img_Handler

WRONG_PROCEDURE = "The procedure received does not fit into this tool"


class ImageTool:
    def __init__(self, procedure, codes, tool_msg=None, img_handler=None):
        self.procedure = procedure
        self.filter = filters.FILTERS[procedure]
        # The filter takes the image and then the parameters the frontend sends
        self.param_names = list(inspect.signature(self.filter).parameters)[1:]
        self.wrong_procedure_code, self.error_processing_code = codes
        self._img_handler = img_handler or Img_Handler()
        self._tool_msg = tool_msg or self._connect()
        self._counter = 0

    def _connect(self):
        import utils.env as env
        from utils.tool_msg import ToolMSG
        return ToolMSG(f"picturas-{self.procedure}-tool-ms", self.procedure,
                       env.RABBITMQ_HOST, env.RABBITMQ_PORT,
                       env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)

    def apply(self, input_path, output_path, params):
        img = self._img_handler.get_img(input_path)
        args = {name: params[name] for name in self.param_names}
        self._img_handler.store_img(self.filter(img, **args), output_path)

    def callback(self, ch, method, properties, body):
        try:
            info = json.loads(body.decode())
            msg_id = info["messageId"]
            received = datetime.datetime.fromisoformat(info["timestamp"])
            params = info["parameters"]
            input_path = params["inputImageURI"]
            output_path = params["outputImageURI"]
        except (ValueError, KeyError, TypeError) as error:
            print(f"[{self.procedure}] invalid message discarded: {error}", flush=True)
            return

        resp_msg_id = f"{self.procedure}-{self._counter}-{msg_id}"
        self._counter += 1

        error = None
        if info.get("procedure") != self.procedure:
            error = (self.wrong_procedure_code, WRONG_PROCEDURE)
        else:
            try:
                self.apply(input_path, output_path, params)
            except Exception as exc:  # noqa: BLE001 - any failure is reported
                error = (self.error_processing_code, str(exc))

        now = datetime.datetime.now(pytz.utc)
        processing_time = (now - received).total_seconds() * 1000
        if error is None:
            self._tool_msg.send_msg(msg_id, resp_msg_id, now.isoformat(), "success",
                                    processing_time, output_path)
        else:
            self._tool_msg.send_msg(msg_id, resp_msg_id, now.isoformat(), "error",
                                    processing_time, None, err_code=error[0],
                                    err_msg=error[1], og_img_uri=input_path)
        status = "success" if error is None else f"error {error[0]}: {error[1]}"
        print(f"[{self.procedure}] msg={msg_id} {status}", flush=True)

    def run(self):
        while True:
            self._tool_msg.read_msg(self.callback)
