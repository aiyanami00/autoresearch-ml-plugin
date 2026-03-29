"use strict";
// AutoResearch Skill Entry Point
// Claude Code skill implementation entry
// This is required for Claude Code to find and invoke the skill
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = autoresearchSkill;
const index_1 = require("../../src/index");
// Module-level cache for singleton pattern
// Reuse instance when working in the same working directory (most common case)
let cachedInstance = null;
let cachedBaseDir = null;
/**
 * Skill entry point for Claude Code
 * Called when user invokes /autoresearch or the autoresearch skill
 */
async function autoresearchSkill(params, context) {
    const { task = '', dataset_path = './', max_iterations = 3, experiment_name, action = 'start', } = params;
    const { query } = context;
    const currentBaseDir = process.cwd();
    // Create config with all required fields
    const config = {
        task,
        datasetPath: dataset_path,
        maxIterations: max_iterations,
        experimentName: experiment_name || `autoresearch-${Date.now()}`,
        checkIntervalMs: 30000, // Check training progress every 30 seconds
        action,
        experimentId: undefined,
    };
    // Reuse cached instance if still in the same base directory
    // This avoids rebuilding the entire MultiAgentSkill structure every time
    if (cachedInstance && cachedBaseDir === currentBaseDir) {
        return await cachedInstance.run(query);
    }
    // Create new instance if first call or working directory changed
    const skill = new index_1.AutoResearchSkill(config);
    cachedInstance = skill;
    cachedBaseDir = currentBaseDir;
    return await skill.run(query);
}
