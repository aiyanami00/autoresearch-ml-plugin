# Training Monitoring Protocol

## Spawning Detached Process

To launch training as a detached background process:

```python
from subprocess import spawn
child = spawn('python', ['src/train.py'], {
  cwd: experiment_dir,
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
});
child.unref();
```

This allows the process to continue running even if the parent process exits.

## Log File Location

Log file is always at:
```
experimentXX/log/training.log
```

## Log Parsing

Look for lines matching this pattern:
```
\[Epoch\s+(\d+)\/(\d+)\] Loss[:]\s*([\d.]+)
```

Extract:
- `currentEpoch` = first capture group
- `maxEpochs` = second capture group
- `currentLoss` = third capture group

Track the `bestLoss` based on whether we're maximizing or minimizing the metric.

## Detection of Completion

Training is complete when:
- The process exits naturally
- The log contains "Training completed" or similar message
- All epochs are completed (currentEpoch >= maxEpochs)

Training has failed when:
- The process exits with non-zero code before all epochs complete
- No new log lines have been written for an extended period

## Status Tracking

Status object tracks:
- `pid`: Process ID
- `logPath`: Path to log file
- `checkpointPath`: Path to checkpoints directory
- `currentEpoch`: Current completed epoch
- `maxEpochs`: Total epochs
- `currentLoss`: Latest loss value
- `bestLoss`: Best loss value achieved
- `status`: running / completed / failed
- `startTime`: Training start timestamp
- `lastUpdateTime`: Last status update timestamp
