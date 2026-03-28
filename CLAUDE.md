# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **AutoResearch** - an autonomous multi-agent machine learning research MCP plugin for Claude Code. The plugin enables fully autonomous end-to-end machine learning research: given a task description and dataset, it automatically explores data, analyzes existing code, searches literature, writes code, trains models, and iteratively improves results.

## Common Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (output to build/)
npm run build

# Development mode (run with ts-node without building)
npm run dev

# Run the MCP server in production mode
npm start

# Clean build directory
rm -rf build
```

## Code Architecture

### High-Level Structure

```
src/
├── index.ts                 # MCP server entry point - defines 5 MCP tools
├── AutoResearchSkill.ts     # Main orchestrator - coordinates multi-agent workflow
├── agents/                  # Individual specialized agent prompts
│   ├── index.ts             # Exports all agent configurations
│   ├── understanding.ts     # Understanding agent: data exploration + existing code analysis
│   ├── researcher.ts        # Researcher agent: literature search + GitHub code discovery
│   ├── evaluator.ts         # Evaluator agent: reviews research plan for completeness/feasibility
│   ├── coder.ts             # Coder agent: generates PyTorch training code following extracted patterns
│   ├── trainer.ts           # Trainer agent: launches and monitors long-running training
│   └── recorder.ts          # Recorder agent: analyzes results and suggests improvements
├── types/
│   └── index.ts             # TypeScript type definitions for all core data structures
└── utils/
    ├── experimentTracker.ts # Tracks experiments, maintains experiment log, creates directories
    ├── trainingMonitor.ts   # Monitors background training process, parses logs, detects completion/failure
    └── gitHelper.ts         # Git operations for auto-committing experiments
```

### MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `start_autoresearch` | Start a new autonomous research experiment. Parameters: `task` (required) - task description, `dataset_path` (required) - path to dataset, `max_iterations` (optional) - maximum research+training iterations, `experiment_name` (optional) - custom experiment name, `check_interval_seconds` (optional) - polling interval for training progress (default: 300) |
| `get_training_status` | Get status of current training |
| `stop_training` | Stop current running training |
| `list_experiments` | List all previous experiments |
| `get_experiment_summary` | Get summary for specific experiment |

### Multi-Agent Workflow

1. **Understanding Agent** (`understanding.ts`)
   - Automatically explores dataset with Glob recursion
   - Discovers structure (train/val/test splits), infers input/output formats
   - Analyzes existing code to extract coding style, data processing patterns, evaluation methodology
   - Only asks user for what cannot be discovered automatically
   - Output: `specification.md`

2. **Research-Evaluation Loop** (each iteration)
   - **Researcher Agent**: searches recent top-conference papers, clones GitHub reference code, proposes full plan
   - **Evaluator Agent**: critically reviews plan, rejects incomplete/incorrect plans, provides feedback for revision
   - Loops until plan is approved

3. **Coder Agent** (`coder.ts`)
   - Writes complete PyTorch training code based on approved plan
   - Follows coding conventions extracted from user's existing code
   - Generates `train.py` and `model.py`

4. **Trainer Agent** (`trainer.ts`)
   - Launches training as detached background process
   - Periodically polls training log to monitor progress
   - Detects completion or failure automatically

5. **Recorder Agent** (`recorder.ts`)
   - Saves all experiment details
   - Writes analysis summary
   - Provides concrete improvement suggestions
   - Auto-commits to git

6. Repeats for requested number of iterations

### Experiment Storage Structure

Experiments are stored in `./experiments/` directory:

```
experiments/
├── experiment_log.jsonl     # Global experiment index
└── {iteration}-{timestamp}-{name}/
    ├── specification.md     # Formal specification with discovered data patterns
    ├── plan.md              # Approved plan with paper references
    ├── config.json          # Full experiment configuration
    ├── code/
    │   ├── train.py
    │   └── model.py
    ├── references/          # Cloned reference code from GitHub
    ├── logs/
    │   └── training.log
    ├── results/
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── checkpoints/          # git-ignored
    └── summary.md            # Final analysis and suggestions
```

## Key Dependencies

- `@modelcontextprotocol/sdk` - Model Context Protocol server SDK
- `@anthropic-ai/claude-agent-sdk` - Claude Agent SDK for multi-agent orchestration
- `@anthropic-ai/sdk` - Anthropic API client
- `simple-git` - Git operations for auto-committing experiments
- `date-fns` - Date formatting
- TypeScript for type safety

## Plugin Configuration

- `.mcp.json` - MCP server configuration for Claude Code plugin system
- `commands/autoresearch.md` - Slash command definition for `/autoresearch`
- `skills/autoresearch/SKILL.md` - Skill definition for direct skill invocation

## Development Notes

- Source is in TypeScript, must compile to `build/` with `npm run build`
- MCP server runs over stdio transport
- All file paths are handled relative to the working directory where `/autoresearch` is invoked
- Training runs as detached background process to allow long-running experiments
- Extracted patterns from existing code are preserved in the experiment specification for subsequent agents to follow
