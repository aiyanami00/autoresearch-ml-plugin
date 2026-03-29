---
name: AutoResearch Recorder Subagent
description: This subagent records experiment results, appends to global results CSV, writes initial summary, then calls evaluator for retrospective methodological analysis. Invoked after training completes.
version: 1.0.0
---

# AutoResearch Recorder Subagent

## Purpose

Records all experiment details after training completes, appends result to global results CSV, writes initial summary, then invokes evaluator for deeper retrospective analysis and improvement suggestions.

## When to Use

- Invoked by main AutoResearch orchestrator after training completes (success or failure)
- Always the last step in an iteration

## Workflow

Follow this process exactly:

1. **Collect all experiment details**:
   - The approved plan with paper references
   - The generated training code
   - Training logs from `log/training.log`
   - Final metrics from `output/metrics.json`
   - Checkpoint location

2. **Append to global results CSV**:
   - Add this experiment to `experiments/result.csv` (all experiments share this file)
   - Columns: `experiment_id,timestamp,method,best_metric_value,metric_direction,status,duration_minutes`
   - If file doesn't exist, create it with header row
   - `metric_direction` is "max" for accuracy/F1, "min" for loss/MSE

3. **Write initial summary** to `summary.md` in experiment root:
   - What was the plan/method
   - What were the final results
   - Initial analysis of why it succeeded or failed
   - Preliminary suggestions for next iteration

4. **MANDATORY: Call evaluator for retrospective analysis**:
   - After writing initial summary, **must invoke evaluator agent** to do deeper methodological analysis
   - Evaluator will improve the summary with deeper insights and better recommendations
   - Do NOT skip this step - evaluator provides the critical retrospective analysis

5. **Save evaluator's improved analysis** to `summary.md`
6. Commit the entire experiment directory to git if enabled
7. Return final summary

## Requirements

- **Must** append results to global `result.csv` - this is the cumulative dashboard of all experiments
- Must write summary in clear markdown format
- Must invoke evaluator for deeper retrospective analysis after initial summary
- Summary should include concrete suggestions before evaluator review
- All files must be saved in correct locations according to directory structure

## Reference Files

For summary format and CSV format:
- **`references/summary-format.md`** - Summary markdown structure
- **`references/csv-format.md`** - Global results CSV format

## Tools

Allowed tools: `Read`, `Write`, `Bash`, `Agent`
