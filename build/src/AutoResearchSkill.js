"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoResearchSkill = void 0;
const experimentTracker_1 = require("./utils/experimentTracker");
const MultiAgentSkill_1 = require("./MultiAgentSkill");
const agents_1 = require("./agents");
class AutoResearchSkill {
    config;
    tracker;
    currentTrainingMonitor = null;
    onMonitorCreated = null;
    multiAgentSkill;
    constructor(config) {
        this.config = config;
        this.tracker = new experimentTracker_1.ExperimentTracker();
        // Store monitor reference when created
        this.setOnMonitorCreated((monitor) => {
            this.currentTrainingMonitor = monitor;
        });
        // Build the main prompt that orchestrates the full workflow
        const mainPrompt = this.buildMainPrompt();
        // Create MultiAgentSkill with all specialized agents
        this.multiAgentSkill = new MultiAgentSkill_1.MultiAgentSkill({
            mainPrompt,
            agents: agents_1.allAgents,
            allowedTools: [
                'Agent', 'AskUserQuestion', 'Read', 'Write', 'Edit', 'Glob',
                'Grep', 'Bash', 'WebSearch', 'WebFetch',
            ],
            maxTurns: 150, // Enough for multiple iterations with research-eval loops
        });
    }
    setOnMonitorCreated(callback) {
        this.onMonitorCreated = callback;
    }
    /**
     * Get current training status if a training is running
     */
    getTrainingStatus() {
        if (!this.currentTrainingMonitor) {
            return null;
        }
        const status = this.currentTrainingMonitor.loadStatus();
        if (!status) {
            return null;
        }
        return this.currentTrainingMonitor.checkStatus(status);
    }
    /**
     * Stop the current running training
     */
    async stopTraining() {
        if (!this.currentTrainingMonitor) {
            return false;
        }
        const status = this.currentTrainingMonitor.loadStatus();
        if (status && status.status === 'running') {
            await this.currentTrainingMonitor.stopTraining(status);
            return true;
        }
        return false;
    }
    /**
     * List all previous experiments
     */
    listExperiments() {
        return this.tracker.listExperiments();
    }
    /**
     * Get summary for a specific experiment
     */
    getExperimentSummary(experimentId) {
        return this.tracker.getExperiment(experimentId);
    }
    /**
     * Build the main orchestration prompt
     */
    buildMainPrompt() {
        const task = this.config.task;
        const datasetPath = this.config.datasetPath;
        const maxIterations = this.config.maxIterations;
        const experimentName = this.config.experimentName;
        return `You are the main orchestrator for AutoResearch - an autonomous machine learning research experiment.

## Experiment Information
- **Task**: ${task}
- **Dataset Path**: ${datasetPath}
- **Max Iterations**: ${maxIterations}
- **Experiment Name**: ${experimentName}

## Overall Workflow You Must Follow

Follow this process step-by-step, using the specialized subagents provided:

### Step 1: Task Understanding (using the 'understanding' subagent)
1. Call the **understanding** subagent to:
   - Automatically explore the dataset directory structure
   - Analyze any existing code to extract coding conventions and patterns
   - Clarify any ambiguous points with the user (especially what evaluation metric to optimize)
   - Write the formal specification to specification.md in the experiment directory
   - Get user review and confirmation on the specification before proceeding
   - The user may request modifications - incorporate them before continuing

### Step 2: Iterative Research and Training (repeat for ${maxIterations} iterations)
For each iteration from 1 to ${maxIterations}:

1. **Research & Plan** (using 'researcher' + 'evaluator' subagents in a loop):
   - Call **researcher** subagent to research recent papers, find GitHub reference code, and write a complete plan
   - Call **evaluator** subagent to review the plan for completeness and feasibility
   - If the plan is REJECTED, incorporate the feedback and go back to researcher to improve the plan
   - Repeat until the plan is APPROVED

2. **Write Code** (using the 'coder' subagent):
   - Call **coder** subagent to write the complete PyTorch training code (train.py + model.py) based on the approved plan
   - Code must follow the specification and extracted coding conventions

3. **Code Review** (using the 'evaluator' subagent - unified evaluator reviews both plan and code):
   - Call **evaluator** subagent to review the generated code
   - Check that code is complete, matches the approved plan, follows all requirements, and has correct logging format
   - If the code is REJECTED, incorporate the feedback and go back to coder to fix the issues
   - Repeat until the code is APPROVED

4. **Run Training** (using the 'trainer' subagent):
   - Call **trainer** subagent to launch the training and monitor progress
   - Wait for training to complete or fail

5. **Analyze Results** (using the 'recorder' subagent):
   - Call **recorder** subagent to analyze the results, write a summary, and suggest improvements
   - Commit the experiment to git

### Step 3: Final Summary
After all iterations are complete, compile a comprehensive final summary that includes:
- Overview of all iterations
- Best result achieved
- Location of the best experiment
- Key findings and conclusions

## VERY IMPORTANT - YOU MUST FOLLOW THIS EXACT ORDER
- **YOU CANNOT CHANGE THE ORDER** - follow the steps above one-by-one strictly
- You MUST use the provided subagents - each has a specialized role and tools
- Step 1 (Understanding) MUST be completed first and get user confirmation before proceeding
- For each iteration, you MUST go through: **Research→Evaluate→Code→Evaluate (code review)→Train→Analyze** in that exact order
- Researcher-Evaluator loop MUST continue until the plan is approved - do not skip this
- Coder-Evaluator (code review) loop MUST continue until the code is approved - do not skip this
- You cannot proceed to the next step until the current step is fully completed
- Save all outputs to the experiment directory as documented
- Report progress clearly to the user throughout the process

Now **start immediately with Step 1**: Task Understanding by calling the 'understanding' subagent.`;
    }
    /**
     * Run the full multi-agent workflow or handle utility actions
     */
    async run(queryFn) {
        // Handle utility actions
        const action = this.config.action || 'start';
        switch (action) {
            case 'status': {
                const status = this.getTrainingStatus();
                if (!status) {
                    return 'No active training currently running.';
                }
                return `# Current Training Status\n\n\`\`\`json\n${JSON.stringify(status, null, 2)}\n\`\`\``;
            }
            case 'stop': {
                const stopped = await this.stopTraining();
                if (stopped) {
                    return '✓ Training stopped successfully.';
                }
                return 'No active training found to stop.';
            }
            case 'list': {
                const experiments = this.listExperiments();
                let result = '# All AutoResearch Experiments\n\n';
                if (experiments.length === 0) {
                    result += 'No experiments found.\n';
                }
                else {
                    result += `| Iteration | ID | Name | Status | Task |\n`;
                    result += `|----------|----|------|--------|------|\n`;
                    for (const exp of experiments) {
                        result += `| ${exp.iteration} | ${exp.id} | ${exp.name} | ${exp.status} | ${exp.task.slice(0, 50)}... |\n`;
                    }
                }
                result += `\nAll experiments stored in: ${this.tracker.getExperimentBaseDir()}`;
                return result;
            }
            case 'start':
            default: {
                console.log(`Starting AutoResearch: ${this.config.task}`);
                console.log(`Max iterations: ${this.config.maxIterations}`);
                // Let MultiAgentSkill handle the orchestration
                const result = await this.multiAgentSkill.run(queryFn);
                // Add header for the final result
                const finalResult = `# AutoResearch Experiment: ${this.config.experimentName}\n\n` +
                    `**Task**: ${this.config.task}\n` +
                    `**Dataset**: ${this.config.datasetPath}\n` +
                    `**Max Iterations**: ${this.config.maxIterations}\n\n` +
                    `---\n\n${result}`;
                return finalResult;
            }
        }
    }
}
exports.AutoResearchSkill = AutoResearchSkill;
// Export all agent configs
__exportStar(require("./agents"), exports);
