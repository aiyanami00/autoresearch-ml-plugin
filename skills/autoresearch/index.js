"use strict";
// AutoResearch Skill Entry Point
// Claude Code skill implementation entry
// This is required for Claude Code to find and invoke the skill
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = autoresearchSkill;
const index_1 = require("../../src/index");
/**
 * Skill entry point for Claude Code
 * Called when user invokes /autoresearch or the autoresearch skill
 */
async function autoresearchSkill(params, context) {
    const { task = '', dataset_path = './', max_iterations = 3, experiment_name, action = 'start', } = params;
    const { query } = context;
    // Create config with all required fields
    const config = {
        task,
        datasetPath: dataset_path,
        maxIterations: max_iterations,
        experimentName: experiment_name || `autoresearch-${Date.now()}`,
        action,
    };
    // Create the skill instance and run
    const skill = new index_1.AutoResearchSkill(config);
    return await skill.run(query);
}
