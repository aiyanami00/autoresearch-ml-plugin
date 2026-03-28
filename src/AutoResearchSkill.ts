// Main AutoResearch orchestration skill
// Implements the full iterative multi-agent workflow
import * as path from 'path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  Experiment,
  ExperimentPlan,
  ExperimentResult,
  EvaluationResult,
  RefinementOutcome,
  AutoResearchConfig,
  ExperimentSpecification,
} from './types';
import { ExperimentTracker } from './utils/experimentTracker';
import { TrainingMonitor } from './utils/trainingMonitor';
import { agentConfigs } from './agents';

export class AutoResearchSkill {
  private config: AutoResearchConfig;
  private tracker: ExperimentTracker;

  constructor(config: AutoResearchConfig) {
    this.config = config;
    this.tracker = new ExperimentTracker();
  }

  async run(queryFn: typeof query): Promise<string> {
    console.log(`Starting AutoResearch: ${this.config.task}`);
    console.log(`Max iterations: ${this.config.maxIterations}`);

    let finalSummary = `# AutoResearch Experiment: ${this.config.experimentName}\n\n`;
    finalSummary += `**Task**: ${this.config.task}\n`;
    finalSummary += `**Dataset**: ${this.config.datasetPath}\n`;
    finalSummary += `**Max Iterations**: ${this.config.maxIterations}\n\n`;
    finalSummary += `---\n\n`;

    // Step 0: Understanding - create experiment and get specification
    const experiment = this.tracker.createExperiment(
      this.config.task,
      this.config.datasetPath,
      1,
      this.config.experimentName
    );

    finalSummary += `### Step 0: Task Understanding\n\n`;

    try {
      // Get formal specification from Understanding Agent
      const specification = await this.getSpecification(queryFn, experiment);
      experiment.specification = specification;
      await this.tracker.saveSpecification(experiment, specification);
      console.log(`Formal specification created: ${specification.taskDescription}`);

      finalSummary += `Specification completed and saved to specification.md\n\n`;
      finalSummary += `**Task**: ${specification.taskDescription}\n`;
      finalSummary += `**Objective**: ${specification.trainingObjective}\n\n`;
      finalSummary += `---\n\n`;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      experiment.status = 'failed';
      finalSummary += `**FAILED**: ${errorMessage}\n\n---\n\n`;
      console.error(`Specification failed:`, errorMessage);
      return finalSummary;
    }

    for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
      console.log(`Starting iteration ${iteration}/${this.config.maxIterations}`);

      const currentExperiment = this.tracker.createExperiment(
        this.config.task,
        this.config.datasetPath,
        iteration,
        this.config.experimentName
      );

      // Copy specification to current iteration
      currentExperiment.specification = experiment.specification;

      finalSummary += `## Iteration ${iteration}: ${currentExperiment.id}\n\n`;

      try {
        // Step 1: Research-Evaluate loop (continue until approved)
        const plan = await this.researchEvaluateLoop(queryFn, currentExperiment);
        currentExperiment.plan = plan;
        currentExperiment.status = 'planning';
        await this.tracker.savePlan(currentExperiment, plan);
        console.log(`Plan approved for iteration ${iteration}`);

        // Step 2: Coder writes the code
        experiment.status = 'coding';
        const code = await this.writeCode(queryFn, experiment, plan);
        console.log(`Code written for iteration ${iteration}`);

        // Step 3: Trainer launches and monitors training
        experiment.status = 'training';
        const result = await this.runAndMonitorTraining(experiment, code);
        await this.tracker.saveResult(experiment, result);
        console.log(`Training completed for iteration ${iteration}, status: ${experiment.status}`);

        // Step 4: Recorder writes summary and suggests improvements
        const summary = await this.recordAndAnalyze(queryFn, experiment, result);
        await this.tracker.writeSummary(experiment, summary);

        // Commit to git
        await this.tracker.commitExperiment(experiment);

        finalSummary += this.formatIterationResult(experiment, result);
        finalSummary += `\n${summary}\n\n---\n\n`;

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        experiment.status = 'failed';
        finalSummary += `**FAILED**: ${errorMessage}\n\n---\n\n`;
        console.error(`Iteration ${iteration} failed:`, errorMessage);
      }
    }

    finalSummary += this.finalSummary(this.tracker.listExperiments().filter(e => e.iteration <= this.config.maxIterations));

    return finalSummary;
  }

  private async getSpecification(queryFn: typeof query, experiment: Experiment): Promise<ExperimentSpecification> {
    const understandingConfig = agentConfigs.understanding;

    const prompt = `We need to create a formal experiment specification for this machine learning task.

Raw user request: ${experiment.task}
Dataset path: ${experiment.datasetPath}

Please follow this process:
1. AUTOMATIC EXPLORATION: Use Glob to explore the dataset directory structure, find all files, and inspect sample data files to understand the data format, splits, input/output shapes.
2. ANALYZE EXISTING CODE (if any exists in the current repository or dataset directory): Find Python files, extract coding style, data processing patterns, and evaluation conventions. Ignore specific model architectures and training methods.
3. Identify what is still unclear after exploration.
4. Ask specific clarification questions using AskUserQuestion if anything is still unclear.
5. When everything is clear, write the complete formal specification as markdown including:
   - Task Description
   - Dataset Structure (what you discovered from exploration)
   - Input/Output format (discovered shapes and types)
   - Training Objective (what metric to optimize)
   - Coding Requirements (including any extracted coding conventions from existing code)
   - Extracted Patterns (data processing and evaluation patterns from existing code, if any)
   - Overall Research Direction
   - Any clarifications that were made

Save the final specification as specification.md in the experiment directory: ${experiment.baseDir}/specification.md`;

    let result = '';
    for await (const message of queryFn({
      prompt,
      options: {
        allowedTools: understandingConfig.tools,
      },
    })) {
      if ('result' in message) {
        result += message.result;
      }
    }

    // Parse the specification from the result
    // Since understanding agent writes it to file, we can read it back
    const specPath = path.join(experiment.baseDir, 'specification.md');
    const content = await require('fs').promises.readFile(specPath, 'utf-8');

    // Parse into structured specification
    const spec: ExperimentSpecification = {
      taskDescription: experiment.task,
      datasetPath: experiment.datasetPath,
      inputFormat: '',
      outputFormat: '',
      trainingObjective: '',
      codingRequirements: 'Use PyTorch',
      researchDirection: '',
      extractedPatterns: '',
      clarifications: {},
    };

    // Try to parse extracted fields from markdown content
    const inputMatch = content.match(/Input.*format:?\s*([^\n]+)/i);
    const outputMatch = content.match(/Output.*format:?\s*([^\n]+)/i);
    const objectiveMatch = content.match(/Training.*objective:?\s*([^\n]+)/i);
    const requirementsMatch = content.match(/Coding.*requirements:?\s*([^\n]+)/i);
    const directionMatch = content.match(/Research.*direction:?\s*([^\n]+)/i);
    const patternsMatch = content.match(/Extracted.*patterns:?\s*([\s\S]+?)(?=\n\S+:|$)/i);

    if (inputMatch) spec.inputFormat = inputMatch[1].trim();
    if (outputMatch) spec.outputFormat = outputMatch[1].trim();
    if (objectiveMatch) spec.trainingObjective = objectiveMatch[1].trim();
    if (requirementsMatch) spec.codingRequirements = requirementsMatch[1].trim();
    if (directionMatch) spec.researchDirection = directionMatch[1].trim();
    if (patternsMatch) spec.extractedPatterns = patternsMatch[1].trim();

    return spec;
  }

  private async researchEvaluateLoop(queryFn: typeof query, experiment: Experiment): Promise<ExperimentPlan> {
    const researcherConfig = agentConfigs.researcher;
    const evaluatorConfig = agentConfigs.evaluator;

    let currentPlan = '';
    let feedback = '';

    while (true) {
      // Researcher generates/improves plan
      const researchPrompt = this.buildResearchPrompt(experiment, feedback);
      console.log(`Researcher working...`);

      let researchResult = '';
      for await (const message of queryFn({
        prompt: researchPrompt,
        options: {
          allowedTools: researcherConfig.tools,
        },
      })) {
        if ('result' in message) {
          researchResult += message.result;
        }
      }

      currentPlan = researchResult;

      // Evaluator evaluates
      console.log(`Evaluator reviewing...`);
      const evalPrompt = this.buildEvalPrompt(currentPlan);
      let evalResult = '';

      for await (const message of queryFn({
        prompt: evalPrompt,
        options: {
          allowedTools: evaluatorConfig.tools,
        },
      })) {
        if ('result' in message) {
          evalResult += message.result;
        }
      }

      const evaluation = this.parseEvaluation(evalResult);

      if (evaluation.outcome === RefinementOutcome.APPROVED) {
        console.log('Plan approved');
        return this.parsePlan(currentPlan);
      }

      console.log(`Plan rejected: ${evaluation.feedback.slice(0, 100)}...`);
      feedback = evaluation.feedback;
    }
  }

  private buildResearchPrompt(experiment: Experiment, feedback: string): string {
    let prompt = `I need you to research and create a machine learning plan for this task.\n\n`;
    prompt += `## Formal Experiment Specification\n\n`;
    prompt += `**Task Description**: ${experiment.specification?.taskDescription || experiment.task}\n`;
    prompt += `**Dataset Path**: ${experiment.datasetPath}\n`;
    if (experiment.specification?.inputFormat) {
      prompt += `**Input Format**: ${experiment.specification.inputFormat}\n`;
    }
    if (experiment.specification?.outputFormat) {
      prompt += `**Output Format**: ${experiment.specification.outputFormat}\n`;
    }
    if (experiment.specification?.trainingObjective) {
      prompt += `**Training Objective**: ${experiment.specification.trainingObjective}\n`;
    }
    if (experiment.specification?.codingRequirements) {
      prompt += `**Coding Requirements**: ${experiment.specification.codingRequirements}\n`;
    }
    if (experiment.specification?.researchDirection) {
      prompt += `**Research Direction**: ${experiment.specification.researchDirection}\n`;
    }
    if (experiment.specification?.extractedPatterns) {
      prompt += `\n**Extracted Patterns from Existing Code**:\n${experiment.specification.extractedPatterns}\n\nFollow these coding and data processing conventions when implementing.\n`;
    }
    prompt += `\n**Iteration**: ${experiment.iteration}\n\n`;

    if (feedback) {
      prompt += `Previous plan was rejected. Here is the feedback to address:\n${feedback}\n\n`;
    }

    prompt += `Search for recent (last 3-5 years) papers from top conferences (NeurIPS, ICML, ICLR, CVPR, Nature) that address this task. Find the official GitHub repository if possible, clone it, and inspect the code. Then provide a complete plan that follows the specification above including:\n\n`;
    prompt += `1. Selected method with paper citation and URL\n`;
    prompt += `2. GitHub repository URL\n`;
    prompt += `3. Model architecture details\n`;
    prompt += `4. Training strategy (optimizer, lr, batch size, epochs)\n`;
    prompt += `5. Data preprocessing steps\n\n`;
    prompt += `Format your answer so I can clearly extract each section.`;

    return prompt;
  }

  private buildEvalPrompt(plan: string): string {
    return `Please evaluate this machine learning research plan. Check for completeness, feasibility, and potential issues.

${plan}

Your response must follow this format exactly:
---
OUTCOME: [APPROVED or REJECTED]
FEEDBACK: <your detailed feedback>
---`;
  }

  private parseEvaluation(output: string): EvaluationResult {
    // Look for OUTCOME
    const outcomeMatch = output.match(/OUTCOME:\s*(APPROVED|REJECTED)/i);
    const feedbackMatch = output.match(/FEEDBACK:\s*([\s\S]*)/);

    const outcome = outcomeMatch?.[1]?.toLowerCase() === 'approved'
      ? RefinementOutcome.APPROVED
      : RefinementOutcome.REJECTED;

    const feedback = feedbackMatch?.[1]?.trim() || 'No feedback provided';

    return { outcome, feedback };
  }

  private parsePlan(researchOutput: string): ExperimentPlan {
    // Basic parsing - extract references and structure
    const references: ExperimentPlan['references'] = [];

    // Try to find paper info
    const paperRegex = /(?:^|\W)(https?:\/\/[^\s]+\.pdf[^\s]*)/g;
    let match;
    while ((match = paperRegex.exec(researchOutput)) !== null) {
      references.push({
        title: 'Paper',
        authors: '',
        venue: '',
        year: new Date().getFullYear(),
        url: match[1],
      });
    }

    // Try to find GitHub
    const githubRegex = /(https:\/\/github\.com[^\s]+)/g;
    while ((match = githubRegex.exec(researchOutput)) !== null) {
      const githubUrl = match[1];
      // Add or update last reference
      if (references.length > 0) {
        references[references.length - 1].githubUrl = githubUrl;
      } else {
        references.push({
          title: 'GitHub Repository',
          authors: '',
          venue: '',
          year: new Date().getFullYear(),
          url: githubUrl,
          githubUrl,
        });
      }
    }

    return {
      taskDescription: this.config.task,
      datasetPath: this.config.datasetPath,
      modelArchitecture: researchOutput,
      trainingStrategy: researchOutput,
      preprocessing: researchOutput,
      references,
    };
  }

  private async writeCode(queryFn: typeof query, experiment: Experiment, plan: ExperimentPlan): Promise<string> {
    const coderConfig = agentConfigs.coder;

    let prompt = `Write the PyTorch training code for this experiment.

## Experiment Specification
**Task**: ${experiment.specification?.taskDescription || experiment.task}
**Dataset Path**: ${experiment.datasetPath}
**Input Format**: ${experiment.specification?.inputFormat || 'Not specified'}
**Output Format**: ${experiment.specification?.outputFormat || 'Not specified'}
**Coding Requirements**: ${experiment.specification?.codingRequirements || 'Use PyTorch'}
`;

    if (experiment.specification?.extractedPatterns) {
      prompt += `
## Extracted Patterns from User's Existing Code
Follow these coding conventions, data processing patterns, and evaluation patterns:
${experiment.specification.extractedPatterns}

Your code MUST follow these conventions.
`;
    }

    prompt += `
## Approved Plan
${JSON.stringify(plan, null, 2)}

You need to write:
1. train.py - main training script with full training loop, logging to logs/training.log, checkpoint saving
2. model.py - model definition

Write everything to files in ${experiment.baseDir}/code/

Every epoch must print progress in this format: "[Epoch X/Y] Loss: value" so the monitor can parse it. Print "Training completed" when done.
Ensure all imports are correct and the code is runnable. Follow the extracted coding conventions from above.`;

    let result = '';
    for await (const message of queryFn({
      prompt,
      options: {
        allowedTools: coderConfig.tools,
      },
    })) {
      if ('result' in message) {
        result += message.result;
      }
    }

    return result;
  }

  private async runAndMonitorTraining(experiment: Experiment, codePath: string): Promise<ExperimentResult> {
    const trainScriptPath = path.join(experiment.baseDir, 'code', 'train.py');
    const monitor = new TrainingMonitor(experiment.baseDir);

    const status = await monitor.startTraining(trainScriptPath, experiment.baseDir);
    console.log(`Training started, PID: ${status.pid}`);

    // Wait for completion with polling
    const finalStatus = await monitor.waitForCompletion(status, this.config.checkIntervalMs);

    return {
      finalLoss: finalStatus.currentLoss,
      bestLoss: finalStatus.bestLoss,
      epochCompleted: finalStatus.currentEpoch,
      trainingTimeSeconds: (Date.now() - finalStatus.startTime) / 1000,
      error: finalStatus.error,
    };
  }

  private async recordAndAnalyze(queryFn: typeof query, experiment: Experiment, result: ExperimentResult): Promise<string> {
    const recorderConfig = agentConfigs.recorder;

    const prompt = `Write an analysis summary for this experiment.

Experiment:
- Task: ${experiment.task}
- Plan: ${JSON.stringify(experiment.plan, null, 2)}
- Result: ${JSON.stringify(result, null, 2)}

Write a markdown summary that includes:
1. Overview of what was done
2. Final results and metrics
3. Analysis of why it succeeded or failed
4. 2-4 concrete, actionable suggestions for improvement in the next iteration

Be specific about what to change. Save this summary to the experiment directory.`;

    let summary = '';
    for await (const message of queryFn({
      prompt,
      options: {
        allowedTools: recorderConfig.tools,
      },
    })) {
      if ('result' in message) {
        summary += message.result;
      }
    }

    return summary;
  }

  private formatIterationResult(experiment: Experiment, result: ExperimentResult): string {
    let str = `**Status**: ${experiment.status}\n`;
    str += `**Final Loss**: ${result.finalLoss.toFixed(4)}\n`;
    str += `**Best Loss**: ${result.bestLoss.toFixed(4)}\n`;
    str += `**Epochs Completed**: ${result.epochCompleted}\n`;
    str += `**Training Time**: ${(result.trainingTimeSeconds / 60).toFixed(1)} minutes\n`;
    if (result.error) {
      str += `**Error**: ${result.error}\n`;
    }
    return str;
  }

  private finalSummary(experiments: Experiment[]): string {
    let summary = `## Final Summary\n\n`;

    const completed = experiments.filter(e => e.status === 'completed');
    const failed = experiments.filter(e => e.status === 'failed');

    summary += `**Total Iterations**: ${experiments.length}\n`;
    summary += `**Completed**: ${completed.length}\n`;
    summary += `**Failed**: ${failed.length}\n\n`;

    if (completed.length > 0) {
      const best = completed.reduce((prev, curr) => {
        const bestLoss = curr.result?.bestLoss ?? Infinity;
        const prevBest = prev.result?.bestLoss ?? Infinity;
        return bestLoss < prevBest ? curr : prev;
      });

      summary += `**Best Result**: Iteration ${best.iteration} (${best.id})\n`;
      if (best.result) {
        summary += `**Best Loss**: ${best.result.bestLoss.toFixed(4)}\n`;
      }
      summary += `**Experiment Directory**: ${best.baseDir}\n`;
    }

    summary += `\nAll experiments are stored in: ${this.tracker.getExperimentBaseDir()}\n`;

    return summary;
  }
}

// Export all agent configs
export * from './agents';
