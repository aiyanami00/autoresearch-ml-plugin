// Export all agent configurations
import understanding from './understanding';
import researcher from './researcher';
import evaluator from './evaluator';
import coder from './coder';
import trainer from './trainer';
import recorder from './recorder';
import type { SubAgentConfig } from '../MultiAgentSkill';

export const agentConfigs = {
  understanding,
  researcher,
  evaluator,
  coder,
  trainer,
  recorder,
};

// Export as array for MultiAgentSkill
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
