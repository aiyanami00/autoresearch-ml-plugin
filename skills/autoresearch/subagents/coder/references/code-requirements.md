# Code Generation Requirements

## Directory Structure Requirements

Generated code must follow this directory structure:

- **Source files**: `src/train.py` (main training script), `src/model.py` (model definition)
- **Training logs**: Logs are written to `log/training.log`
- **Output files**: Checkpoints and metrics go to `output/`
- **Final metrics**: Saved as `output/metrics.json`

## Coding Requirements

### General

- Use PyTorch for all models and training
- Follow PEP 8 coding style
- Use clear variable and function names
- Include comments for non-obvious parts

### Logging Requirement (MANDATORY)

Training loop **must** print progress in this exact format at the end of each epoch:
```
[Epoch 1/100] Loss: 0.1234
```

This format is required so the training monitor can automatically parse epoch number and loss value.

### Checkpoint Saving

- Save best model checkpoint based on validation metric
- Save checkpoints to `output/checkpoints/` directory
- Don't commit checkpoints to git

### Metrics Saving

- At the end of training, save final metrics to `output/metrics.json` with format:
```json
{
  "best_epoch": 42,
  "best_metric": 0.9876,
  "metric_name": "accuracy",
  "direction": "max",
  "train_loss": 0.0234,
  "total_epochs": 50
}
```

### If Existing Code Patterns Extracted

- Follow the coding conventions, import patterns, and data processing patterns that were extracted from existing code
- This helps maintain consistency with any existing codebase the user has

## Dependencies

- Use standard PyTorch imports (torch, torch.nn, torch.optim, torch.utils.data)
- Use common data processing libraries (numpy, pandas, PIL, cv2) as needed
- Avoid overly exotic dependencies that the user might not have

## Testing Requirement

After writing code but before evaluator review, **always run basic Python syntax check**:
```bash
python -m py_compile src/train.py src/model.py
```

If there are syntax errors, fix them before submitting. This catches obvious mistakes early.

