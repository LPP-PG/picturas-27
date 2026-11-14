import argparse
import unittest
from controller import Policy


def options():
    return argparse.Namespace(minimum=1, maximum=2, samples=2, cooldown=60, idle=120)


class PolicyTests(unittest.TestCase):
    def test_sustained_backlog_scales_once_and_respects_maximum(self):
        p, a = Policy(), options()
        s = dict(messages_ready=1, messages_unacknowledged=1)
        self.assertEqual(p.decide(0, s, 1, a), 'hold')
        self.assertEqual(p.decide(10, s, 1, a), 'up')
        p.changed(10)
        self.assertEqual(p.decide(20, s, 1, a), 'hold')
        self.assertEqual(p.decide(80, s, 2, a), 'hold')

    def test_busy_job_blocks_scale_down_even_with_no_backlog(self):
        p, a = Policy(), options()
        empty = dict(messages_ready=0, messages_unacknowledged=0)
        busy = dict(messages_ready=0, messages_unacknowledged=1)
        self.assertEqual(p.decide(0, empty, 2, a), 'hold')
        self.assertEqual(p.decide(120, busy, 2, a), 'hold')
        self.assertEqual(p.decide(130, empty, 2, a), 'hold')
        self.assertEqual(p.decide(250, empty, 2, a), 'drain')
        self.assertEqual(p.decide(260, empty, 1, a), 'hold')

    def test_failed_monitoring_breaks_consecutive_samples(self):
        p, a = Policy(), options()
        s = dict(messages_ready=1, messages_unacknowledged=1)
        p.decide(0, s, 1, a)
        p.failed_sample()
        self.assertEqual(p.decide(30, s, 1, a), 'hold')

    def test_missing_worker_is_restored(self):
        self.assertEqual(Policy().decide(0, dict(messages_ready=0,
                         messages_unacknowledged=0), 0, options()), 'up')


if __name__ == '__main__':
    unittest.main()
