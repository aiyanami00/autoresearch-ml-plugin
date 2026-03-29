// Persistent experiment tracking
// Stores all experiments with their plans, code, results
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { Experiment, ExperimentPlan, ExperimentResult, ExperimentSpecification } from '../types';
import { GitHelper } from './gitHelper';

const EXPERIMENT_LOG = 'experiment_log.jsonl';

export class ExperimentTracker {
  private baseDir: string;
  private gitHelper: GitHelper;
  private initialized: boolean = false;

  constructor(baseDir: string = path.join(process.cwd(), 'experiments')) {
    this.baseDir = baseDir;
    this.gitHelper = new GitHelper(process.cwd());
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    // Ensure log file exists
    const logPath = path.join(this.baseDir, EXPERIMENT_LOG);
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }

    this.initialized = true;
  }

  createExperiment(task: string, datasetPath: string, iteration: number, name?: string): Experiment {
    // Lazy initialize - only create base directory when actually needed
    this.ensureInitialized();

    // Simple incrementing naming: experiment01, experiment02, etc.
    const experiments = this.listExperiments();
    const nextNumber = experiments.length + 1;
    const experimentId = `experiment${nextNumber.toString().padStart(2, '0')}`;

    const timestamp = Date.now();
    const experimentDir = path.join(this.baseDir, experimentId);
    fs.mkdirSync(experimentDir, { recursive: true });

    // Create standard subdirectories as requested
    fs.mkdirSync(path.join(experimentDir, 'src'));      // Source code
    fs.mkdirSync(path.join(experimentDir, 'plan'));     // Planning documents
    fs.mkdirSync(path.join(experimentDir, 'log'));       // Training logs
    fs.mkdirSync(path.join(experimentDir, 'output'));    // Output results/models
    fs.mkdirSync(path.join(experimentDir, 'references'));// Cloned reference code

    const experiment: Experiment = {
      id: experimentId,
      name: name || experimentId,
      task,
      datasetPath,
      iteration,
      timestamp,
      specification: null,
      plan: null,
      status: 'specifying',
      result: null,
      baseDir: experimentDir,
    };

    this.saveExperiment(experiment);
    this.appendToLog(experiment);

    return experiment;
  }

  async saveSpecification(experiment: Experiment, specification: ExperimentSpecification): Promise<void> {
    experiment.specification = specification;
    experiment.status = 'planning';

    // Save as markdown for easy reading in plan directory
    const specPath = path.join(experiment.baseDir, 'plan', 'specification.md');
    const markdown = this.specificationToMarkdown(specification);
    await fs.promises.writeFile(specPath, markdown);

    // Save as JSON for machine reading
    const configPath = path.join(experiment.baseDir, 'config.json');
    await fs.promises.writeFile(configPath, JSON.stringify({
      ...experiment,
      specification,
    }, null, 2));

    this.saveExperiment(experiment);
  }

  private specificationToMarkdown(spec: ExperimentSpecification): string {
    let md = `# Experiment Specification\n\n## Task Description\n${spec.taskDescription}\n\n`;
    md += `## Dataset Path\n${spec.datasetPath}\n\n`;
    md += `## Input Format\n${spec.inputFormat}\n\n`;
    md += `## Output Format\n${spec.outputFormat}\n\n`;
    md += `## Training Objective\n${spec.trainingObjective}\n\n`;
    md += `## Coding Requirements\n${spec.codingRequirements}\n\n`;
    md += `## Research Direction\n${spec.researchDirection}\n\n`;

    if (Object.keys(spec.clarifications).length > 0) {
      md += `## Clarifications\n\n`;
      Object.entries(spec.clarifications).forEach(([question, answer]) => {
        md += `- **${question}**: ${answer}\n`;
      });
      md += '\n';
    }

    return md;
  }

  async savePlan(experiment: Experiment, plan: ExperimentPlan): Promise<void> {
    experiment.plan = plan;

    // Save as pretty markdown for easy reading in plan directory
    const planPath = path.join(experiment.baseDir, 'plan', 'plan.md');
    const markdown = this.planToMarkdown(plan);
    await fs.promises.writeFile(planPath, markdown);

    // Save as JSON for machine reading
    const configPath = path.join(experiment.baseDir, 'config.json');
    await fs.promises.writeFile(configPath, JSON.stringify({
      ...experiment,
      plan,
    }, null, 2));

    this.saveExperiment(experiment);
  }

  async saveResult(experiment: Experiment, result: ExperimentResult): Promise<void> {
    experiment.result = result;
    experiment.status = result.error ? 'failed' : 'completed';

    const resultsPath = path.join(experiment.baseDir, 'output', 'metrics.json');
    await fs.promises.writeFile(resultsPath, JSON.stringify(result, null, 2));

    this.saveExperiment(experiment);
  }

  async writeCode(experiment: Experiment, filename: string, code: string): Promise<string> {
    const codePath = path.join(experiment.baseDir, 'src', filename);
    await fs.promises.writeFile(codePath, code);
    return codePath;
  }

  async writeSummary(experiment: Experiment, summary: string): Promise<void> {
    const summaryPath = path.join(experiment.baseDir, 'summary.md');
    await fs.promises.writeFile(summaryPath, summary);
  }

  private saveExperiment(experiment: Experiment): void {
    const indexPath = path.join(experiment.baseDir, 'experiment.json');
    fs.writeFileSync(indexPath, JSON.stringify(experiment, null, 2));
  }

  private appendToLog(experiment: Experiment): void {
    const logPath = path.join(this.baseDir, EXPERIMENT_LOG);
    const line = JSON.stringify({
      id: experiment.id,
      name: experiment.name,
      iteration: experiment.iteration,
      timestamp: experiment.timestamp,
      task: experiment.task,
      status: experiment.status,
    }) + '\n';
    fs.appendFileSync(logPath, line);
  }

  private planToMarkdown(plan: ExperimentPlan): string {
    let md = `# Experiment Plan\n\n## Task Description\n${plan.taskDescription}\n\n`;
    md += `## Dataset\n${plan.datasetPath}\n\n`;
    md += `## Model Architecture\n${plan.modelArchitecture}\n\n`;
    md += `## Training Strategy\n${plan.trainingStrategy}\n\n`;
    md += `## Preprocessing\n${plan.preprocessing}\n\n`;

    if (plan.references.length > 0) {
      md += `## References\n\n`;
      plan.references.forEach(ref => {
        md += `- **${ref.title}** (${ref.venue} ${ref.year})  \n`;
        md += `  ${ref.url}  \n`;
        if (ref.githubUrl) {
          md += `  GitHub: ${ref.githubUrl}\n`;
        }
        md += '\n';
      });
    }

    if (plan.githubClonedPath) {
      md += `\n## Cloned Reference Code\n${plan.githubClonedPath}\n\n`;
    }

    return md;
  }

  listExperiments(): Experiment[] {
    const logPath = path.join(this.baseDir, EXPERIMENT_LOG);
    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);
    return lines.map(line => JSON.parse(line));
  }

  getExperiment(experimentId: string): Experiment | null {
    const experimentDir = path.join(this.baseDir, experimentId);
    const indexPath = path.join(experimentDir, 'experiment.json');
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  }

  async commitExperiment(experiment: Experiment): Promise<boolean> {
    const message = `Add experiment ${experiment.id}: ${experiment.task.slice(0, 50)}...`;
    return await this.gitHelper.autoCommitExperiment(experiment.baseDir, message);
  }

  /**
   * Append experiment result to global result.csv file
   */
  appendResultToGlobalCSV(experiment: Experiment, bestMetric: number, metricDirection: 'max' | 'min', durationMinutes: number): void {
    this.ensureInitialized();
    const csvPath = path.join(this.baseDir, 'result.csv');

    // Create header if file doesn't exist
    if (!fs.existsSync(csvPath)) {
      const header = 'experiment_id,timestamp,method,best_metric_value,metric_direction,status,duration_minutes\n';
      fs.writeFileSync(csvPath, header);
    }

    // Get method description from plan if available
    let method = 'unknown';
    if (experiment.plan && experiment.plan.modelArchitecture) {
      // Extract first line or short description
      method = experiment.plan.modelArchitecture.split('\n')[0].slice(0, 100).replace(/,/g, ';');
    }

    const timestampStr = new Date(experiment.timestamp).toISOString();
    const status = experiment.status;
    const line = `${experiment.id},${timestampStr},"${method}",${bestMetric},${metricDirection},${status},${durationMinutes.toFixed(1)}\n`;

    fs.appendFileSync(csvPath, line);
  }

  getExperimentBaseDir(): string {
    return this.baseDir;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }
}
