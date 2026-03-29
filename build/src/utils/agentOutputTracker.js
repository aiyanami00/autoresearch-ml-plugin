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
exports.AgentOutputTracker = void 0;
// Agent Output Tracker - Records each subagent's work for documentation
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AgentOutputTracker {
    experimentDir;
    outputsDir;
    constructor(experimentDir) {
        this.experimentDir = experimentDir;
        this.outputsDir = path.join(experimentDir, 'agent_outputs');
        this.ensureDirectory();
    }
    ensureDirectory() {
        if (!fs.existsSync(this.outputsDir)) {
            fs.mkdirSync(this.outputsDir, { recursive: true });
        }
    }
    /**
     * Record an agent's output
     */
    recordOutput(output) {
        const filename = `${output.agentName}_${Date.now()}.json`;
        const filepath = path.join(this.outputsDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
        return filepath;
    }
    /**
     * Record agent output with simplified interface
     */
    record(agentName, input, output, toolsUsed, duration) {
        const agentOutput = {
            agentName,
            timestamp: Date.now(),
            input,
            output,
            toolsUsed,
            duration,
        };
        return this.recordOutput(agentOutput);
    }
    /**
     * Generate markdown documentation from all agent outputs
     */
    generateDocumentation() {
        if (!fs.existsSync(this.outputsDir)) {
            return '# Agent Outputs\n\nNo outputs recorded yet.\n';
        }
        const files = fs.readdirSync(this.outputsDir)
            .filter(f => f.endsWith('.json'))
            .sort();
        let md = '# Subagent Execution Documentation\n\n';
        md += `Generated: ${new Date().toLocaleString()}\n\n`;
        md += `Total Executions: ${files.length}\n\n`;
        md += '---\n\n';
        for (const file of files) {
            const content = fs.readFileSync(path.join(this.outputsDir, file), 'utf-8');
            const output = JSON.parse(content);
            md += `## ${output.agentName}\n\n`;
            md += `- **Time**: ${new Date(output.timestamp).toLocaleString()}\n`;
            md += `- **Duration**: ${output.duration.toFixed(1)}s\n`;
            md += `- **Tools Used**: ${output.toolsUsed.join(', ') || 'None'}\n\n`;
            md += `### Input\n\n\`\`\`\n${output.input.substring(0, 500)}${output.input.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
            md += `### Output\n\n${output.output.substring(0, 1000)}${output.output.length > 1000 ? '\n\n... (truncated)' : ''}\n\n`;
            md += '---\n\n';
        }
        // Write the summary
        const summaryPath = path.join(this.experimentDir, 'AGENTS.md');
        fs.writeFileSync(summaryPath, md);
        return summaryPath;
    }
    /**
     * List all recorded outputs
     */
    listOutputs() {
        if (!fs.existsSync(this.outputsDir)) {
            return [];
        }
        const files = fs.readdirSync(this.outputsDir)
            .filter(f => f.endsWith('.json'))
            .sort();
        return files.map(file => {
            const content = fs.readFileSync(path.join(this.outputsDir, file), 'utf-8');
            return JSON.parse(content);
        });
    }
    /**
     * Get outputs for a specific agent
     */
    getAgentOutputs(agentName) {
        return this.listOutputs().filter(o => o.agentName === agentName);
    }
}
exports.AgentOutputTracker = AgentOutputTracker;
