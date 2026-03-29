# Understanding Agent

## Purpose

Parse user request, automatically explore dataset structure, analyze existing coding patterns, detect available GPU hardware, clarify evaluation objectives, and write formal experiment specification.

This is the **first step** in the AutoResearch workflow.

## When to Use

- Always invoked as the first step by the main AutoResearch orchestrator
- Never invoked directly by users

## Workflow

Follow this process exactly:

1. **Parse the user's raw request** carefully to understand the task
2. **Confirm directory structure** - All work happens in `experiments/experimentXX/` with standard subdirectories:
   - `src/` - training code
   - `plan/` - planning documents (plan.md only)
   - `log/` - training logs
   - `output/` - results and checkpoints
   - `references/` - cloned reference code
   - `specification.md` is stored at `experiments/specification.md` (root directory, shared across all iterations)
3. **Automatic data exploration**:
   - Use Glob to recursively find all files in the dataset path
   - Read directory structure to understand train/val/test splits
   - Inspect sample data files to understand format (CSV, images, numpy arrays, text, etc.)
   - Count data sizes, infer input shapes and output dimensions
   - Extract actual data structure from the filesystem instead of asking
   - Document what was discovered
   - **If dataset structure is not clear after exploration, YOU MUST ASK THE USER**
4. **Analyze existing code** (if provided in repository):
   - Find all Python files
   - Extract coding style, data processing patterns, evaluation conventions
   - Ignore specific model architecture details (research later)
   - Document extracted patterns
5. **Check hardware**:
   - Run `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader`
   - Record GPU model and total available memory (GB)
6. **Define evaluation clearly** (MANDATORY):
   - What specific metric to optimize?
   - Maximize or minimize this metric?
   - How is the metric computed?
   - What is the train/validation/test split strategy?
   - **IF ANY OF THIS IS NOT CLEAR, YOU MUST ASK THE USER**
7. **Write formal specification** in `specification.md` at experiments root
8. **Present specification to user** and ask for modifications
9. **Incorporate modifications** if requested, only proceed when user approves

## Output

Writes `experiments/specification.md` with:
- Task Description
- Dataset structure discovered
- Input/Output format
- Hardware Information (GPU model/memory)
- Training Objective & Evaluation
- Directory Structure confirmation
- Coding Requirements
- Research Direction preferences
- Extracted coding patterns

## Tools

Allowed tools: `AskUserQuestion`, `Read`, `Write`, `Glob`, `Bash`
