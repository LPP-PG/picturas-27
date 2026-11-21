"""Host-side RabbitMQ/Compose autoscaler. Standard library only; dry-run by default."""
import argparse
import csv
import json
import os
import signal
import subprocess
import time
import urllib.parse
import urllib.request
import base64
from pathlib import Path

DEFAULT_SERVICES = {
    'video_tool': 'video_edit_queue',
    'video_subtitles_tool': 'video_subtitles_queue',
    'video_frames_tool': 'video_frames_queue',
}


def command(args):
    return subprocess.check_output(args, text=True, timeout=45).strip()


def queue_stats(url, user, password, queue):
    endpoint = url.rstrip('/') + '/api/queues/%2F/' + urllib.parse.quote(queue, safe='')
    req = urllib.request.Request(endpoint)
    token = base64.b64encode(f'{user}:{password}'.encode()).decode()
    req.add_header('Authorization', 'Basic ' + token)
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.load(response)
    return {key: int(data[key]) for key in
            ('messages_ready', 'messages_unacknowledged', 'consumers')}


class Policy:
    def __init__(self):
        self.backlog = 0
        self.no_consumers = 0
        self.idle_since = None
        self.last_change = None

    def decide(self, now, stats, replicas, args):
        ready = stats['messages_ready']
        busy = stats['messages_unacknowledged']
        self.backlog = self.backlog + 1 if ready > 0 and busy > 0 else 0
        if ready > 0 and stats['consumers'] == 0:
            self.no_consumers += 1
        else:
            self.no_consumers = 0
        if ready == 0 and busy == 0:
            if self.idle_since is None:
                self.idle_since = now
        else:
            self.idle_since = None
        # Alert even during cooldown or at the replica limit.
        if replicas >= args.minimum and self.no_consumers >= args.samples:
            return 'no_consumers'
        if self.last_change is not None and now - self.last_change < args.cooldown:
            return 'hold'
        if replicas < args.minimum:
            return 'up'
        if self.backlog >= args.samples and replicas < args.maximum:
            return 'up'
        if (self.idle_since is not None and now - self.idle_since >= args.idle
                and replicas > args.minimum):
            return 'drain'
        return 'hold'

    def changed(self, now):
        self.last_change = now
        self.backlog = 0
        self.no_consumers = 0
        self.idle_since = None

    def failed_sample(self):
        self.backlog = 0
        self.no_consumers = 0
        self.idle_since = None


def containers(compose, service):
    ids = command(compose + ['ps', '--all', '--quiet', service]).split()
    if not ids:
        return []
    return json.loads(command(['docker', 'inspect'] + ids))


class Drain:
    def __init__(self, path):
        self.path = path
        self.signaled = False

    def start(self, container_id):
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(container_id, encoding='ascii')
        temporary.replace(self.path)
        self.signaled = False

    def resume(self, items):
        container_id = self.path.read_text(encoding='ascii')
        item = next((item for item in items if item['Id'] == container_id), None)
        if item is not None:
            state = item['State']
            if state['Status'] == 'restarting':
                return 'draining'
            if state['Status'] == 'running':
                if not self.signaled:
                    command(['docker', 'kill', '--signal=SIGUSR1', container_id])
                    self.signaled = True
                return 'draining'
            if state['Status'] != 'exited' or state['ExitCode'] != 0:
                raise RuntimeError('Drained worker did not exit successfully; inspect manually')
            command(['docker', 'rm', container_id])
        self.path.unlink()
        self.signaled = False
        return 'drained'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Enable Docker mutations')
    parser.add_argument('--service', action='append', choices=list(DEFAULT_SERVICES))
    parser.add_argument('--minimum', type=int, default=1)
    parser.add_argument('--maximum', type=int, default=2)
    parser.add_argument('--interval', type=float, default=10)
    parser.add_argument('--samples', type=int, default=2)
    parser.add_argument('--cooldown', type=float, default=60)
    parser.add_argument('--idle', type=float, default=120)
    parser.add_argument('--rabbit-url', default='http://localhost:15672')
    parser.add_argument('--csv', default='medicoes/autoscaling.csv')
    args = parser.parse_args()
    if not (1 <= args.minimum <= args.maximum and args.interval > 0
            and args.samples >= 1 and args.cooldown >= 0 and args.idle >= 0):
        parser.error('Invalid replica limits or timing parameters')
    user = os.environ.get('AUTOSCALE_RABBIT_USER')
    password = os.environ.get('AUTOSCALE_RABBIT_PASSWORD')
    if not user or not password:
        parser.error('Set AUTOSCALE_RABBIT_USER and AUTOSCALE_RABBIT_PASSWORD')
    root = Path(__file__).resolve().parents[2]
    os.chdir(root)
    # Exclusive host lock prevents simultaneous controllers in this checkout.
    import fcntl
    lock = open(root / '.autoscaling.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        parser.error('Another controller is already running in this checkout')
    compose = ['docker', 'compose', '-f', str(root / 'docker-compose.yaml')]
    services = args.service or ['video_subtitles_tool']
    policies = {s: Policy() for s in services}
    drains = {}
    if args.apply:
        project = json.loads(command(compose + ['config', '--format', 'json']))['name']
        compose += ['--project-name', project]
        drains = {
            service: Drain(root / f'.autoscaling-drain-{project}-{service}.state')
            for service in services
        }
    running = True

    def stop(*_):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    output = Path(args.csv)
    output.parent.mkdir(parents=True, exist_ok=True)
    fields = ['timestamp', 'service', 'queue', 'ready', 'unacknowledged', 'consumers',
              'replicas', 'desired', 'action', 'mode', 'error']
    exists = output.exists() and output.stat().st_size > 0
    with output.open('a', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        if not exists:
            writer.writeheader()
        while running:
            for service in services:
                policy = policies[service]
                row = dict.fromkeys(fields, '')
                row.update(timestamp=time.time(), service=service,
                           queue=DEFAULT_SERVICES[service], mode='apply' if args.apply else 'dry-run')
                try:
                    stats = queue_stats(args.rabbit_url, user, password, row['queue'])
                    items = containers(compose, service)
                    live = [c for c in items if c['State']['Running']]
                    count = len(live)
                    row.update(ready=stats['messages_ready'], unacknowledged=stats['messages_unacknowledged'],
                               consumers=stats['consumers'], replicas=count, desired=count)
                    now = time.monotonic()
                    drain = drains.get(service)
                    if drain is not None and drain.path.exists():
                        row['action'] = drain.resume(items)
                        if row['action'] == 'drained':
                            policy.changed(now)
                    else:
                        action = policy.decide(now, stats, count, args)
                        row['action'] = action
                        if action == 'no_consumers':
                            row['error'] = 'Queue has pending jobs but no RabbitMQ consumers'
                        elif action == 'up':
                            row['desired'] = count + 1
                            if args.apply:
                                command(compose + ['up', '-d', '--no-deps', '--no-recreate',
                                                   '--scale', f'{service}={count + 1}', service])
                            policy.changed(now)
                        elif action == 'drain':
                            row['desired'] = count - 1
                            if drain is not None:
                                # Signal one specific worker; never let Compose choose a busy one to kill.
                                drain.start(live[-1]['Id'])
                                drain.resume(items)
                            policy.changed(now)
                except Exception as exc:
                    policy.failed_sample()
                    row.update(action='error', error=str(exc))
                writer.writerow(row)
                stream.flush()
                print(json.dumps(row), flush=True)
            deadline = time.monotonic() + args.interval
            while running and time.monotonic() < deadline:
                time.sleep(min(0.2, max(0, deadline - time.monotonic())))
    print('Controller stopped. Existing replicas are left unchanged.', flush=True)


if __name__ == '__main__':
    main()
