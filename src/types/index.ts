// Type definitions for AutoResearch plugin

export interface ExperimentSpecification {
  taskDescription: string;
  datasetPath: string;
  inputFormat: string;
  outputFormat: string;
  trainingObjective: string;
  codingRequirements: string;
  researchDirection: string;
  extractedPatterns: string; // Extracted coding, data processing, evaluation patterns from existing code
  clarifications: Record<string, string>;
}

export interface TrainingStatus {
  pid: number;
  logPath: string;
  checkpointPath: string;
  currentEpoch: number;
  maxEpochs: number;
  currentLoss: number;
  bestLoss: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
  startTime: number;
  lastUpdateTime: number;
  error?: string;
}

export interface PaperReference {
  title: string;
  authors: string;
  venue: string; // NeurIPS/CVPR/ICLR/Nature etc.
  year: number;
  url: string;
  githubUrl?: string;
}

export interface ExperimentPlan {
  taskDescription: string;
  datasetPath: string;
  modelArchitecture: string;
  trainingStrategy: string;
  preprocessing: string;
  references: PaperReference[];
  githubClonedPath?: string;
}

export interface ExperimentResult {
  finalLoss: number;
  bestLoss: number;
  accuracy?: number;
  epochCompleted: number;
  trainingTimeSeconds: number;
  error?: string;
}

export interface Experiment {
  id: string;
  name: string;
  task: string;
  datasetPath: string;
  iteration: number;
  timestamp: number;
  specification: ExperimentSpecification | null;
  plan: ExperimentPlan | null;
  status: 'specifying' | 'planning' | 'coding' | 'training' | 'completed' | 'failed';
  result: ExperimentResult | null;
  baseDir: string;
}

export interface AutoResearchConfig {
  task?: string;
  datasetPath?: string;
  maxIterations: number;
  experimentName: string;
  checkIntervalMs: number;
  action?: 'start' | 'status' | 'stop' | 'list';
  experimentId?: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
}

export enum RefinementOutcome {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface EvaluationResult {
  outcome: RefinementOutcome;
  feedback: string;
}

export interface ImprovementSuggestion {
  analysis: string;
  suggestions: string[];
}
