// Export all agent configurations
import understanding from './understanding';
import researcher from './researcher';
import evaluator from './evaluator';
import coder from './coder';
import trainer from './trainer';
import recorder from './recorder';
import type { SubAgentConfig } from '../types';

export const agentConfigs = {
  understanding,
  researcher,
  evaluator,
  coder,
  trainer,
  recorder,
};

// Export as array
export const allAgents: SubAgentConfig[] = [
  understanding,
  researcher,
  evaluator,
  coder,
  trainer,
  recorder,
];

export {
  understanding,
  researcher,
  evaluator,
  coder,
  trainer,
  recorder,
};
