# Experiment Specification Output Format

The formal specification written by the understanding agent must follow this markdown structure:

```markdown
# Experiment Specification

## Task Description
<clear statement of what needs to be done>

## Dataset Path
<dataset path provided by user>

## Dataset Structure
<description of train/val/test splits, file types, sizes discovered from automatic exploration>

## Input Format
<discovered shape, type, expected ranges for input>

## Output Format
<discovered shape, type, expected ranges for output>

## Hardware Information
Detected GPU model: <model name>
Available memory: <X> GB
This information is critical for designing models that fit in memory.

## Training Objective & Evaluation
- **Metric to optimize**: <specific metric - classification accuracy, validation loss, F1 score, MSE, AUC, etc.>
- **Optimization direction**: <maximize or minimize>
- **Evaluation procedure**: <how metric is computed, when it's computed, what split is used>

## Directory Structure
Confirmed standard structure:
- `src/` - training code
- `plan/` - planning documents (this file)
- `log/` - training logs
- `output/` - results, metrics, checkpoints
- `references/` - cloned reference code

## Coding Requirements
- Framework: PyTorch (specified by AutoResearch)
- Extracted coding conventions from existing code: <if existing code analyzed>
- Memory constraints: <based on GPU detection>
- **MANDATORY**: Training must print progress in format `[Epoch X/Y] Loss: value` for monitoring

## Research Direction
<if user specified preference, write it here verbatim - researcher must follow this exactly>
<overall guidance>

## Extracted Patterns
<if existing code analyzed, include extracted data processing and evaluation patterns>

## Clarifications
<list any questions answered by user>
```

## Notes

- All sections must be present
- Use markdown formatting for readability
- Be explicit and complete - all subsequent agents follow this specification exactly
- If any section is not applicable, note that clearly
