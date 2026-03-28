# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This directory (`/workspace/plugin`) is for creating a new Model Context Protocol (MCP) plugin. The parent workspace `/workspace/` contains multiple bioinformatics MCP plugins that can serve as references.

## Repository Context

Parent directory contains existing MCP plugin projects:
- `../vitrace_mcp/` - Python MCP server for ViTrace (virology analysis)
- `../kraken_mcp/` - Python MCP server for Kraken2 (taxonomic classification)
- `../Vi_mcp/` - Python MCP server for ViTax (virus taxonomy)
- `../yww/` - Node.js/TypeScript project with Claude Agent SDK + MCP SDK

## Common Commands for Python MCP plugins (reference from existing projects)

Most MCP plugins in this repository use Python with uv:

```bash
# Create virtual environment
uv venv

# Install dependencies
uv pip install -r requirements.txt
# OR
uv sync

# Run the MCP server
python main.py

# Install project in development mode
uv pip install -e .
```

For Node.js/TypeScript MCP plugins (reference from ../yww):

```bash
# Install dependencies
npm install

# Build TypeScript
npx tsc

# Run with ts-node
npx ts-node src/index.ts
```

## Architecture Guidance for New MCP Plugins

Follow the patterns established in existing MCP projects in this repository:
1. Use `main.py` as the entry point that creates and runs the MCP server
2. Define MCP tools with the @mcp.tool() decorator for Python
3. Each tool should handle a specific bioinformatics operation (e.g., classify sequences, query databases)
4. Include proper error handling and return clear text results to the LLM
5. Use Python for bioinformatics tools as that's the existing pattern

## Reference Dependencies

Python MCP dependencies typically include:
- `mcp[cli]` - Model Context Protocol server SDK
- Various bioinformatics command-line tools (kraken2, etc.)

Node.js/TypeScript MCP dependencies typically include:
- `@modelcontextprotocol/sdk` - MCP SDK
- `@anthropic-ai/claude-agent-sdk` - Claude Agent SDK
