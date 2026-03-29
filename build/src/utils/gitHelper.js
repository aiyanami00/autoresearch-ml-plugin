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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHelper = void 0;
// Git operations for auto-commit of experiments
const simple_git_1 = __importDefault(require("simple-git"));
const path = __importStar(require("path"));
class GitHelper {
    git;
    baseDir;
    constructor(baseDir = process.cwd()) {
        this.baseDir = baseDir;
        this.git = (0, simple_git_1.default)(baseDir);
    }
    async isGitRepo() {
        try {
            await this.git.revparse(['--is-inside-work-tree']);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async autoCommitExperiment(experimentDir, message) {
        try {
            const isRepo = await this.isGitRepo();
            if (!isRepo) {
                console.log('Not a git repository, skipping auto-commit');
                return false;
            }
            // Add all files in the experiment directory
            await this.git.add([path.join(experimentDir, '**')]);
            // Commit
            await this.git.commit(message);
            console.log(`Committed experiment: ${message}`);
            return true;
        }
        catch (e) {
            console.error('Git auto-commit failed:', e);
            return false;
        }
    }
    async getCurrentHash() {
        try {
            return await this.git.revparse(['HEAD']);
        }
        catch (e) {
            return '';
        }
    }
}
exports.GitHelper = GitHelper;
