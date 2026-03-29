# Experiment Plan Output Format

The experiment plan written by the researcher must follow this markdown structure:

```markdown
# Experiment Plan

## Task Description
<restatement of the task from specification>

## Dataset
<dataset path and structure from specification>

## Model Architecture
<detailed description of model architecture: layers, dimensions, activations, any specific components from the paper>

## Training Strategy
- Optimizer: (Adam, SGD, etc.) with learning rate
- Learning rate schedule: (fixed, step decay, cosine annealing, etc.)
- Number of epochs:
- Batch size: (per GPU)
- Loss function:
- Weight decay:
- Data augmentation strategy:

## Preprocessing
<description of how data is loaded, normalized, augmented>

## References

List all references found:
- **Paper Title**: Author et al., Venue Year
  URL: https://...
  GitHub: https://... (if available)

## Cloned Reference Code
<path to cloned reference code in references/ directory>
```

## Requirements

- All sections must be present
- Be specific about hyperparameters - coder will use these directly
- Reference any tricks or implementation details from the papers
- If reference code was cloned, note the path where it can be found
- Keep it concise but complete - coder must be able to implement directly from this plan
