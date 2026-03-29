// Main AutoResearch orchestration skill
// Uses MultiAgentSkill framework for multi-agent workflow
import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  AutoResearchConfig,
} from './types';
import { ExperimentTracker } from './utils/experimentTracker';
import { TrainingMonitor } from './utils/trainingMonitor';
import { MultiAgentSkill } from './MultiAgentSkill';
import { allAgents } from './agents';

export class AutoResearchSkill {
  private config: AutoResearchConfig;
  private tracker: ExperimentTracker;
  private currentTrainingMonitor: TrainingMonitor | null = null;
  private onMonitorCreated: ((monitor: TrainingMonitor) => void) | null = null;
  private multiAgentSkill: MultiAgentSkill;

  constructor(config: AutoResearchConfig) {
    this.config = config;
    this.tracker = new ExperimentTracker();

    // Store monitor reference when created
    this.setOnMonitorCreated((monitor) => {
      this.currentTrainingMonitor = monitor;
    });

    // Build the main prompt that orchestrates the full workflow
    const mainPrompt = this.buildMainPrompt();

    // Create MultiAgentSkill with all specialized agents
    this.multiAgentSkill = new MultiAgentSkill({
      mainPrompt,
      agents: allAgents,
      allowedTools: [
        'Agent', 'AskUserQuestion', 'Read', 'Write', 'Edit', 'Glob',
        'Grep', 'Bash', 'WebSearch', 'WebFetch',
      ],
      maxTurns: 150, // Enough for multiple iterations with research-eval loops
    });
  }

  public setOnMonitorCreated(callback: (monitor: TrainingMonitor) => void): void {
    this.onMonitorCreated = callback;
  }

  /**
   * Get current training status if a training is running
   */
  public getTrainingStatus() {
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
  public async stopTraining(): Promise<boolean> {
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
  public listExperiments() {
    return this.tracker.listExperiments();
  }

  /**
   * Get summary for a specific experiment
   */
  public getExperimentSummary(experimentId: string) {
    return this.tracker.getExperiment(experimentId);
  }

  /**
   * Build the main orchestration prompt
   */
  private buildMainPrompt(): string {
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

### Step 1: Task Understanding (using the 'understanding' subagent with evaluator review)
1. Call the **understanding** subagent to:
   - Automatically explore the dataset directory structure
   - Analyze any existing code to extract coding conventions and patterns
   - Clarify any ambiguous points with the user (especially what evaluation metric to optimize)
   - Write the formal specification to specification.md in the experiments root directory
2. Call **evaluator** subagent to review the specification for completeness
3. If the specification is REJECTED:
   - Incorporate the evaluator's feedback back to understanding
   - understanding revises the specification
   - call evaluator again to re-review
4. Repeat this loop **until the specification is APPROVED** by evaluator
5. After evaluator approval, present the complete specification to the user and **get user review and confirmation**:
   - The user may request modifications - incorporate them
   - After any user modifications, you still need to call evaluator to re-validate the modified specification
   - Only proceed when **both**: evaluator approved AND user confirmed

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
- **MANDATORY: Research → MUST CALL evaluator → do NOT skip this step**
- **MANDATORY: After Coder → MUST CALL evaluator AGAIN for code review → do NOT skip this step**
- Researcher-Evaluator loop MUST continue until the plan is APPROVED - do not skip this
- Coder-Evaluator (code review) loop MUST continue until the code is APPROVED - do not skip this
- You cannot proceed to the next step until the current step is fully completed
- Save all outputs to the experiment directory as documented
- Report progress clearly to the user throughout the process

### HOW TO CALL SUBAGENTS:
To call a subagent, you MUST use the Agent tool with the subagent name. Example:
\`\`\`
{"name": "Agent", "parameters": {"subagent": "evaluator"}}
\`\`\`
This applies to EVERY step: after researcher finishes, you MUST call Agent to run evaluator. After coder finishes, you MUST call Agent to run evaluator again for code review. You CANNOT skip this by just reading the output yourself - the evaluator is a separate specialized agent that must be invoked.

Now **start immediately with Step 1**: Task Understanding by calling the 'understanding' subagent.`;
  }

  /**
   * Run the full multi-agent workflow or handle utility actions
   */
  async run(queryFn: typeof query): Promise<string> {
    // Handle utility actions
    const action = (this.config as any).action || 'start';

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
        } else {
          result += `| Iteration | ID | Name | Status | Task |\n`;
          result += `|----------|----|------|--------|------|\n`;
          for (const exp of experiments) {
            result += `| ${exp.iteration} | ${exp.id} | ${exp.name} | ${exp.status} | ${exp.task.slice(0, 50)}... |\n`;
          }
        }
        result += `\nAll experiments stored in: ${this.tracker.getExperimentBaseDir()}`;
        return result;
      }

      case 'summary': {
        const experiments = this.listExperiments();
        let result = '# AutoResearch Experiment Summary\n\n';

        if (experiments.length === 0) {
          result += 'No experiments found in the experiments directory.';
          return result;
        }

        // Read overall specification if it exists
        const specPath = require('path').join(this.tracker.getExperimentBaseDir(), 'specification.md');
        const fs = require('fs');
        if (fs.existsSync(specPath)) {
          const specContent = fs.readFileSync(specPath, 'utf-8');
          // Extract task from spec for header
          const taskMatch = specContent.match(/## Task Description\n([\s\S]*?)(?=\n##|$)/);
          if (taskMatch) {
            result += `## Overall Task\n${taskMatch[1].trim()}\n\n`;
          }
        }

        // Process each completed experiment that has a summary
        const completedExperiments: {
          id: string;
          name: string;
          iteration: number;
          summaryPath: string;
          summaryContent: string;
          bestMetric?: number;
          findings: string[];
          suggestions: string[];
        }[] = [];

        for (const expInfo of experiments) {
          const exp = this.tracker.getExperiment(expInfo.id);
          if (!exp) continue;

          const summaryPath = require('path').join(exp.baseDir, 'summary.md');
          if (!fs.existsSync(summaryPath)) continue;

          const summaryContent = fs.readFileSync(summaryPath, 'utf-8');

          // Extract best metric value if mentioned
          const bestMetricMatch = summaryContent.match(/best.*metric[:]?[^\d]*([\d.]+)/i);
          const accuracyMatch = summaryContent.match(/accuracy[:]?[^\d]*([\d.]+)/i);
          const lossMatch = summaryContent.match(/loss[:]?[^\d]*([\d.]+)/i);
          let bestMetric: number | undefined;
          if (bestMetricMatch) bestMetric = parseFloat(bestMetricMatch[1]);
          else if (accuracyMatch) bestMetric = parseFloat(accuracyMatch[1]);
          else if (lossMatch) bestMetric = parseFloat(lossMatch[1]);

          // Extract findings (look for sections like "Key Findings", "Findings", "Observations")
          const findings: string[] = [];
          const findingsMatch = summaryContent.match(/(?:Key Findings|Findings|Observations):?\n([\s\S]*?)(?=\n##|\n###|$)/i);
          if (findingsMatch) {
            const lines = findingsMatch[1].split('\n').filter((l: string) => l.trim().startsWith('- ') || l.trim().length > 0);
            lines.forEach((l: string) => {
              const trimmed = l.trim();
              if (trimmed.startsWith('- ')) findings.push(trimmed.substring(2));
              else if (trimmed.length > 0) findings.push(trimmed);
            });
          }

          // Extract suggestions for future improvements
          const suggestions: string[] = [];
          const suggestionsMatch = summaryContent.match(/(?:Suggestions|Improvements|Future Directions|Next Steps):?\n([\s\S]*?)(?=\n##|\n###|$)/i);
          if (suggestionsMatch) {
            const lines = suggestionsMatch[1].split('\n').filter((l: string) => l.trim().startsWith('- ') || l.trim().length > 0);
            lines.forEach((l: string) => {
              const trimmed = l.trim();
              if (trimmed.startsWith('- ')) suggestions.push(trimmed.substring(2));
              else if (trimmed.length > 0) suggestions.push(trimmed);
            });
          }

          completedExperiments.push({
            id: expInfo.id,
            name: expInfo.name,
            iteration: expInfo.iteration,
            summaryPath,
            summaryContent,
            bestMetric,
            findings,
            suggestions,
          });
        }

        if (completedExperiments.length === 0) {
          result += 'No completed experiments with summary found.\n\n';
          result += `Total experiments: ${experiments.length} (${experiments.filter(e => e.status !== 'completed').length} in progress or failed)\n`;
          result += `\nExperiments directory: ${this.tracker.getExperimentBaseDir()}`;
          return result;
        }

        // Experiment table
        result += `## Completed Experiments Summary\n\n`;
        result += `| Iteration | ID | Name | Best Metric |\n`;
        result += `|-----------|----|------|-------------|\n`;
        for (const exp of completedExperiments) {
          const metricStr = exp.bestMetric !== undefined ? exp.bestMetric.toFixed(4) : 'N/A';
          result += `| ${exp.iteration} | ${exp.id} | ${exp.name} | ${metricStr} |\n`;
        }
        result += '\n';

        // Find best experiment (highest metric - assuming accuracy-like where higher is better)
        const experimentsWithMetrics = completedExperiments.filter(e => e.bestMetric !== undefined);
        if (experimentsWithMetrics.length > 0) {
          const bestExperiment = experimentsWithMetrics.reduce((best, current) =>
            current.bestMetric! > best.bestMetric! ? current : best
          );
          result += `## 🏆 Best Result\n\n`;
          result += `- **Experiment**: ${bestExperiment.id} (${bestExperiment.name})\n`;
          result += `- **Iteration**: ${bestExperiment.iteration}\n`;
          result += `- **Best Metric**: ${bestExperiment.bestMetric!.toFixed(4)}\n\n`;
        }

        // Aggregate all key findings
        const allFindings: string[] = [];
        completedExperiments.forEach(exp => {
          allFindings.push(...exp.findings);
        });

        if (allFindings.length > 0) {
          result += `## 🔍 Key Findings Across Experiments\n\n`;
          allFindings.forEach((finding, idx) => {
            result += `${idx + 1}. ${finding}\n`;
          });
          result += '\n';
        }

        // Aggregate all suggestions for future directions
        const allSuggestions: string[] = [];
        completedExperiments.forEach(exp => {
          allSuggestions.push(...exp.suggestions);
        });

        if (allSuggestions.length > 0) {
          result += `## 🚀 Suggested Future Directions\n\n`;
          allSuggestions.forEach((suggestion, idx) => {
            result += `${idx + 1}. ${suggestion}\n`;
          });
          result += '\n';
        }

        // Per-experiment brief summaries
        result += `## 📋 Individual Experiment Details\n\n`;
        for (const exp of completedExperiments) {
          result += `### ${exp.id} (${exp.name})\n\n`;
          // Extract first paragraph or key section from summary
          const lines = exp.summaryContent.split('\n');
          const firstParagraph = lines.slice(0, 10).join('\n');
          // Try to get just the result/analysis section
          const resultMatch = exp.summaryContent.match(/(?:Result|Analysis|Summary):?\n([\s\S]*?)(?=\n##|$)/i);
          if (resultMatch && resultMatch[1].trim().length > 0) {
            result += resultMatch[1].trim().slice(0, 300);
            if (resultMatch[1].length > 300) result += '...';
          } else {
            result += firstParagraph.slice(0, 300);
            if (firstParagraph.length > 300) result += '...';
          }
          result += `\n\nFull summary: ${exp.summaryPath}\n\n`;
        }

        result += `---\n`;
        result += `Total completed experiments: ${completedExperiments.length}/${experiments.length}\n`;
        result += `Experiments directory: ${this.tracker.getExperimentBaseDir()}`;

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

// Export all agent configs
export * from './agents';
