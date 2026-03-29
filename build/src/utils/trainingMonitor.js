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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingMonitor = void 0;
// Long-running training process monitor
// Detached child process with file-based logging and polling
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const STATUS_FILE = '.training_status.json';
class TrainingMonitor {
    currentStatus = null;
    workingDir;
    constructor(workingDir) {
        this.workingDir = workingDir;
    }
    async startTraining(scriptPath, workingDir) {
        const logPath = path.join(workingDir, 'logs', 'training.log');
        const checkpointPath = path.join(workingDir, 'checkpoints');
        // Ensure directories exist
        await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
        await fs.promises.mkdir(checkpointPath, { recursive: true });
        // Create log file
        await fs.promises.writeFile(logPath, '');
        // Spawn detached child process
        const child = (0, child_process_1.spawn)('python', [scriptPath], {
            cwd: workingDir,
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
        });
        // Unref so parent can exit without waiting for child
        child.unref();
        const status = {
            pid: child.pid,
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
    async checkStatus(status) {
        // Check if process is still running
        let isRunning = false;
        try {
            // Signal 0 just checks if process exists
            process.kill(status.pid, 0);
            isRunning = true;
        }
        catch (e) {
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
    async parseLogFile(status) {
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
        }
        catch (e) {
            return clonedStatus;
        }
    }
    async readLastErrors(status) {
        try {
            const content = await fs.promises.readFile(status.logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            return lines.slice(-10).join('\n');
        }
        catch (e) {
            return 'Unknown error';
        }
    }
    async waitForCompletion(status, checkIntervalMs = 300000) {
        // Default check every 5 minutes
        let currentStatus = await this.checkStatus(status);
        while (currentStatus.status === 'running') {
            await this.sleep(checkIntervalMs);
            currentStatus = await this.checkStatus(currentStatus);
        }
        return currentStatus;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async stopTraining(status) {
        try {
            process.kill(status.pid, 'SIGTERM');
            status.status = 'interrupted';
            this.saveStatus(status);
            this.currentStatus = status;
        }
        catch (e) {
            // Process already gone
            status.status = 'interrupted';
            this.saveStatus(status);
        }
    }
    saveStatus(status) {
        const filePath = path.join(this.workingDir, STATUS_FILE);
        fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
    }
    loadStatus() {
        try {
            const filePath = path.join(this.workingDir, STATUS_FILE);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            this.currentStatus = JSON.parse(content);
            return this.currentStatus;
        }
        catch (e) {
            return null;
        }
    }
    getCurrentStatus() {
        return this.currentStatus;
    }
}
exports.TrainingMonitor = TrainingMonitor;
