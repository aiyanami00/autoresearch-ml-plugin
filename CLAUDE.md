# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **AutoResearch** - an autonomous multi-agent machine learning research plugin for Claude Code. The plugin enables fully autonomous end-to-end machine learning research: given a task description and dataset, it automatically explores data, analyzes existing code, searches literature, writes code, trains models, and iteratively improves results.

## Common Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (output to build/)
npm run build

# Development mode (run with ts-node without building)
npm run dev

# Run the initialization script to create experiments directory structure
npm run init
# Or via npx after installation:
npx autoresearch init
```

## Code Architecture

### High-Level Structure

```
src/
├── index.ts                 # Main entry point - exports all public APIs
├── AutoResearchSkill.ts     # Main orchestrator - uses MultiAgentSkill framework
├── MultiAgentSkill.ts       # Generic multi-agent framework (based on reference implementation)
├── agents/                  # Individual specialized subagent configurations
│   ├── index.ts             # Exports all agents as array for MultiAgentSkill
│   ├── understanding.ts     # Understanding agent: data exploration + existing code analysis + hardware detection
│   ├── researcher.ts        # Researcher agent: literature search + GitHub code discovery (must search first, brainstorm multiple directions)
│   ├── evaluator.ts         # **Unified Evaluator**: reviews both research plans AND generated code for completeness/feasibility
│   ├── coder.ts             # Coder agent: generates PyTorch training code following extracted patterns
│   ├── trainer.ts           # Trainer agent: launches and monitors long-running training
│   └── recorder.ts          # Recorder agent: analyzes results and suggests improvements
├── types/
│   └── index.ts             # TypeScript type definitions for all core data structures
├── utils/
│   ├── experimentTracker.ts # Tracks experiments, maintains experiment log, creates directories
│   ├── trainingMonitor.ts   # Monitors background training process, parses logs, detects completion/failure
│   └── gitHelper.ts         # Git operations for auto-committing experiments
├── scripts/
│   └── init-experiments.ts  # CLI initialization script to create experiments directory
├── commands/
│   └── autoresearch.md      # Slash command definition for /autoresearch
└── skills/autoresearch/
    └── SKILL.md             # Skill definition for direct skill invocation
```

### Multi-Agent Architecture

This plugin uses the `MultiAgentSkill` framework where:
- **Main orchestrator**: `AutoResearchSkill` creates `MultiAgentSkill` with the full workflow prompt and the list of specialized subagents
- **Specialized subagents**: Each agent has a single responsibility, its own prompt and allowed tools
- **Framework handles scheduling**: The main agent follows the workflow prompt and calls subagents as needed
- **Fixed strict order**: Process must follow this sequence:

```
1. understanding
   ↓
   (get user confirmation)
   ↓
2. For each iteration:
   ↓
   researcher → evaluator (loop until approved)
   ↓
   coder → evaluator (loop until approved) ✨ code review by unified evaluator
   ↓
   trainer (train and monitor until completion/failure)
   ↓
   recorder (analyze results, suggest improvements)
   ↓
3. Final summary
```

### Fixed Workflow Steps Explained

| Step | Agent | Purpose |
|------|-------|---------|
| **understanding** | understanding | 1. Automatic data exploration with Glob recursion; 2. Analyze existing code to extract coding style/data processing patterns; 3. **Auto-detect GPU model and memory** with `nvidia-smi`; 4. Clarify training objective (what metric to optimize); 5. Write `specification.md`; 6. **Get user review/confirmation** before proceeding |
| **research** | researcher | 1. **MUST search web first** for recent top-conference papers; 2. **Brainstorm multiple directions**, encourage innovative approaches; 3. Find official GitHub repository; 4. Clone and inspect reference code; 5. Propose complete plan |
| **evaluate (plan)** | evaluator | **Unified evaluator** reviews both plans and code. For plans: 1. Critically review plan for completeness/feasibility; 2. Check model size against available GPU memory; 3. Reject incomplete plans with specific feedback; 4. Only approve when plan is ready |
| **code** | coder | Write complete PyTorch training code (`train.py` + `model.py`) following specification and extracted patterns |
| **evaluate (code)** | evaluator | Same unified evaluator reviews code: 1. Check code completeness; 2. Verify matches approved plan; 3. Check coding requirements and logging format; 4. Reject if issues found for coder to fix |
| **train** | trainer | Launch training as detached background process; periodically poll log to monitor progress; detect completion/failure |
| **record** | recorder | Save all details; write analysis summary; provide concrete improvement suggestions for next iteration; auto-commit to git |

### Experiment Storage Structure

Experiments are stored in the **user's current working directory** (where `/autoresearch` is invoked) under `./experiments/`:

```
experiments/
├── experiment_log.jsonl               # Global experiment index
├── result.csv                         # Global results summary
├── specification.md                   # Overall experiment specification (data, GPU, objective) ← shared by all iterations
└── experiment01/                      # Iteration 1 (sequential numbering: 01, 02, 03...)
    ├── config.json                     # Full experiment configuration
    ├── plan/
    │   └── plan.md                     # Approved plan for this iteration
    ├── src/                            # Training code
    │   ├── train.py
    │   └── model.py
    ├── log/                            # Training logs
    │   └── training.log
    ├── output/                         # Output results, metrics, checkpoints
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── references/                     # Cloned reference code from GitHub
    ├── checkpoints/                    # git-ignored
    └── summary.md                      # Final analysis and suggestions for this iteration
```

**Structure notes**:
- `specification.md` contains overall experiment information (data description, GPU info, training objective) that doesn't change between iterations - so it's stored once in the root directory
- Each iteration gets its own `experimentXX` directory with sequential numbering (`experiment01`, `experiment02`, ...)
- Each iteration stores its own plan, code, logs, and results independently

### Key Dependencies

- `@anthropic-ai/claude-agent-sdk` - Claude Agent SDK for multi-agent orchestration
- `@anthropic-ai/sdk` - Anthropic API client
- `simple-git` - Git operations for auto-committing experiments
- `date-fns` - Date formatting

### Plugin Configuration

- `.claude-plugin/plugin.json` - Plugin manifest (no MCP configured, direct skill-based)
- `commands/autoresearch.md` - Slash command definition
- `skills/autoresearch/SKILL.md` - Skill definition

## Usage in Claude Code

After installing the plugin, start an experiment with:

```
/autoresearch task="your machine learning task" dataset_path="./path/to/dataset" [max_iterations=3]
```

Example:

```
/autoresearch task="Train an image classification model" dataset_path="./data/my-images" max_iterations=3
```

## Key Features

- **Automatic GPU detection**: Understanding agent runs `nvidia-smi` to get GPU model and memory, which informs model design
- **Mandatory search-first**: Researcher must search web for recent papers before proposing solution, encourages brainstorming multiple approaches
- **Double review**: Plan review by evaluator + code review by evaluator before training, catches issues early
- **Long-running training support**: Training runs in detached background process, supports hours/days of training
- **User confirmation**: Understanding agent gets user review/modification approval before research starts
- **Extract coding conventions**: Learns your coding style/data processing from existing code, generates new code that matches
- **Iterative improvement**: Each iteration incorporates feedback from previous results

## Entry Flow

1. User runs `/autoresearch` with parameters
2. Claude Code directly invokes the autoresearch skill
3. `AutoResearchSkill` creates `MultiAgentSkill` with workflow prompt and subagents array
4. `MultiAgentSkill` runs via Claude Agent SDK, main agent follows the fixed workflow calling subagents
5. Final summary returned to conversation
</think_never_used_51bce0c785ca2f68081bfa7d91973934>