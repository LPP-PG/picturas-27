"""Exercise the actual worker methods with a fake transport (no broker required)."""
import ast
from pathlib import Path
import signal
import unittest
from unittest.mock import Mock, patch

source = Path(__file__).resolve().parents[2] / 'Tools/video/worker.py'
node = next(n for n in ast.parse(source.read_text()).body if isinstance(n, ast.ClassDef))
namespace = {'signal': signal}
exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
VideoWorker = namespace['VideoWorker']


class DrainTests(unittest.TestCase):
    def worker(self):
        w = object.__new__(VideoWorker)
        w._draining = False
        w.procedure = 'video_edit'
        w.queue = 'video_edit_queue'
        w._channel = Mock()
        w._connection = Mock()
        w._connection.is_open = True
        return w

    def test_signal_only_sets_flag_and_does_not_touch_transport(self):
        w = self.worker()
        w._request_drain()
        self.assertTrue(w._draining)
        self.assertEqual(w._channel.mock_calls, [])
        self.assertEqual(w._connection.mock_calls, [])

    def test_message_received_after_drain_is_requeued_without_processing(self):
        w = self.worker()
        w.process = Mock()
        w._request_drain()
        w.callback(w._channel, type('Delivery', (), {'delivery_tag': 7})(), None, b'{}')
        w._channel.basic_nack.assert_called_once_with(delivery_tag=7, requeue=True)
        w._channel.basic_ack.assert_not_called()
        w.process.assert_not_called()

    def test_run_closes_transport_only_after_dispatch_returns(self):
        w = self.worker()
        events = []
        def dispatch(**kwargs):
            events.append('job-running')
            w._request_drain()
            events.append('job-finished')
        w._connection.process_data_events.side_effect = dispatch
        w._channel.stop_consuming.side_effect = lambda: events.append('stop')
        w._connection.close.side_effect = lambda: events.append('close')
        with patch.object(signal, 'signal'):
            w.run()
        self.assertEqual(events, ['job-running', 'job-finished', 'stop', 'close'])


if __name__ == '__main__':
    unittest.main()
