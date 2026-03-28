/**
 * Multi-Agent Skill - Reusable template for creating multi-agent workflows with Claude Agent SDK
 *
 * Example usage:
 * ```typescript
 * import { MultiAgentSkill } from './MultiAgentSkill';
 *
 * const skill = new MultiAgentSkill({
 *   mainPrompt: 'Analyze this codebase for security issues',
 *   agents: [
 *     {
 *       name: 'discoverer',
 *       description: 'Find all relevant files',
 *       prompt: 'You discover files in the codebase that might contain security issues',
 *       tools: ['Glob', 'Read']
 *     },
 *     {
 *       name: 'analyzer',
 *       description: 'Analyze code for vulnerabilities',
 *       prompt: 'You analyze code for security vulnerabilities',
 *       tools: ['Read', 'Grep']
 *     }
 *   ]
 * });
 *
 * const result = await skill.run();
 * ```
 */

import type { query, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

export interface SubAgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
}

export interface MultiAgentConfig {
  mainPrompt: string;
  agents: SubAgentConfig[];
  allowedTools?: string[];
  maxTurns?: number;
}

export class MultiAgentSkill {
  private config: MultiAgentConfig;

  constructor(config: MultiAgentConfig) {
    this.config = {
      ...config,
      allowedTools: config.allowedTools || ['Agent', 'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash', 'Write', 'Edit', 'AskUserQuestion'],
      maxTurns: config.maxTurns || 100,
    };
  }

  /**
   * Convert the agent config to the format expected by Agent SDK
   */
  private getAgentsMap(): Record<string, AgentDefinition> {
    const agents: Record<string, AgentDefinition> = {};
    for (const agent of this.config.agents) {
      agents[agent.name] = {
        description: agent.description,
        prompt: agent.prompt,
        tools: agent.tools,
      };
    }
    return agents;
  }

  /**
   * Run the multi-agent skill
   * @returns Promise with the final result string
   */
  async run(queryFn: typeof query): Promise<string> {
    const agentsMap = this.getAgentsMap();

    let finalResult = '';

    for await (const message of queryFn({
      prompt: this.config.mainPrompt,
      options: {
        allowedTools: this.config.allowedTools!,
        agents: agentsMap,
        maxTurns: this.config.maxTurns!,
      },
    })) {
      if ('result' in message && message.result) {
      finalResult = message.result;
    }

    }

    return finalResult;
  }
}

export default MultiAgentSkill;
