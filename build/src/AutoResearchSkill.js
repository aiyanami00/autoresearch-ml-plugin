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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoResearchSkill = void 0;
// Main AutoResearch orchestration skill
// Uses Claude Agent SDK query with options.agents for true subagent sessions
const claude_agent_sdk_1 = require("@anthropic-ai/claude-agent-sdk");
const experimentTracker_1 = require("./utils/experimentTracker");
const trainingMonitor_1 = require("./utils/trainingMonitor");
const experimentBoard_1 = require("./utils/experimentBoard");
const agentOutputTracker_1 = require("./utils/agentOutputTracker");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Import agent prompts
const agents_1 = require("./agents");
class AutoResearchSkill {
    config;
    tracker;
    boardTracker;
    agentOutputTracker;
    currentTrainingMonitor = null;
    constructor(config) {
        this.validateConfig(config);
        this.config = config;
        this.tracker = new experimentTracker_1.ExperimentTracker();
        this.boardTracker = new experimentBoard_1.ExperimentBoardTracker(this.tracker.getExperimentBaseDir());
        this.agentOutputTracker = new agentOutputTracker_1.AgentOutputTracker(this.tracker.getExperimentBaseDir());
    }
    /**
     * Validate the configuration object
     * @throws Error if configuration is invalid
     */
    validateConfig(config) {
        const action = config.action || 'start';
        // Only validate task and dataset for 'start' action
        if (action === 'start') {
            if (!config.task || config.task.trim().length === 0) {
                throw new Error('Task is required for starting a new experiment. Please provide a task description.');
            }
            if (!config.datasetPath || config.datasetPath.trim().length === 0) {
                throw new Error('Dataset path is required for starting a new experiment. Please provide a valid path.');
            }
            // Validate dataset path exists (only if not in dry-run mode)
            if (!fs.existsSync(config.datasetPath)) {
                console.warn(`[AutoResearch] Warning: Dataset path '${config.datasetPath}' does not exist yet.`);
            }
        }
        // Validate maxIterations
        if (config.maxIterations === undefined || config.maxIterations === null) {
            throw new Error('maxIterations is required. Please specify the number of iterations (default: 3).');
        }
        if (config.maxIterations < 1) {
            throw new Error('maxIterations must be at least 1.');
        }
        if (config.maxIterations > 10) {
            console.warn(`[AutoResearch] Warning: maxIterations (${config.maxIterations}) is high. This may take a long time.`);
        }
        // Validate experimentName
        if (!config.experimentName || config.experimentName.trim().length === 0) {
            throw new Error('experimentName is required.');
        }
        // Sanitize experiment name (remove special characters that could cause issues)
        const sanitizedName = config.experimentName.replace(/[^a-zA-Z0-9-_]/g, '_');
        if (sanitizedName !== config.experimentName) {
            console.warn(`[AutoResearch] Warning: Experiment name sanitized from '${config.experimentName}' to '${sanitizedName}'`);
            config.experimentName = sanitizedName;
        }
        // Validate checkIntervalMs
        if (config.checkIntervalMs < 1000) {
            console.warn(`[AutoResearch] Warning: checkIntervalMs (${config.checkIntervalMs}ms) is very short. Minimum recommended is 5000ms.`);
        }
    }
    /**
     * Build the agents map for SDK options.agents
     */
    buildAgentsMap() {
        return {
            understanding: {
                description: agents_1.understanding.description,
                prompt: agents_1.understanding.prompt,
                tools: agents_1.understanding.tools,
            },
            researcher: {
                description: agents_1.researcher.description,
                prompt: agents_1.researcher.prompt,
                tools: agents_1.researcher.tools,
            },
            evaluator: {
                description: agents_1.evaluator.description,
                prompt: agents_1.evaluator.prompt,
                tools: agents_1.evaluator.tools,
            },
            coder: {
                description: agents_1.coder.description,
                prompt: agents_1.coder.prompt,
                tools: agents_1.coder.tools,
            },
            trainer: {
                description: agents_1.trainer.description,
                prompt: agents_1.trainer.prompt,
                tools: agents_1.trainer.tools,
            },
            recorder: {
                description: agents_1.recorder.description,
                prompt: agents_1.recorder.prompt,
                tools: agents_1.recorder.tools,
            },
        };
    }
    /**
     * Build the main orchestrator prompt that guides the workflow
     */
    buildMainPrompt() {
        const { task, datasetPath, maxIterations, experimentName } = this.config;
        const expBaseDir = this.tracker.getExperimentBaseDir();
        const boardPath = path.join(expBaseDir, 'board.json');
        return `You are the AutoResearch Orchestrator. Your job is to coordinate a multi-agent machine learning research workflow.

## User Request
- **Task**: ${task || 'N/A'}
- **Dataset Path**: ${datasetPath || 'N/A'}
- **Max Iterations**: ${maxIterations}
- **Experiment Name**: ${experimentName || 'AutoResearch Experiment'}
- **Experiment Base Directory**: ${expBaseDir}
- **Experiment Board Path**: ${boardPath}

## Experiment Board System

The experiment board at \`${boardPath}\` tracks research directions and results. Each agent MUST be aware of:
- Current research direction and consecutive failures
- What methods have been tried and their results
- When to pivot (3 consecutive failures = abandon direction)

### Board Structure:
- **directions**: List of research directions with status (active/abandoned)
- **currentDirection**: Currently active direction ID
- **entries**: History of all experiments with metrics
- **webSearchUsed/webFetchUsed**: Count of web calls (max 5 each per iteration)

### Failure Handling:
- If a direction has 3+ consecutive failures, it gets abandoned
- Researcher must propose a NEW direction when current is abandoned
- Check board.json before making WebSearch/WebFetch calls

You MUST follow this exact workflow sequence:

### Phase 1: Understanding

**CRITICAL: YOU MUST USE TASK TOOL FOR UNDERSTANDING AND EVALUATION**

1. **MUST call Task tool**: agent="understanding" with context about the task, dataset, and experiment directory
2. The understanding agent will:
   - Explore the dataset structure by writing Python scripts
   - Check GPU hardware with nvidia-smi
   - Analyze existing code patterns
   - Write specification.md
   - Ask user to confirm optimization objective and evaluation metrics
3. **MUST call Task tool**: agent="evaluator" with phase="spec_review"
   - The evaluator reviews specification.md for completeness
   - Checks for mandatory sections: Optimization Objective, Evaluation Metrics, Hardware Information, etc.
4. If evaluator REJECTS:
   - Read the feedback from evaluator's output
   - Go back to step 1 with the feedback for understanding agent to revise
   - Repeat until specification is APPROVED
5. If evaluator APPROVES:
   - Present the specification to the user
   - Get explicit confirmation before proceeding to Phase 2
6. If user wants changes:
   - Go back to step 1 with user's feedback
   - Repeat the understanding → evaluator loop until user is satisfied

### Phase 2: Iterative Research Loop (repeat for ${maxIterations} iterations)

**CRITICAL: YOU MUST USE TASK TOOL FOR EACH ITERATION**

For each iteration N from 1 to ${maxIterations}:
- YOU are the orchestrator - you coordinate but DO NOT implement
- EACH phase below MUST use Task tool to spawn the appropriate subagent
- NEVER implement research/coding/training yourself - always delegate to subagents

#### Iteration N begins:

#### 2.1 Research Phase (MUST use Task tool)
1. **CRITICAL**: First read the experiment board at \`${boardPath}\` to understand:
   - Current research direction and its history
   - Number of consecutive failures
   - What has been tried before
   - Remaining WebSearch/WebFetch calls
2. **MUST call Task tool**: agent="researcher"
3. Pass context: specPath, planPath, iteration number N, and boardPath
4. The researcher will:
   - Decide: continue current direction / pivot within direction / propose new direction
   - Search papers (max 5 WebSearch calls)
   - Fetch key papers (max 5 WebFetch calls)
   - Write plan.md based on board analysis

#### 2.2 Plan Evaluation (MUST use Task tool)
1. **MUST call Task tool**: agent="evaluator" with phase="plan_review"
2. The evaluator reviews the plan for completeness and feasibility
3. If REJECTED, go back to 2.1 with feedback
4. If APPROVED, continue

#### 2.3 Code Generation (MUST use Task tool)
1. **MUST call Task tool**: agent="coder"
2. Pass context: planPath, specPath, trainPath, modelPath, iteration N
3. The coder generates train.py and model.py

#### 2.4 Code Evaluation (MUST use Task tool)
1. **MUST call Task tool**: agent="evaluator" with phase="code_review"
2. The evaluator reviews the generated code
3. If REJECTED, go back to 2.3 with feedback
4. If APPROVED, continue

#### 2.5 Training (MUST use Task tool)
1. **MUST call Task tool**: agent="trainer"
2. Pass context: trainPath, logDir, outputDir, iteration N
3. The trainer launches training and monitors until completion
4. Wait for trainer to return training results

#### 2.6 Recording (MUST use Task tool)
1. **MUST call Task tool**: agent="recorder"
2. Pass context: iterDir, trainingResult, summaryPath, boardPath, iteration N
3. The recorder analyzes results and writes summary.md
4. **After recorder completes**: Read the JSON output from recorder and update the experiment board by calling the appropriate functions

#### End of Iteration N

**REPEAT for next iteration until all ${maxIterations} iterations complete.**

### Phase 3: Final Summary
1. After all ${maxIterations} iterations complete, generate a final summary
2. Report the best results across all iterations

## Critical Instructions

1. **YOU ARE THE ORCHESTRATOR - DO NOT IMPLEMENT, ONLY COORDINATE**: Your job is to manage the workflow by calling subagents. NEVER write research plans, generate code, or run training yourself. ALWAYS use Task tool to delegate to the appropriate subagent.

2. **MUST USE TASK TOOL FOR EVERY PHASE**: For each phase in every iteration, you MUST use Task tool with agent="<agent_name>". Do NOT skip this - even if you think you know what to do, the subagents have specialized prompts and capabilities.

3. **ITERATION TRACKING**: Explicitly track which iteration you are on. After completing iteration N, increment and start iteration N+1. Continue until all ${maxIterations} iterations are complete.

4. **WAIT FOR SUBAGENT COMPLETION**: Each subagent must complete and return results before proceeding to the next step. Do not proceed until you receive the subagent's result.

5. **HANDLE EVALUATOR REJECTIONS**: If evaluator rejects a plan or code, you MUST go back to the appropriate phase with the feedback. Do not skip steps or proceed with rejected work.

6. **USER CONFIRMATION AFTER UNDERSTANDING**: After understanding phase completes, ALWAYS present the specification to the user and wait for explicit confirmation before proceeding to Phase 2.

7. **UPDATE EXPERIMENT BOARD AFTER EACH ITERATION**: After recorder completes, the experiment results must be recorded in the board.json file for tracking.

8. **RECORD AGENT OUTPUTS**: Each subagent execution should be logged for documentation purposes.

## Directory Structure

All experiments are stored in: ${expBaseDir}

Structure:
- ${expBaseDir}/board.json (experiment board - kanban tracking)
- ${expBaseDir}/specification.md (shared spec)
- ${expBaseDir}/result.csv (global results summary)
- ${expBaseDir}/agent_outputs/ (subagent execution logs)
- ${expBaseDir}/experiment01/ (iteration 1)
  - plan/plan.md
  - src/train.py, src/model.py
  - log/training.log
  - output/
  - summary.md
- ${expBaseDir}/experiment02/ (iteration 2)
- ... and so on

## Subagent Tool Access

- **understanding**: AskUserQuestion, Read, Write, Glob, Bash
- **researcher**: WebSearch, WebFetch, Read, Glob, Bash
- **evaluator**: Read, Glob, Write
- **coder**: Write, Read, Edit, Bash
- **trainer**: Bash, Read
- **recorder**: Read, Write, Bash, Agent

Start the workflow now by following these steps in order:
1. Call understanding agent (Task tool) for Phase 1
2. Call evaluator (Task tool) to review specification
3. If rejected, loop back to step 1 with feedback
4. If approved, present to user and get confirmation
5. After user confirmation, begin Phase 2 iterative loop
6. For iteration 1 to ${maxIterations}:
   - Call researcher → evaluator → coder → evaluator → trainer → recorder
   - Each step MUST use Task tool
7. After all iterations, generate final summary`;
    }
    /**
     * Main entry point - runs the orchestration
     */
    async run() {
        const action = this.config.action || 'start';
        switch (action) {
            case 'status':
                return this.handleStatus();
            case 'stop':
                return this.handleStop();
            case 'list':
                return this.handleList();
            case 'summary':
                return this.handleSummary();
            case 'start':
            default:
                return this.handleStart();
        }
    }
    /**
     * Start the full multi-agent workflow
     */
    async handleStart() {
        try {
            console.log(`[AutoResearch] Starting: ${this.config.task}`);
            console.log(`[AutoResearch] Max iterations: ${this.config.maxIterations}`);
            const agentsMap = this.buildAgentsMap();
            const mainPrompt = this.buildMainPrompt();
            let finalResult = '';
            // Single query() call with agents registered - SDK handles subagent spawning
            for await (const message of (0, claude_agent_sdk_1.query)({
                prompt: mainPrompt,
                options: {
                    allowedTools: ['Task', 'Read', 'Write', 'Glob', 'Bash', 'AskUserQuestion'],
                    agents: agentsMap,
                    maxTurns: 200,
                },
            })) {
                if ('result' in message && message.result) {
                    finalResult = message.result;
                }
                // Stream progress to console
                if ('content' in message && message.content) {
                    process.stdout.write(message.content);
                }
            }
            return `# AutoResearch Complete: ${this.config.experimentName}\n\n` +
                `**Task**: ${this.config.task}\n` +
                `**Dataset**: ${this.config.datasetPath}\n` +
                `**Iterations**: ${this.config.maxIterations}\n\n` +
                `---\n\n${finalResult}`;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[AutoResearch] Error: ${errorMessage}`);
            return `# AutoResearch Error\n\nFailed to run experiment:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\nPlease check the console for more details.`;
        }
    }
    /**
     * Get training status
     */
    handleStatus() {
        const monitor = this.getOrCreateMonitor();
        const status = monitor.loadStatus();
        if (!status) {
            return '# Training Status\n\nNo active or recent training found.';
        }
        return `# Current Training Status\n\n` +
            `**Status**: ${status.status}\n` +
            `**PID**: ${status.pid}\n` +
            `**Current Epoch**: ${status.currentEpoch}/${status.maxEpochs}\n` +
            `**Current Loss**: ${status.currentLoss.toFixed(4)}\n` +
            `**Best Loss**: ${status.bestLoss.toFixed(4)}\n` +
            `**Started**: ${new Date(status.startTime).toLocaleString()}\n` +
            `**Last Update**: ${new Date(status.lastUpdateTime).toLocaleString()}\n` +
            (status.error ? `**Error**: ${status.error}\n` : '');
    }
    /**
     * Stop training
     */
    async handleStop() {
        const monitor = this.getOrCreateMonitor();
        const status = monitor.loadStatus();
        if (!status || status.status !== 'running') {
            return '# Stop Training\n\nNo active training to stop.';
        }
        await monitor.stopTraining(status);
        return '# Stop Training\n\n✓ Training stopped successfully.';
    }
    /**
     * List all experiments
     */
    handleList() {
        const experiments = this.tracker.listExperiments();
        if (experiments.length === 0) {
            return '# AutoResearch Experiments\n\nNo experiments found.\n\n' +
                `Experiments directory: ${this.tracker.getExperimentBaseDir()}`;
        }
        let result = '# All AutoResearch Experiments\n\n';
        result += `| Iteration | ID | Name | Status | Task |\n`;
        result += `|----------|----|------|--------|------|\n`;
        for (const exp of experiments) {
            const taskPreview = exp.task.length > 50 ? exp.task.slice(0, 50) + '...' : exp.task;
            result += `| ${exp.iteration} | ${exp.id} | ${exp.name} | ${exp.status} | ${taskPreview} |\n`;
        }
        result += `\nExperiments stored in: ${this.tracker.getExperimentBaseDir()}`;
        return result;
    }
    /**
     * Get summary of all experiments
     */
    handleSummary() {
        const experiments = this.tracker.listExperiments();
        if (experiments.length === 0) {
            return '# AutoResearch Summary\n\nNo experiments found.';
        }
        const expBaseDir = this.tracker.getExperimentBaseDir();
        let result = '# AutoResearch Experiment Summary\n\n';
        // Read overall specification
        const specPath = path.join(expBaseDir, 'specification.md');
        if (fs.existsSync(specPath)) {
            const specContent = fs.readFileSync(specPath, 'utf-8');
            const taskMatch = specContent.match(/## Task Description\n([\s\S]*?)(?=\n##|$)/);
            if (taskMatch) {
                result += `## Overall Task\n${taskMatch[1].trim()}\n\n`;
            }
        }
        // Collect completed experiments with summaries
        const completedExperiments = [];
        for (const expInfo of experiments) {
            const exp = this.tracker.getExperiment(expInfo.id);
            if (!exp)
                continue;
            const summaryPath = path.join(exp.baseDir, 'summary.md');
            if (!fs.existsSync(summaryPath))
                continue;
            const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
            // Extract metrics
            const bestMetricMatch = summaryContent.match(/best.*metric[:]?[^\d]*([\d.]+)/i);
            const accuracyMatch = summaryContent.match(/accuracy[:]?[^\d]*([\d.]+)/i);
            const lossMatch = summaryContent.match(/loss[:]?[^\d]*([\d.]+)/i);
            let bestMetric;
            if (bestMetricMatch)
                bestMetric = parseFloat(bestMetricMatch[1]);
            else if (accuracyMatch)
                bestMetric = parseFloat(accuracyMatch[1]);
            else if (lossMatch)
                bestMetric = parseFloat(lossMatch[1]);
            // Extract findings and suggestions
            const findings = [];
            const suggestions = [];
            const findingsMatch = summaryContent.match(/(?:Key Findings|Findings|Observations):?\n([\s\S]*?)(?=\n##|\n###|$)/i);
            if (findingsMatch) {
                const lines = findingsMatch[1].split('\n').filter((l) => l.trim().startsWith('- ') || l.trim().length > 0);
                lines.forEach((l) => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('- '))
                        findings.push(trimmed.substring(2));
                    else if (trimmed.length > 0)
                        findings.push(trimmed);
                });
            }
            const suggestionsMatch = summaryContent.match(/(?:Suggestions|Improvements|Future Directions|Next Steps):?\n([\s\S]*?)(?=\n##|\n###|$)/i);
            if (suggestionsMatch) {
                const lines = suggestionsMatch[1].split('\n').filter((l) => l.trim().startsWith('- ') || l.trim().length > 0);
                lines.forEach((l) => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('- '))
                        suggestions.push(trimmed.substring(2));
                    else if (trimmed.length > 0)
                        suggestions.push(trimmed);
                });
            }
            completedExperiments.push({
                id: expInfo.id,
                name: expInfo.name,
                iteration: expInfo.iteration,
                bestMetric,
                findings,
                suggestions,
            });
        }
        // Experiments table
        result += `## Completed Experiments\n\n`;
        result += `| Iteration | ID | Name | Best Metric |\n`;
        result += `|-----------|----|------|-------------|\n`;
        for (const exp of completedExperiments) {
            const metricStr = exp.bestMetric !== undefined ? exp.bestMetric.toFixed(4) : 'N/A';
            result += `| ${exp.iteration} | ${exp.id} | ${exp.name} | ${metricStr} |\n`;
        }
        // Best result
        const experimentsWithMetrics = completedExperiments.filter((e) => e.bestMetric !== undefined);
        if (experimentsWithMetrics.length > 0) {
            const bestExperiment = experimentsWithMetrics.reduce((best, current) => (current.bestMetric || 0) > (best.bestMetric || 0) ? current : best);
            result += `\n## Best Result\n\n`;
            result += `- **Experiment**: ${bestExperiment.id} (${bestExperiment.name})\n`;
            result += `- **Metric**: ${bestExperiment.bestMetric.toFixed(4)}\n`;
        }
        // Aggregate findings
        const allFindings = completedExperiments.flatMap((e) => e.findings);
        if (allFindings.length > 0) {
            result += `\n## Key Findings\n\n`;
            allFindings.forEach((finding, idx) => {
                result += `${idx + 1}. ${finding}\n`;
            });
        }
        // Aggregate suggestions
        const allSuggestions = completedExperiments.flatMap((e) => e.suggestions);
        if (allSuggestions.length > 0) {
            result += `\n## Suggested Future Directions\n\n`;
            allSuggestions.forEach((suggestion, idx) => {
                result += `${idx + 1}. ${suggestion}\n`;
            });
        }
        result += `\n---\n`;
        result += `Total: ${completedExperiments.length}/${experiments.length} experiments completed\n`;
        result += `Experiments directory: ${expBaseDir}`;
        return result;
    }
    /**
     * Get or create training monitor
     */
    getOrCreateMonitor() {
        if (!this.currentTrainingMonitor) {
            this.currentTrainingMonitor = new trainingMonitor_1.TrainingMonitor(process.cwd());
        }
        return this.currentTrainingMonitor;
    }
}
exports.AutoResearchSkill = AutoResearchSkill;
// Export agent configs for external use
__exportStar(require("./agents"), exports);
