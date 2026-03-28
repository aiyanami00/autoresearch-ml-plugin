# AutoResearch MCP Plugin for Claude Code

Autonomous multi-agent machine learning research plugin that automatically explores your data, analyzes your existing code, and runs full research iterations to get the best result.

## Features

- 🔍 **Automatic Data Exploration**: Automatically explores your dataset directory, discovers structure, infers input/output formats, identifies train/val/test splits
- 📋 **Existing Code Analysis**: If you have existing code, extracts your coding style, data processing patterns, and evaluation approaches (ignores training methods/models that will be re-researched)
- 📚 **Automatic Literature Research**: Finds recent top-conference papers (NeurIPS, ICML, ICLR, CVPR, Nature)
- 🐙 **GitHub Discovery**: Clones and inspects official implementations
- 🔄 **Researcher-Evaluator Loop**: Iteratively refines the plan until it's approved
- 💻 **Code Generation**: Writes complete PyTorch training code following *your* coding conventions
- ⏱️ **Long-Running Monitoring**: Monitors training for hours/days, detects completion automatically
- 📝 **Experiment Tracking**: Persistent logging of all experiments with git auto-commit
- 🎯 **Iterative Improvement**: Automatically improves based on previous results

## Installation

```bash
npm install
npm run build
```

## Usage as MCP Server

Add this to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "autoresearch": {
      "command": "node",
      "args": ["/path/to/plugin/build/index.js"]
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `start_autoresearch` | Start a new autonomous research experiment |
| `get_training_status` | Get current training status |
| `stop_training` | Stop current training |
| `list_experiments` | List all previous experiments |
| `get_experiment_summary` | Get summary for specific experiment |

## Usage as Claude Code Skill

```
/autoresearch task="Train a CNN for image classification" dataset_path="./data/my-dataset" max_iterations=3
```

## Detailed Workflow

### Step 1: Task Input
You provide:
- Task description (what you want to achieve)
- Dataset path (on local filesystem)
- Maximum number of research+training iterations (default: 3)

### Step 2: Automatic Understanding & Data Exploration (Understanding Agent)

This is the enhanced step added by the new feature:

1. **Automatic Data Exploration**
   - Uses Glob to recursively scan your dataset directory
   - Discovers directory structure (are there train/val/test folders?)
   - Counts number of files per split
   - Inspects sample files to determine format (images, CSV, numpy arrays, text, etc.)
   - Infers input shape, output dimensions, and data types
   - Documents everything discovered automatically

2. **Existing Code Analysis** (if you have existing code in the repository)
   - Finds all Python files in your working directory
   - Reads and analyzes code to extract:
     - **Coding style**: naming conventions, import patterns, code organization
     - **Data processing**: how you load data, preprocess, augment
     - **Evaluation**: how you compute metrics, do validation
   - **Purposefully ignores**: specific model architectures and training methods (we'll research those from scratch)
   - Saves the extracted patterns so subsequent agents follow your conventions

3. **Clarification**
   - Only asks you questions about things it *cannot* discover automatically
   - For example: what objective to optimize, any specific GPU constraints, your preference for accuracy vs speed

4. **Output**: Formal `specification.md` with complete experiment specification

### Step 3: Research-Evaluation Loop

For each iteration:

1. **Researcher Agent**
   - Takes the formal specification (with discovered data structure and extracted patterns)
   - Searches recent papers (last 3-5 years) from top conferences
   - Finds official GitHub repositories when available
   - Clones the repository and inspects the reference code
   - Proposes a complete plan: model architecture, training strategy, preprocessing

2. **Evaluator Agent**
   - Critically reviews the plan for completeness and feasibility
   - Checks for: model size appropriateness, data leakage, computational requirements
   - **Rejects** if incomplete or has issues → Researcher revises with feedback
   - **Approves** only when plan is complete and feasible
   - Loops until approval

### Step 4: Code Generation (Coder Agent)

- Writes complete PyTorch training code based on the approved plan
- Follows **your coding conventions** and data processing patterns extracted from your existing code
- Generates:
  - `train.py` - main training loop with logging, checkpoint saving
  - `model.py` - model definition
- Outputs everything to experiment directory

### Step 5: Training & Monitoring (Trainer Agent)

- Launches training as detached background process (supports hours/days of training)
- Periodically polls the training log to monitor progress
- Parses epoch/loss information automatically
- Detects when training completes or fails
- Supports manual stopping via `stop_training` tool

### Step 6: Result Recording & Analysis (Recorder Agent)

- Saves all experiment details: plan, code, logs, metrics
- Writes analysis summary: what worked, what didn't, why
- Provides 2-4 concrete, actionable suggestions for improvement in next iteration
- Commits everything to git

### Step 7: Iterate & Improve

- Repeats Steps 3-6 for the requested number of iterations
- Each iteration incorporates feedback/suggestions from previous results
- After all iterations complete, outputs final summary with the best result

### Full Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Input: Task Description + Dataset Path + Max Iterations    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Understanding Agent                                │
│  • Automatic data exploration (Glob + file inspection)      │
│  • Existing code analysis → extract coding patterns         │
│  • Clarify what's unclear with AskUserQuestion              │
│  • Output: specification.md                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│  For Each Iteration (1 ... MaxIterations):                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Researcher: Find papers + GitHub + make plan       │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Evaluator: Review plan for completeness/feasibility │   │
│  └───────────┬───────────────────────────┬─────────────┘   │
│              │                           │                 │
│         REJECTED                     APPROVED              │
│              │                           │                 │
│              └───────────┐               ┘                 │
│                      FEEDBACK                             │
│              ┌───────────┘                               │
│              │                                           │
│              └────────→ [Repeat Research]                │
│                                                           │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Coder: Write PyTorch code following your patterns  │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Trainer: Launch & monitor long-running training    │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Recorder: Analyze results → suggest improvements   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Final Summary: List all iterations, point to best result   │
└─────────────────────────────────────────────────────────────┘
```

## Experiment Structure

Each experiment is stored in `experiments/`:

```
experiments/
├── experiment_log.jsonl               # Global experiment index
└── 1-20240328-123456-task-name/
    ├── specification.md               # Formal specification (NEW: with discovered data + extracted patterns)
    ├── plan.md                         # Approved plan with paper references
    ├── config.json                     # Full experiment configuration
    ├── code/
    │   ├── train.py
    │   └── model.py
    ├── references/                     # Cloned official reference code
    ├── logs/
    │   └── training.log
    ├── results/
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── checkpoints/                    # git-ignored
    └── summary.md                      # Final analysis and suggestions
```

## What Gets Extracted from Existing Code

When you provide existing code, AutoResearch extracts:

| What | Purpose |
|------|---------|
| **Coding style & conventions** | Generated code matches your naming, organization, import patterns |
| **Data processing pipeline** | How you load data, what preprocessing steps you use, how you augment |
| **Evaluation methodology** | How you split data, what metrics you compute, how you validate |

What is **not** extracted and will be re-researched:
- Model architecture specifications
- Specific training methods, optimizers, hyperparameters

This is what you asked: *"根据代码提取公共部分，编写实验规则。比如说根据代码知道我代码风格 数据处理 还有评估怎么评估，然后忽略掉现有代码使用的训练方法和模型"*

## Example Usage

If you have:
- Dataset in `./data/` with `train/`, `val/`, `test/` folders of images
- Existing code in `./src/` that shows how you preprocess and evaluate
- Want to try new models to improve accuracy

You just run:
```
/autoresearch task="Image classification on my dataset" dataset_path="./data" max_iterations=3
```

AutoResearch will:
1. Auto-discover the `train/val/test` structure and image format
2. Read your existing code, learn your data processing conventions
3. Search for recent best paper architectures on arXiv/top conferences
4. Generate new code that follows your conventions
5. Train, evaluate, and suggest improvements

## Requirements

- Node.js 18+
- Python 3.8+ with PyTorch (for generated training code)
- Git (for cloning paper repositories and auto-commit)

## License

MIT
