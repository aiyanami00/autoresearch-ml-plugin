"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const AutoResearchSkill_1 = require("./AutoResearchSkill");
const experimentTracker_1 = require("./utils/experimentTracker");
class AutoResearchServer {
    server;
    currentTrainingMonitor = null;
    constructor() {
        this.server = new index_js_1.Server({
            name: 'autoresearch-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'start_autoresearch',
                        description: 'Start a new autonomous machine learning research experiment',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                task: {
                                    type: 'string',
                                    description: 'Description of the machine learning task',
                                },
                                dataset_path: {
                                    type: 'string',
                                    description: 'Path to the dataset on local filesystem',
                                },
                                max_iterations: {
                                    type: 'number',
                                    description: 'Maximum number of research+training iterations',
                                    default: 3,
                                },
                                experiment_name: {
                                    type: 'string',
                                    description: 'Optional name for the experiment',
                                },
                                check_interval_seconds: {
                                    type: 'number',
                                    description: 'Interval in seconds to check training status for long runs',
                                    default: 300,
                                },
                            },
                            required: ['task', 'dataset_path'],
                        },
                    },
                    {
                        name: 'get_training_status',
                        description: 'Get current training status if a training is running',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'stop_training',
                        description: 'Stop the current running training',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'list_experiments',
                        description: 'List all previous experiments',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                    {
                        name: 'get_experiment_summary',
                        description: 'Get summary for a specific experiment',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                experiment_id: {
                                    type: 'string',
                                    description: 'ID of the experiment',
                                },
                            },
                            required: ['experiment_id'],
                        },
                    },
                ],
            };
        });
        // Tool call handler
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            if (!args) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'Missing arguments');
            }
            switch (name) {
                case 'start_autoresearch': {
                    const config = {
                        task: args.task,
                        datasetPath: args.dataset_path,
                        maxIterations: args.max_iterations ?? 3,
                        experimentName: args.experiment_name ?? `autoresearch-${Date.now()}`,
                        checkIntervalMs: (args.check_interval_seconds ?? 300) * 1000,
                    };
                    const skill = new AutoResearchSkill_1.AutoResearchSkill(config);
                    // Create query wrapper that works with MCP
                    // Type assertion: we don't need the extra methods (interrupt, setPermissionMode, etc) for this use case
                    const queryFunc = async function* (params) {
                        // This will be handled by the Claude Agent SDK infrastructure
                        yield { result: `Running AutoResearch with config: ${JSON.stringify(config, null, 2)}\n` };
                        const result = await skill.run(queryFunc);
                        yield { result };
                    };
                    // Consume the query to get the final result
                    let fullResult = '';
                    for await (const message of queryFunc({ prompt: '' })) {
                        if ('result' in message) {
                            fullResult += message.result;
                        }
                    }
                    return {
                        content: [{ type: 'text', text: fullResult }],
                    };
                }
                case 'get_training_status': {
                    if (!this.currentTrainingMonitor) {
                        return {
                            content: [{ type: 'text', text: 'No active training monitor' }],
                        };
                    }
                    const status = this.currentTrainingMonitor.loadStatus();
                    if (!status) {
                        return {
                            content: [{ type: 'text', text: 'No status available' }],
                        };
                    }
                    const updated = await this.currentTrainingMonitor.checkStatus(status);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }],
                    };
                }
                case 'stop_training': {
                    if (!this.currentTrainingMonitor) {
                        return {
                            content: [{ type: 'text', text: 'No active training to stop' }],
                        };
                    }
                    const status = this.currentTrainingMonitor.loadStatus();
                    if (status && status.status === 'running') {
                        await this.currentTrainingMonitor.stopTraining(status);
                        return {
                            content: [{ type: 'text', text: `Training stopped. Status: ${JSON.stringify(status, null, 2)}` }],
                        };
                    }
                    return {
                        content: [{ type: 'text', text: 'No running training found' }],
                    };
                }
                case 'list_experiments': {
                    const tracker = new experimentTracker_1.ExperimentTracker();
                    const experiments = tracker.listExperiments();
                    return {
                        content: [{ type: 'text', text: JSON.stringify(experiments, null, 2) }],
                    };
                }
                case 'get_experiment_summary': {
                    const tracker = new experimentTracker_1.ExperimentTracker();
                    const experimentId = args.experiment_id;
                    const experiment = tracker.getExperiment(experimentId);
                    if (!experiment) {
                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Experiment ${experimentId} not found`);
                    }
                    return {
                        content: [{ type: 'text', text: JSON.stringify(experiment, null, 2) }],
                    };
                }
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        });
    }
    async start() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('AutoResearch MCP server running on stdio');
    }
}
// Start the server
const server = new AutoResearchServer();
server.start().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
