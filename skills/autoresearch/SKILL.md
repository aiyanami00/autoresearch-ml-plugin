---
name: AutoResearch
description: This skill should be used when the user asks to "run autoresearch", "start ML experiment", "automatic machine learning", "train model automatically", "autoresearch status", "stop autoresearch", "list experiments", or mentions autonomous ML research, automatic training, or multi-agent machine learning experimentation.
skill_type: slash_command
parameters:
  - name: task
    description: Description of the machine learning task (required for starting new experiment)
    required: false
  - name: dataset_path
    description: Local filesystem path to the dataset (required for starting new experiment)
    required: false
  - name: action
    description: Action to perform - start (start new experiment), status (get current training status), stop (stop current training), list (list all experiments), summary (summarize all completed experiments)
    type: string
    enum: ["start", "status", "stop", "list", "summary"]
    default: "start"
    required: false
  - name: max_iterations
    description: Maximum number of research+training iterations
    type: number
    default: 3
    required: false
  - name: experiment_name
    description: Optional name for this experiment
    required: false
---

# AutoResearch - Autonomous Machine Learning Research

Enable fully autonomous machine learning experimentation through multi-agent collaboration.

## Overview

This skill orchestrates a workflow that:

1. **Analyze**: Parse task requirements, explore dataset structure, detect hardware capabilities
2. **Research**: Search recent papers and discover best architectures
3. **Generate**: Write complete PyTorch training code
4. **Train**: Run and monitor the training process
5. **Iterate**: Evaluate results and improve incrementally

## Agent Architecture

Six specialized agents collaborate in sequence:

- **understanding**: Explore data, analyze existing code, write experiment specification
- **researcher**: Search literature, find reference implementations, propose methods
- **evaluator**: Review plans and code for completeness and feasibility
- **coder**: Generate training code following extracted patterns
- **trainer**: Launch and monitor long-running training
- **recorder**: Analyze results and suggest improvements

## Workflow

```
understanding → evaluator (loop until approved)
     ↓
For each iteration:
  researcher → evaluator (loop until approved)
       ↓
  coder → evaluator (loop until approved)
       ↓
  trainer (monitor until completion)
       ↓
  recorder (analyze and suggest improvements)
```

## Usage

### Start New Experiment

```
/autoresearch task="Train an image classifier" dataset_path="./data/images" max_iterations=3
```

### Check Training Status

```
/autoresearch-status
```

### Stop Running Training

```
/autoresearch-stop
```

### List All Experiments

```
/autoresearch-list
```

## Experiment Storage

All experiments stored in `./experiments/`:

```
experiments/
├── specification.md          # Shared experiment specification
├── experiment01/
│   ├── plan/plan.md         # Research plan
│   ├── src/train.py         # Training code
│   ├── src/model.py         # Model definition
│   ├── log/training.log     # Training logs
│   ├── output/              # Results and checkpoints
│   └── summary.md           # Analysis and suggestions
├── experiment02/
└── ...
```

## Key Features

- **Automatic GPU detection**: Detect hardware constraints before model design
- **Search-first research**: Require literature search before proposing solutions
- **Double evaluation**: Review both plans and code before training
- **Long-running support**: Training runs in background, supports hours/days
- **Extracted patterns**: Learn coding style from existing code, match conventions
- **Iterative improvement**: Each round builds on previous results

## When Invoked

Execute the autonomous workflow directly:

1. Run understanding agent to analyze task and data
2. Loop through research → evaluation → coding → evaluation
3. Launch training and monitor progress
4. Record results and generate improvement suggestions
5. Repeat for specified iterations

Return final summary with best results across all iterations.
