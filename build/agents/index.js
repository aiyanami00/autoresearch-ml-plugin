"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recorder = exports.trainer = exports.coder = exports.evaluator = exports.researcher = exports.understanding = exports.agentConfigs = void 0;
// Export all agent configurations
const understanding_1 = __importDefault(require("./understanding"));
exports.understanding = understanding_1.default;
const researcher_1 = __importDefault(require("./researcher"));
exports.researcher = researcher_1.default;
const evaluator_1 = __importDefault(require("./evaluator"));
exports.evaluator = evaluator_1.default;
const coder_1 = __importDefault(require("./coder"));
exports.coder = coder_1.default;
const trainer_1 = __importDefault(require("./trainer"));
exports.trainer = trainer_1.default;
const recorder_1 = __importDefault(require("./recorder"));
exports.recorder = recorder_1.default;
exports.agentConfigs = {
    understanding: understanding_1.default,
    researcher: researcher_1.default,
    evaluator: evaluator_1.default,
    coder: coder_1.default,
    trainer: trainer_1.default,
    recorder: recorder_1.default,
};
