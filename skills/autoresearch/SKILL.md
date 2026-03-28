---
name: AutoResearch
description: This skill runs autonomous multi-agent machine learning research and provides utility commands to check status, stop training, and list experiments. Triggers: /autoresearch, /autoresearch-status, /autoresearch-stop, /autoresearch-list, autoresearch, autonomous ML research, automatic machine learning experiment.
skill_type: slash_command
parameters:
  - name: task
    description: Description of the machine learning task (required for starting new experiment)
    required: false
  - name: dataset_path
    description: Local filesystem path to the dataset (required for starting new experiment)
    required: false
  - name: action
    description: Action to perform: start (start new experiment), status (get current training status), stop (stop current training), list (list all experiments)
    type: string
    enum: ["start", "status", "stop", "list"]
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
  - name: experiment_id
    description: Experiment ID for get-summary action
    required: false
---

# AutoResearch - Autonomous Machine Learning Research

AutoResearch enables fully autonomous machine learning experimentation:

1. **Research**: Analyzes your task and dataset, searches for recent research papers and best architectures
2. **Code Generation**: Writes complete training code based on current research findings
3. **Training**: Runs the training process and monitors performance
4. **Evaluation**: Evaluates results and identifies areas for improvement
5. **Iteration**: Repeats the process to incrementally improve models

## Available Commands

- `/autoresearch task="..." dataset_path="..."` - Start a new autonomous experiment
- `/autoresearch-status` - Get status of current running training
- `/autoresearch-stop` - Stop current running training
- `/autoresearch-list` - List all previous experiments

Starting AutoResearch with the following parameters:

{{#if action '==' 'start'}}
- **Task**: {{task}}
- **Dataset Path**: {{dataset_path}}
- **Max Iterations**: {{max_iterations}}
{{#if experiment_name}}
- **Experiment Name**: {{experiment_name}}
{{/if}}
{{/if}}

{{#if action '==' 'status'}}
- **Action**: Get current training status
{{/if}}

{{#if action '==' 'stop'}}
- **Action**: Stop current training
{{/if}}

{{#if action '==' 'list'}}
- **Action**: List all experiments
{{/if}}

This skill directly executes the autonomous multi-agent machine learning research workflow. When invoked, it:

1. Runs the Understanding agent to explore the dataset and analyze existing code
2. Iteratively researches (finds recent papers, reference code), evaluates, and refines the plan
3. Generates complete PyTorch training code
4. Launches training and monitors progress
5. Records results and suggests improvements for the next iteration

All experiments are stored in the `./experiments/` directory.
