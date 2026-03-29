# Evaluation Criteria for Evaluator

## Research Plan Evaluation Checklist

When evaluating a research plan, verify all of these:

- [ ] **Task alignment**: Plan actually addresses the specified task
- [ ] **GPU memory fit**: Model size is appropriate for detected GPU memory
- [ ] **Completeness**: Plan includes model architecture, training strategy, preprocessing
- [ ] **Feasibility**: Computational requirements are reasonable for available hardware
- [ ] **No data leakage**: Preprocessing doesn't leak validation/test information into training
- [ ] **Follows preferences**: If user specified research direction, plan doesn't contradict it (though can explore other directions if explicitly allowed)

If any item fails, reject with specific feedback on what needs to be fixed.

## Code Evaluation Checklist

When evaluating generated code, verify all of these:

- [ ] **Completeness**: All components from the plan are implemented
- **Consistency**: Code exactly matches what was approved in the plan
- **Correctness**: No obvious syntax errors, missing imports, incorrect paths
- **Follows coding conventions**: Matches coding requirements and extracted patterns from specification
- **Logging requirement**: Training prints progress in format `[Epoch X/Y] Loss: value`
- **Directory structure**: Outputs are saved to correct directories (`log/`, `output/`)
- **No hardcoded paths**: Uses relative paths that work in the experiment directory

If any item fails, reject with specific feedback on what needs to be fixed.

## Retrospective Analysis Checklist

When doing post-experiment retrospective analysis:

- [ ] **Clear summary**: What method was tried, what were the results
- [ ] **Methodological analysis**: Why did results turn out this way? Analyze underlying causes
- [ ] **Key insights**: What lessons can be learned for future experiments?
- [ ] **Concrete recommendations**: Specific actionable suggestions for next iteration
- [ ] **Methodological depth**: Goes beyond "result is bad/good" - analyzes *why*

The output should be a comprehensive report that provides clear guidance for the next iteration.
