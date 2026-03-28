#!/usr/bin/env node
"use strict";
// AutoResearch initialization script
// Creates the experiments directory structure in the current working directory
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const experimentTracker_1 = require("../utils/experimentTracker");
console.log('Initializing AutoResearch experiment environment...\n');
// Initialize ExperimentTracker which automatically creates directories
const baseDir = process.cwd();
const tracker = new experimentTracker_1.ExperimentTracker(path.join(baseDir, 'experiments'));
// Verify creation
const experimentsDir = path.join(baseDir, 'experiments');
const logPath = path.join(experimentsDir, 'experiment_log.jsonl');
if (fs.existsSync(experimentsDir) && fs.existsSync(logPath)) {
    console.log('✓ Success! AutoResearch experiment environment initialized.');
    console.log(`  Base directory: ${experimentsDir}`);
    console.log(`  Experiment log: ${logPath}`);
    console.log('\nYou can now start an experiment with `/autoresearch` command.');
    process.exit(0);
}
else {
    console.error('✗ Error: Failed to create experiment directory structure.');
    console.error(`  Check permissions in: ${baseDir}`);
    process.exit(1);
}
