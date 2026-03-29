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
}

export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
}

export interface SubAgentConfig {
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

// Experiment Board - Kanban-style tracking for research decisions
export interface ExperimentEntry {
  id: string;
  iteration: number;
  timestamp: number;
  status: 'completed' | 'failed' | 'abandoned';

  // What was tried
  method: string;           // Brief description of approach
  modelArchitecture: string; // Key architecture details
  keyTechniques: string[];   // List of techniques used

  // Results
  bestMetric: number;
  metricName: string;        // e.g., "accuracy", "f1", "loss"
  metricDirection: 'max' | 'min';
  trainingDuration: number;  // minutes

  // Analysis
  findings: string[];        // What worked/didn't work
  problems: string[];        // Specific issues encountered

  // Comparison with previous
  improvement: number;       // Change from previous best (absolute or %)
  isPromising: boolean;      // Whether this direction is worth continuing
}

export interface ResearchDirection {
  id: string;
  name: string;              // e.g., "CNN-based approach", "Transformer approach"
  description: string;
  status: 'active' | 'abandoned' | 'completed';
  experiments: string[];     // Experiment IDs in this direction
  bestResult: number;
  consecutiveFailures: number;
  lastExperimentAt: number;
}

export interface ExperimentBoard {
  version: string;
  createdAt: number;
  updatedAt: number;

  // Overall tracking
  totalExperiments: number;
  currentDirection: string | null;
  directions: ResearchDirection[];

  // Sequential history
  entries: ExperimentEntry[];

  // Global best
  bestExperimentId: string | null;
  bestMetric: number;
  metricDirection: 'max' | 'min';

  // Research constraints
  webSearchUsed: number;     // Track WebSearch calls (max 5)
  webFetchUsed: number;      // Track WebFetch calls (max 5)
}

// Agent output documentation
export interface AgentOutput {
  agentName: string;
  timestamp: number;
  input: string;
  output: string;
  toolsUsed: string[];
  duration: number;          // seconds
}
