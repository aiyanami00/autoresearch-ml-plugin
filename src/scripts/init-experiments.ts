#!/usr/bin/env node
// AutoResearch initialization script
// Creates the experiments directory structure in the current working directory

import * as fs from 'fs';
import * as path from 'path';
import { ExperimentTracker } from '../utils/experimentTracker';

console.log('Initializing AutoResearch experiment environment...\n');

// Initialize ExperimentTracker which automatically creates directories
const baseDir = process.cwd();
const tracker = new ExperimentTracker(path.join(baseDir, 'experiments'));

// Verify creation
const experimentsDir = path.join(baseDir, 'experiments');
const logPath = path.join(experimentsDir, 'experiment_log.jsonl');

if (fs.existsSync(experimentsDir) && fs.existsSync(logPath)) {
  console.log('✓ Success! AutoResearch experiment environment initialized.');
  console.log(`  Base directory: ${experimentsDir}`);
  console.log(`  Experiment log: ${logPath}`);
  console.log('\nYou can now start an experiment with `/autoresearch` command.');
  process.exit(0);
} else {
  console.error('✗ Error: Failed to create experiment directory structure.');
  console.error(`  Check permissions in: ${baseDir}`);
  process.exit(1);
}
