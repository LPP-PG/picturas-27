import argparse
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import call, patch
from controller import Drain, Policy


def options():
    return argparse.Namespace(minimum=1, maximum=2, samples=2, cooldown=60, idle=120)


class PolicyTests(unittest.TestCase):
    def test_sustained_backlog_scales_once_and_respects_maximum(self):
        p, a = Policy(), options()
        s = dict(messages_ready=1, messages_unacknowledged=1, consumers=1)
        self.assertEqual(p.decide(0, s, 1, a), 'hold')
        self.assertEqual(p.decide(10, s, 1, a), 'up')
        p.changed(10)
        self.assertEqual(p.decide(20, s, 1, a), 'hold')
        self.assertEqual(p.decide(80, s, 2, a), 'hold')

    def test_busy_job_blocks_scale_down_even_with_no_backlog(self):
        p, a = Policy(), options()
        empty = dict(messages_ready=0, messages_unacknowledged=0, consumers=1)
        busy = dict(messages_ready=0, messages_unacknowledged=1, consumers=1)
        self.assertEqual(p.decide(0, empty, 2, a), 'hold')
        self.assertEqual(p.decide(120, busy, 2, a), 'hold')
        self.assertEqual(p.decide(130, empty, 2, a), 'hold')
        self.assertEqual(p.decide(250, empty, 2, a), 'drain')
        self.assertEqual(p.decide(260, empty, 1, a), 'hold')

    def test_failed_monitoring_breaks_consecutive_samples(self):
        p, a = Policy(), options()
        s = dict(messages_ready=1, messages_unacknowledged=1, consumers=1)
        p.decide(0, s, 1, a)
        p.failed_sample()
        self.assertEqual(p.decide(30, s, 1, a), 'hold')

    def test_missing_worker_is_restored(self):
        self.assertEqual(Policy().decide(0, dict(messages_ready=0,
                         messages_unacknowledged=0, consumers=0), 0, options()), 'up')


    def test_persistent_pending_jobs_without_consumers_alert_without_scaling(self):
        p, a = Policy(), options()
        disconnected = dict(messages_ready=2, messages_unacknowledged=0, consumers=0)
        connected = dict(disconnected, consumers=1)
        p.changed(0)
        self.assertEqual(p.decide(10, disconnected, 2, a), 'hold')
        self.assertEqual(p.decide(20, disconnected, 2, a), 'no_consumers')
        self.assertEqual(p.decide(30, connected, 2, a), 'hold')
        self.assertEqual(p.decide(40, disconnected, 2, a), 'hold')
        p.failed_sample()
        self.assertEqual(p.decide(50, disconnected, 2, a), 'hold')


class DrainRecoveryTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / 'worker.state'

    @patch('controller.command')
    def test_restart_resumes_running_worker_and_removes_only_after_clean_exit(self, docker):
        running = {'Id': 'target', 'State': {'Status': 'running'}}
        original = Drain(self.path)
        original.start('target')
        self.assertEqual(original.resume([running]), 'draining')

        resumed = Drain(self.path)
        self.assertEqual(resumed.resume([running]), 'draining')
        self.assertEqual(resumed.resume([running]), 'draining')
        self.assertTrue(self.path.exists())
        exited = {'Id': 'target', 'State': {'Status': 'exited', 'ExitCode': 0}}
        self.assertEqual(resumed.resume([running | {'Id': 'other'}, exited]), 'drained')
        self.assertFalse(self.path.exists())
        self.assertEqual(docker.call_args_list, [
            call(['docker', 'kill', '--signal=SIGUSR1', 'target']),
            call(['docker', 'kill', '--signal=SIGUSR1', 'target']),
            call(['docker', 'rm', 'target']),
        ])

    @patch('controller.command')
    def test_restart_retries_removal_when_worker_has_already_exited(self, docker):
        Drain(self.path).start('target')
        exited = {'Id': 'target', 'State': {'Status': 'exited', 'ExitCode': 0}}
        docker.side_effect = [RuntimeError('Docker unavailable'), None]
        with self.assertRaisesRegex(RuntimeError, 'Docker unavailable'):
            Drain(self.path).resume([exited])
        self.assertTrue(self.path.exists())
        self.assertEqual(Drain(self.path).resume([exited]), 'drained')
        self.assertFalse(self.path.exists())

    @patch('controller.command')
    def test_failed_exit_is_left_for_inspection(self, docker):
        Drain(self.path).start('target')
        failed = {'Id': 'target', 'State': {'Status': 'exited', 'ExitCode': 1}}
        with self.assertRaisesRegex(RuntimeError, 'did not exit successfully'):
            Drain(self.path).resume([failed])
        self.assertTrue(self.path.exists())
        docker.assert_not_called()


if __name__ == '__main__':
    unittest.main()
