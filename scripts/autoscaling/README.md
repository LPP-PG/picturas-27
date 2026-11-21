# Host-side video autoscaling

The controller was initially prepared against commit `a39bd77`.
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
replicas unchanged on monitoring errors. When jobs are waiting and RabbitMQ reports
zero consumers for the configured number of consecutive samples, the controller
records a `no_consumers` alert in stdout and the CSV if the minimum number of
containers is already running. Inspect the worker and its RabbitMQ connection in
this case. The alert does not restart workers. Missing containers are handled by
the minimum-replica policy. Docker commands are sequential and bounded.

Scale-down sends SIGUSR1 to one specific container. The worker finishes any active
callback, including confirmed result publication and job acknowledgment, refuses new
work, closes its consumer and exits successfully. With `restart: on-failure` it stays
stopped. The controller removes only that stopped container after a clean exit.
New work arriving after the queue snapshot is either completed by the selected
worker or requeued. A slow drain has no forced timeout. The controller records
the selected container locally before signaling it. On restart in apply mode,
with the same checkout, Compose project and service selection, it resumes the
recorded drain. If the worker is still running it signals the same worker again.
If the worker has exited successfully it removes that worker. An unsuccessful
exit is reported for manual inspection. Ctrl+C does not restore replicas to one.

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
- After the first scale-up, submit a separate project around the `drain` event and
  keep its request identifiers. Match the final results for those identifiers to
  the submission and verify that each expected output appears once.
- In a separate run, stop the controller after `drain` and before `drained`.
  Restart it with the same project, service and apply options. Check the CSV for
  `drained`, verify that the recorded container was removed and the other replica
  remains, and check that every submitted request produced its expected output once.
- Verify eventual 2→1, cooldown, minimum/maximum, RabbitMQ outage and Docker outage.
- Compare per-job waiting/processing/end-to-end time, total batch time, throughput,
  CPU, peak memory and replica-seconds. CSV queue snapshots do NOT provide exact job
  waiting times. Collect per-job timestamps separately from submission and worker events.
- Agree quantitative target and minimum with the team before final evaluation. Do not
  claim a speedup until measured; two CPU-heavy workers can contend and slow down.

## AI assistance

Controller, isolated tests, drain extension and this guide were prepared with ChatGPT/
Codex assistance. Team review and real Docker integration measurements are still required.
No functional feature is added; the existing workers and stage routing are preserved.
