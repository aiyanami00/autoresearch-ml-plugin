// Agent Output Tracker - Records each subagent's work for documentation
import * as fs from 'fs';
import * as path from 'path';
import { AgentOutput } from '../types';

export class AgentOutputTracker {
  private experimentDir: string;
  private outputsDir: string;

  constructor(experimentDir: string) {
    this.experimentDir = experimentDir;
    this.outputsDir = path.join(experimentDir, 'agent_outputs');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.outputsDir)) {
      fs.mkdirSync(this.outputsDir, { recursive: true });
    }
  }

  /**
   * Record an agent's output
   */
  recordOutput(output: AgentOutput): string {
    const filename = `${output.agentName}_${Date.now()}.json`;
    const filepath = path.join(this.outputsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    return filepath;
  }

  /**
   * Record agent output with simplified interface
   */
  record(
    agentName: string,
    input: string,
    output: string,
    toolsUsed: string[],
    duration: number
  ): string {
    const agentOutput: AgentOutput = {
      agentName,
      timestamp: Date.now(),
      input,
      output,
      toolsUsed,
      duration,
    };
    return this.recordOutput(agentOutput);
  }

  /**
   * Generate markdown documentation from all agent outputs
   */
  generateDocumentation(): string {
    if (!fs.existsSync(this.outputsDir)) {
      return '# Agent Outputs\n\nNo outputs recorded yet.\n';
    }

    const files = fs.readdirSync(this.outputsDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    let md = '# Subagent Execution Documentation\n\n';
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    md += `Total Executions: ${files.length}\n\n`;
    md += '---\n\n';

    for (const file of files) {
      const content = fs.readFileSync(path.join(this.outputsDir, file), 'utf-8');
      const output: AgentOutput = JSON.parse(content);

      md += `## ${output.agentName}\n\n`;
      md += `- **Time**: ${new Date(output.timestamp).toLocaleString()}\n`;
      md += `- **Duration**: ${output.duration.toFixed(1)}s\n`;
      md += `- **Tools Used**: ${output.toolsUsed.join(', ') || 'None'}\n\n`;

      md += `### Input\n\n\`\`\`\n${output.input.substring(0, 500)}${output.input.length > 500 ? '...' : ''}\n\`\`\`\n\n`;

      md += `### Output\n\n${output.output.substring(0, 1000)}${output.output.length > 1000 ? '\n\n... (truncated)' : ''}\n\n`;

      md += '---\n\n';
    }

    // Write the summary
    const summaryPath = path.join(this.experimentDir, 'AGENTS.md');
    fs.writeFileSync(summaryPath, md);

    return summaryPath;
  }

  /**
   * List all recorded outputs
   */
  listOutputs(): AgentOutput[] {
    if (!fs.existsSync(this.outputsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.outputsDir)
      .filter(f => f.endsWith('.json'))
      .sort();

    return files.map(file => {
      const content = fs.readFileSync(path.join(this.outputsDir, file), 'utf-8');
      return JSON.parse(content) as AgentOutput;
    });
  }

  /**
   * Get outputs for a specific agent
   */
  getAgentOutputs(agentName: string): AgentOutput[] {
    return this.listOutputs().filter(o => o.agentName === agentName);
  }
}
