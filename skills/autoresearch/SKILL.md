---
name: AutoResearch
description: This slash command skill starts autonomous multi-agent machine learning research. Use when you want to run automatic ML experimentation on a local dataset, including paper research, code generation, and iterative model training. Triggers: /autoresearch, autoresearch, autonomous ML research, automatic machine learning experiment.
skill_type: slash_command
parameters:
  - name: task
    description: Description of the machine learning task
    required: true
  - name: dataset_path
    description: Local filesystem path to the dataset
    required: true
  - name: max_iterations
    description: Maximum number of research+training iterations
    type: number
    default: 3
  - name: experiment_name
    description: Optional name for this experiment
    required: false
---

# AutoResearch - Autonomous Machine Learning Research

AutoResearch enables fully autonomous machine learning experimentation:

1. **Research**: Analyzes your task and dataset, searches for recent research papers and best architectures
2. **Code Generation**: Writes complete training code based on current research findings
3. **Training**: Runs the training process and monitors performance
4. **Evaluation**: Evaluates results and identifies areas for improvement
5. **Iteration**: Repeats the process to incrementally improve models

Starting AutoResearch with the following parameters:

- **Task**: {{task}}
- **Dataset Path**: {{dataset_path}}
- **Max Iterations**: {{max_iterations}}
{{#if experiment_name}}
- **Experiment Name**: {{experiment_name}}
{{/if}}

Call the `start_autoresearch` MCP tool from the autoresearch MCP server with these parameters to begin the autonomous research process.
