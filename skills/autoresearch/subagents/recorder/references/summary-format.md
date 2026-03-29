# Experiment Summary Format

The experiment summary written by recorder (before evaluator improvement) should follow this structure:

```markdown
# Experiment Summary: experimentXX

## Experiment Information
- **Task**: from specification
- **Model/Method**: what architecture/training approach was used
- **Best Metric**: value (optimization direction)

## Results Overview
- Final training loss:
- Final validation loss:
- Best epoch:
- Training duration:

## What Worked Well
<analysis of what contributed to good results>

## What Didn't Work Well
<analysis of what contributed to poor results>

## Methodological Observations
<preliminary analysis of why results turned out this way from methodological perspective>

## Suggestions for Next Iteration
- [ ] Concrete suggestion 1 (specific actionable change)
- [ ] Concrete suggestion 2 (specific actionable change)
- [ ] Concrete suggestion 3 (specific actionable change)
```

## Requirements

- Be concise but complete
- Focus on factual results first
- Provide at least 2-4 concrete actionable suggestions for next iteration
- "Increase learning rate from 1e-5 to 1e-4" is good
- "Try different architecture" without specifics is not good - be specific
- After this initial summary, evaluator will provide deeper analysis
