// AutoResearch Skill Entry Point
// Claude Code skill implementation entry
// This is required for Claude Code to find and invoke the skill

import { AutoResearchSkill } from '../../src/index';
import type { AutoResearchConfig } from '../../src/types';

/**
 * Skill entry point for Claude Code
 * Called when user invokes /autoresearch or the autoresearch skill
 */
export default async function autoresearchSkill(
  params: {
    task?: string;
    dataset_path?: string;
    max_iterations?: number;
    experiment_name?: string;
    action?: 'start' | 'status' | 'stop' | 'list';
  },
  context: {
    query: any;
  }
): Promise<string> {
  const {
    task = '',
    dataset_path = './',
    max_iterations = 3,
    experiment_name,
    action = 'start',
  } = params;

  const { query } = context;

  // Create config with all required fields
  const config: AutoResearchConfig = {
    task,
    datasetPath: dataset_path,
    maxIterations: max_iterations,
    experimentName: experiment_name || `autoresearch-${Date.now()}`,
    checkIntervalMs: 30000, // Check training progress every 30 seconds
    action,
    experimentId: undefined,
  };

  // Create the skill instance and run
  const skill = new AutoResearchSkill(config);
  return await skill.run(query);
}
