# Host-side video autoscaling

Implementation prepared against commit `a39bd77`. This is not a performance result.
No third-party Python dependencies are required by the controller. Run on macOS/Linux
with Python 3 and Docker Compose v2, from the same checkout/project as the application.

## Design

The host controller polls RabbitMQ Management API. Each selected queue has an independent
policy. Default scope is subtitles only, 1–2 replicas. `--service` can be repeated for
`video_tool`, `video_subtitles_tool`, and `video_frames_tool`. Limits apply per service;
selecting all three can therefore create six workers. Check available CPU/RAM first.

Defaults: poll 10 s; two consecutive samples with ready > 0 and unacknowledged > 0
trigger one extra replica; cooldown 60 s. Scale-down requires ready = 0 AND
unacknowledged = 0 for 120 s. These are provisional policy parameters, not measured RNF targets.
Failed samples reset the backlog and idle observations. The controller leaves the
replicas unchanged on monitoring errors. Docker commands are sequential and bounded.

Scale-down sends SIGUSR1 to one specific container. The worker finishes any active
callback, including confirmed result publication and job acknowledgment, refuses new
work, closes its consumer and exits successfully. With `restart: on-failure` it stays
stopped. The controller removes only that stopped container, never force-kills a busy
worker. New work arriving after the queue snapshot is either completed by the selected
worker or requeued. A slow drain has no forced timeout. If the controller stops while
draining, inspect the exited container manually; it does not automatically recover the
in-memory drain record. Ctrl+C does not restore replicas to one.

Run only after rebuilding the new workers: SIGUSR1 is not safe on older images.
Do not run competing controllers or manually scale the same project during experiments.
The checkout lock prevents concurrent controllers in this checkout, not on other hosts.
The host account needs Docker access. No Docker socket is mounted into a container.

## Execution

1. Preserve the original baseline and record commits, hardware and Docker resource limits.
   Commit/stash your own changes before applying the delivered patch. Do not overwrite
   colleagues' work. Rebuild the selected service (or all three if selecting all):

```sh
docker compose up -d --build video_subtitles_tool
```

2. Set credentials in the terminal (use the RabbitMQ credentials of this environment):

```sh
export AUTOSCALE_RABBIT_USER='user'
read -s AUTOSCALE_RABBIT_PASSWORD
export AUTOSCALE_RABBIT_PASSWORD
```

3. Simulate decisions first. No scale changes occur in this mode:

```sh
python3 scripts/autoscaling/controller.py --csv medicoes/autoscaling-dry.csv
```

4. Stop with Ctrl+C. Enable real actions:

```sh
python3 scripts/autoscaling/controller.py --apply --csv medicoes/autoscaling-apply.csv
```

To select all workers, rebuild all three first and append:
`--service video_tool --service video_subtitles_tool --service video_frames_tool`.
Do not raise the maximum before measuring memory consumption, especially for Whisper.

## Tests

```sh
python3 -m unittest discover -s scripts/autoscaling -v
```

These are isolated policy and drain tests. They do not demonstrate real parallelism,
Docker scaling, successful rendering, or performance improvements.

## Integration and evaluation checklist (pending)

Use three configurations: original monolithic baseline; split services fixed at one
replica; same split services with this autoscaler. This separates modularity gains
from elasticity gains. Keep identical media, pipeline, number and submission timing of
jobs, Docker resources and warm/cold model-cache conditions. Run repeated trials and
record failures as well as successful timings.

- Prebuild images/download models before timed warm runs; document cold-start runs separately.
- Submit overlapping long jobs through the application. Confirm backlog and automatic 1→2.
- Confirm overlapping per-job start/end timestamps, not only two RabbitMQ consumers.
- Check output videos, ordered pipelines, preview, quotas and image regression cases.
- Keep submitting load around scale-down; ensure no interrupted/lost jobs and eventual
  successful completion, without duplicated user-visible results.
- Verify eventual 2→1, cooldown, minimum/maximum, RabbitMQ outage and Docker outage.
- Interrupt/restart the controller; inspect and resolve any incomplete drain explicitly.
- Compare per-job waiting/processing/end-to-end time, total batch time, throughput,
  CPU, peak memory and replica-seconds. CSV queue snapshots do NOT provide exact job
  waiting times. Collect per-job timestamps separately from submission and worker events.
- Agree quantitative target and minimum with the team before final evaluation. Do not
  claim a speedup until measured; two CPU-heavy workers can contend and slow down.

## AI assistance

Controller, isolated tests, drain extension and this guide were prepared with ChatGPT/
Codex assistance. Team review and real Docker integration measurements are still required.
No functional feature is added; the existing workers and stage routing are preserved.
