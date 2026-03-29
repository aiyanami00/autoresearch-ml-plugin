// Long-running training process monitor
// Detached child process with file-based logging and polling
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { TrainingStatus } from '../types';

const STATUS_FILE = '.training_status.json';

export class TrainingMonitor {
  private currentStatus: TrainingStatus | null = null;
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  async startTraining(scriptPath: string, workingDir: string): Promise<TrainingStatus> {
    const logPath = path.join(workingDir, 'log', 'training.log');
    const checkpointPath = path.join(workingDir, 'output', 'checkpoints');

    // Ensure directories exist
    await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
    await fs.promises.mkdir(checkpointPath, { recursive: true });

    // Create log file
    await fs.promises.writeFile(logPath, '');

    // Spawn detached child process
    const child = spawn('python', [scriptPath], {
      cwd: workingDir,
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    // Unref so parent can exit without waiting for child
    child.unref();

    const status: TrainingStatus = {
      pid: child.pid!,
      logPath,
      checkpointPath,
      currentEpoch: 0,
      maxEpochs: 0, // Will be parsed from log
      currentLoss: Infinity,
      bestLoss: Infinity,
      status: 'running',
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
    };

    this.currentStatus = status;
    this.saveStatus(status);

    return status;
  }

  async checkStatus(status: TrainingStatus): Promise<TrainingStatus> {
    // Check if process is still running
    let isRunning = false;
    try {
      // Signal 0 just checks if process exists
      process.kill(status.pid, 0);
      isRunning = true;
    } catch (e) {
      isRunning = false;
    }

    // Read and parse log file for latest metrics
    const parsedStatus = await this.parseLogFile(status);

    if (!isRunning && parsedStatus.status === 'running') {
      // Process exited unexpectedly
      const error = await this.readLastErrors(status);
      parsedStatus.status = 'failed';
      parsedStatus.error = `Process exited unexpectedly. Last error: ${error}`;
    }

    parsedStatus.lastUpdateTime = Date.now();
    this.currentStatus = parsedStatus;
    this.saveStatus(parsedStatus);

    return parsedStatus;
  }

  private async parseLogFile(status: TrainingStatus): Promise<TrainingStatus> {
    const clonedStatus = { ...status };

    try {
      const content = await fs.promises.readFile(clonedStatus.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      // Look for epoch patterns: [Epoch X/Y]
      const epochRegex = /\[Epoch\s+(\d+)\/(\d+)\]/i;
      const lossRegex = /Loss[:]\s*([\d.]+)/i;
      const completedRegex = /Training completed|finished|done/i;

      let currentEpoch = clonedStatus.currentEpoch;
      let maxEpochs = clonedStatus.maxEpochs;
      let currentLoss = clonedStatus.currentLoss;

      for (const line of lines.slice(-50)) {
        const epochMatch = line.match(epochRegex);
        if (epochMatch) {
          currentEpoch = parseInt(epochMatch[1], 10);
          maxEpochs = parseInt(epochMatch[2], 10);
        }

        const lossMatch = line.match(lossRegex);
        if (lossMatch) {
          currentLoss = parseFloat(lossMatch[1]);
        }

        if (completedRegex.test(line)) {
          clonedStatus.status = 'completed';
        }
      }

      clonedStatus.currentEpoch = currentEpoch;
      clonedStatus.maxEpochs = maxEpochs;
      clonedStatus.currentLoss = currentLoss;

      if (currentLoss < clonedStatus.bestLoss) {
        clonedStatus.bestLoss = currentLoss;
      }

      // Check if all epochs done
      if (maxEpochs > 0 && currentEpoch >= maxEpochs) {
        clonedStatus.status = 'completed';
      }

      return clonedStatus;
    } catch (e) {
      return clonedStatus;
    }
  }

  private async readLastErrors(status: TrainingStatus): Promise<string> {
    try {
      const content = await fs.promises.readFile(status.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      return lines.slice(-10).join('\n');
    } catch (e) {
      return 'Unknown error';
    }
  }

  async waitForCompletion(status: TrainingStatus, checkIntervalMs: number = 300000): Promise<TrainingStatus> {
    // Default check every 5 minutes
    let currentStatus = await this.checkStatus(status);

    while (currentStatus.status === 'running') {
      await this.sleep(checkIntervalMs);
      currentStatus = await this.checkStatus(currentStatus);
    }

    return currentStatus;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stopTraining(status: TrainingStatus): Promise<void> {
    try {
      process.kill(status.pid, 'SIGTERM');
      status.status = 'interrupted';
      this.saveStatus(status);
      this.currentStatus = status;
    } catch (e) {
      // Process already gone
      status.status = 'interrupted';
      this.saveStatus(status);
    }
  }

  saveStatus(status: TrainingStatus): void {
    const filePath = path.join(this.workingDir, STATUS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
  }

  loadStatus(): TrainingStatus | null {
    try {
      const filePath = path.join(this.workingDir, STATUS_FILE);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      this.currentStatus = JSON.parse(content);
      return this.currentStatus;
    } catch (e) {
      return null;
    }
  }

  getCurrentStatus(): TrainingStatus | null {
    return this.currentStatus;
  }
}
