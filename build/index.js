"use strict";
// AutoResearch Skill Entry Point
// Direct export for skill invocation (no MCP wrapper)
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHelper = exports.TrainingMonitor = exports.ExperimentTracker = exports.AutoResearchSkill = void 0;
var AutoResearchSkill_1 = require("./AutoResearchSkill");
Object.defineProperty(exports, "AutoResearchSkill", { enumerable: true, get: function () { return AutoResearchSkill_1.AutoResearchSkill; } });
__exportStar(require("./types"), exports);
var experimentTracker_1 = require("./utils/experimentTracker");
Object.defineProperty(exports, "ExperimentTracker", { enumerable: true, get: function () { return experimentTracker_1.ExperimentTracker; } });
var trainingMonitor_1 = require("./utils/trainingMonitor");
Object.defineProperty(exports, "TrainingMonitor", { enumerable: true, get: function () { return trainingMonitor_1.TrainingMonitor; } });
var gitHelper_1 = require("./utils/gitHelper");
Object.defineProperty(exports, "GitHelper", { enumerable: true, get: function () { return gitHelper_1.GitHelper; } });
__exportStar(require("./agents"), exports);
