# AutoResearch MCP Plugin for Claude Code

AutoResearch 是一个给 Claude Code 使用的**自主多代理机器学习研究插件**。给它一个任务描述和你的数据集，它会自动探索数据、分析现有代码、搜索最新文献、编写代码、训练模型并迭代改进结果。

## 功能特点

- 🔍 **自动数据探索**：自动扫描数据集目录，发现数据结构，推断输入输出格式，识别 train/val/test 分割
- 📋 **现有代码分析**：如果你已有代码，提取你的代码风格、数据处理模式和评估方法（忽略会被重新研究的训练方法和模型）
- 📚 **自动文献研究**：搜索顶级会议（NeurIPS, ICML, ICLR, CVPR, Nature）最新论文
- 🐙 **GitHub 代码发现**：克隆并检查官方开源实现
- 🔄 **研究者-评估者循环**：迭代改进方案直到通过验证
- 💻 **代码生成**：遵循*你的*编码规范生成完整 PyTorch 训练代码
- ⏱️ **长时间运行监控**：支持几小时/几天的训练，自动检测完成
- 📝 **实验追踪**：所有实验持久化日志，支持 git 自动提交
- 🎯 **迭代改进**：基于之前结果自动改进

## 安装说明

### 前置要求

- Node.js 18+
- Python 3.8+（用于运行生成的训练代码）
- Git（用于克隆论文代码仓库）

### 完整步骤：从 GitHub 到可用 /autoresearch

### 1. 克隆代码到本地

```bash
# 克隆项目（替换为你的 GitHub URL 或者使用你本地已经下载的路径）
git clone <你的仓库URL> autoresearch
cd autoresearch
```

如果你已经下载完代码，确认你在项目根目录：

```bash
pwd
# 应该显示类似 /home/你的用户名/code/autoresearch
```

### 2. 安装依赖并编译

```bash
# 安装 Node.js 依赖
npm install

# 编译 TypeScript 代码
npm run build
```

> **💡 如果这一步报错**：检查 Node.js 版本是否为 18+：`node --version`

### 3. 在 Claude Code 中安装插件

在 Claude Code 中运行以下命令**替换路径为你的实际路径**：

```
/plugin add /home/你的用户名/code/autoresearch
```

> **⚠️ 重要提示**：必须使用**绝对路径**！你可以运行 `pwd` 命令获取你的绝对路径。

例如，如果你的路径是 `/home/john/projects/autoresearch`，命令是：
```
/plugin add /home/john/projects/autoresearch
```

### 4. 重启 Claude Code

完全退出并重启 Claude Code 让插件加载生效。

### 5. 测试是否成功

重启后在 Claude Code 运行：

```
/autoresearch task="测试" dataset_path="./"
```

如果能正常启动，说明安装成功！

---

### 手动配置 MCP（备选方案）

如果方式一不工作，可以手动编辑 MCP 配置文件：

编辑 `~/.config/claude-code/claude_desktop_config.json`，添加：

```json
{
  "mcpServers": {
    "autoresearch": {
      "command": "node",
      "args": ["/绝对路径/to/autoresearch/build/index.js"],
      "env": {}
    }
  }
}
```

> **⚠️ 重要提示**：必须使用**绝对路径**指向 `build/index.js`。相对路径无法正常工作。

保存后**重启 Claude Code** 以加载插件。

### 常见 MCP 连接问题排查

如果看到 "Failed to reconnect to autoresearch" 错误：

1. **检查是否已经运行 `npm install && npm run build`** - 这是最常见的错误！
2. **检查路径是否绝对路径** - 不能用相对路径，必须是完整的绝对路径
3. **检查 `build/index.js` 是否存在** - 运行 `ls -la build/index.js` 应该能看到文件
4. **测试 MCP 服务器能否手动启动** - 运行 `node build/index.js`，应该看到输出 `AutoResearch MCP server running on stdio`，按 `Ctrl+C` 退出
5. **检查 Node.js 版本** - 需要 Node.js 18 或更高版本：`node --version`

## 使用方法

### 斜杠命令（推荐）

安装完成后，直接使用：

```
/autoresearch task="你的机器学习任务描述" dataset_path="./path/to/数据集" max_iterations=3
```

**参数说明**：
- `task`：**必填** - 机器学习任务描述
- `dataset_path`：**必填** - 数据集在本地文件系统的路径
- `max_iterations`：可选 - 最大研究+训练迭代次数（默认：3）
- `experiment_name`：可选 - 自定义实验名称

**中文示例**：

```
/autoresearch task="训练一个CNN做图像分类" dataset_path="./data/my-images" max_iterations=3
```

### 可用 MCP 工具

| 工具 | 功能 |
|------|------|
| `start_autoresearch` | 启动一个新的自主机器学习研究实验 |
| `get_training_status` | 获取当前训练状态 |
| `stop_training` | 停止当前正在运行的训练 |
| `list_experiments` | 列出所有历史实验 |
| `get_experiment_summary` | 获取特定实验的摘要信息 |

## 详细工作流程

### 步骤 1：任务输入

你提供：
- 任务描述（你想要完成什么）
- 数据集路径（本地文件系统上）
- 最大研究+训练迭代次数（默认：3）

### 步骤 2：自动理解与数据探索（理解代理）

1. **自动数据探索**
   - 使用 Glob 递归扫描数据集目录
   - 发现目录结构（是否有 train/val/test 文件夹？）
   - 统计每个分割的文件数量
   - 检查样例文件确定格式（图片、CSV、numpy 数组、文本等）
   - 推断输入形状、输出维度和数据类型
   - 自动记录所有发现

2. **现有代码分析**（如果你仓库中有现有代码）
   - 找到所有 Python 文件
   - 读取并分析代码提取：
     - **代码风格**：命名约定、导入模式、代码组织
     - **数据处理**：你如何加载数据、预处理、增强
     - **评估**：你如何计算指标、做验证
   - **刻意忽略**：特定模型架构和训练方法（我们会从头重新研究）
   - 保存提取的模式以便后续代理遵循你的约定

3. **澄清问题**
   - 只对你**无法自动发现**的事情提问
   - 例如：优化什么目标、GPU 约束、你对准确率 vs 速度的偏好

4. **输出**：生成正式 `specification.md` 包含完整实验规范

### 步骤 3：研究-评估循环

每次迭代：

1. **研究者代理**
   - 基于正式规范（包含发现的数据结构和提取的模式）
   - 搜索顶级会议最近 3-5 年的论文
   - 在有可用的时候找到官方 GitHub 仓库
   - 克隆仓库并检查参考代码
   - 提出完整方案：模型架构、训练策略、预处理

2. **评估者代理**
   - 严格评审方案的完整性和可行性
   - 检查：模型大小是否合适、数据泄露、计算需求
   - **拒绝** 不完整或有问题的方案 → 研究者根据反馈修改
   - **批准** 只有完整可行的方案才能通过
   - 循环直到批准

### 步骤 4：代码生成（编码代理）

- 基于批准的方案编写完整 PyTorch 训练代码
- 遵循**你的编码约定**和从现有代码提取的数据处理模式
- 生成：
  - `train.py` - 带日志、保存检查点的主训练循环
  - `model.py` - 模型定义
- 所有输出写到实验目录

### 步骤 5：训练与监控（训练代理）

- 以分离后台进程启动训练（支持几小时/几天长时间运行）
- 定期轮询训练日志监控进度
- 自动解析 epoch/loss 信息
- 检测训练何时完成或失败
- 支持通过 `stop_training` 工具手动停止

### 步骤 6：结果记录与分析（记录代理）

- 保存所有实验细节：方案、代码、日志、指标
- 撰写分析摘要：什么有效、什么无效、原因
- 提供 2-4 个具体、可操作的改进建议给下次迭代
- 所有内容提交到 git

### 步骤 7：迭代改进

- 对请求的迭代次数重复步骤 3-6
- 每次迭代都结合之前结果的反馈/建议
- 所有迭代完成后，输出最终摘要并指出最佳结果

## 完整流程图

```
┌─────────────────────────────────────────────────────────────┐
│  输入：任务描述 + 数据集路径 + 最大迭代次数                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤 1：理解代理                                           │
│  • 自动数据探索 (Glob + 文件检查)                          │
│  • 现有代码分析 → 提取编码模式                             │
│  • 对不明确的内容向用户提问                                │
│  • 输出：specification.md                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│  每次迭代 (1 ... 最大迭代次数):                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  研究者：查找论文 + GitHub + 制定方案               │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  评估者：评审方案的完整性/可行性                   │   │
│  └───────────┬───────────────────────────┬─────────────┘   │
│              │                           │                 │
│         拒绝                          批准              │
│              │                           │                 │
│              └───────────┐               ┘                 │
│                      反馈                                │
│              ┌───────────┘                               │
│              │                                           │
│              └────────→ 【重复研究】                      │
│                                                           │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  编码代理：遵循你的模式编写 PyTorch 代码           │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  训练代理：启动并监控长时间运行的训练              │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  记录代理：分析结果 → 提出改进建议                  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  最终摘要：列出所有迭代，指向最佳结果                       │
└─────────────────────────────────────────────────────────────┘
```

## 实验目录结构

每个实验存储在 `experiments/` 目录：

```
experiments/
├── experiment_log.jsonl               # 全局实验索引
└── 1-20240328-123456-task-name/
    ├── specification.md               # 正式规范（包含发现的数据和提取的模式）
    ├── plan.md                         # 带论文引用的批准方案
    ├── config.json                     # 完整实验配置
    ├── code/
    │   ├── train.py
    │   └── model.py
    ├── references/                     # 克隆的官方参考代码
    ├── logs/
    │   └── training.log
    ├── results/
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── checkpoints/                    # git 忽略
    └── summary.md                      # 最终分析和建议
```

## 从现有代码提取什么

当你提供现有代码时，AutoResearch 提取：

| 提取内容 | 目的 |
|------|---------|
| **代码风格和约定** | 生成的代码匹配你的命名、组织、导入模式 |
| **数据处理流水线** | 你如何加载数据、使用什么预处理步骤、如何增强 |
| **评估方法学** | 你如何分割数据、计算什么指标、如何验证 |

**不会**提取并会被重新研究的内容：
- 模型架构规格
- 特定训练方法、优化器、超参数

## 从现有代码提取公共部分编写实验规则

正如你要求：*"根据代码提取公共部分，编写实验规则。比如说根据代码知道我代码风格 数据处理 还有评估怎么评估，然后忽略掉现有代码使用的训练方法和模型"* - **这正是 AutoResearch 设计的核心功能** ✅

## 示例用法

如果你有：
- 数据集在 `./data/`，包含 `train/`、`val/`、`test/` 图片文件夹
- `./src/` 中的现有代码展示了你如何预处理和评估
- 想要尝试新模型来提升准确率

你只需要运行：

```
/autoresearch task="在我的数据集上做图像分类" dataset_path="./data" max_iterations=3
```

AutoResearch 会：
1. 自动发现 `train/val/test` 结构和图片格式
2. 读取你的现有代码，学习你的数据处理约定
3. 在 arXiv/顶级会议搜索最新最佳论文架构
4. 生成遵循你的约定的新代码
5. 训练、评估，并提出改进建议

## 故障排除

### MCP 连接失败 "Failed to reconnect to autoresearch"

**最常见原因：** 你克隆了代码但没有运行 `npm install && npm run build`。MCP 服务器需要编译后的 JavaScript 代码才能运行。

**请按顺序尝试这些解决步骤：**

1. **确认已经编译**
   ```bash
   cd /path/to/autoresearch
   npm install
   npm run build
   ```

2. **确认 `build/index.js` 存在**
   ```bash
   ls -la build/index.js
   # 应该能看到文件存在
   ```

3. **测试 MCP 服务器能否手动启动**
   ```bash
   node build/index.js
   ```
   应该输出：`AutoResearch MCP server running on stdio`
   如果看到这个输出，说明服务器没问题，按 `Ctrl+C` 退出。

4. **确认插件安装路径是绝对路径**
   - 在 `/plugin add` 时必须用完整的绝对路径，不能用相对路径
   - 可以用 `pwd` 命令获取你的绝对路径

5. **必须重启 Claude Code**
   - 安装插件后必须完全重启 Claude Code

6. **检查 Node.js 版本**
   ```bash
   node --version
   ```
   需要 v18 或更高版本。

## 许可证

MIT

---

---

# English Version

# AutoResearch MCP Plugin for Claude Code

Autonomous multi-agent machine learning research plugin that automatically explores your data, analyzes your existing code, and runs full research iterations to get the best result.

## Features

- 🔍 **Automatic Data Exploration**: Automatically explores your dataset directory, discovers structure, infers input/output formats, identifies train/val/test splits
- 📋 **Existing Code Analysis**: If you have existing code, extracts your coding style, data processing patterns, and evaluation approaches (ignores training methods/models that will be re-researched)
- 📚 **Automatic Literature Research**: Finds recent top-conference papers (NeurIPS, ICML, ICLR, CVPR, Nature)
- 🐙 **GitHub Discovery**: Clones and inspects official implementations
- 🔄 **Researcher-Evaluator Loop**: Iteratively refines the plan until it's approved
- 💻 **Code Generation**: Writes complete PyTorch training code following *your* coding conventions
- ⏱️ **Long-Running Monitoring**: Monitors training for hours/days, detects completion automatically
- 📝 **Experiment Tracking**: Persistent logging of all experiments with git auto-commit
- 🎯 **Iterative Improvement**: Automatically improves based on previous results

## Installation

### Prerequisites

- Node.js 18+
- Python 3.8+ with PyTorch (for generated training code)
- Git (for cloning paper repositories and auto-commit)

### Complete Step-by-Step: From GitHub to /autoresearch Working

### 1. Clone the code to your local machine

```bash
# Clone the project
git clone <your-github-url> autoresearch
cd autoresearch
```

If you've already downloaded the code, make sure you're in the project root:

```bash
pwd
# Should output something like: /home/yourname/code/autoresearch
```

### 2. Install dependencies and build

```bash
# Install Node.js dependencies
npm install

# Compile TypeScript code
npm run build
```

> **💡 If this step fails**: Check your Node.js version is 18+: `node --version`

### 3. Install the plugin in Claude Code

In Claude Code, run the following command **replace the path with your actual absolute path**:

```
/plugin add /home/yourname/code/autoresearch
```

> **⚠️ Important**: You must use an **absolute path**! You can get your absolute path by running `pwd`.

Example, if your path is `/home/john/projects/autoresearch`, the command is:
```
/plugin add /home/john/projects/autoresearch
```

### 4. Restart Claude Code

Completely exit and restart Claude Code for the plugin to load.

### 5. Test if it works

After restarting, run this in Claude Code:

```
/autoresearch task="Test" dataset_path="./"
```

If it starts successfully, installation is complete!

---

### Manual MCP Configuration (Alternative Method)

If Method 1 doesn't work, you can manually edit the MCP configuration file:

Edit `~/.config/claude-code/claude_desktop_config.json`, add:

```json
{
  "mcpServers": {
    "autoresearch": {
      "command": "node",
      "args": ["/absolute/path/to/autoresearch/build/index.js"],
      "env": {}
    }
  }
}
```

> **⚠️ Important**: You must use an **absolute path** to `build/index.js`. Relative paths do not work.

Save the file and **restart Claude Code** to load the plugin.

### Troubleshooting "Failed to reconnect" MCP Issues

If you see "Failed to reconnect to autoresearch" error:

1. **Check if you ran `npm install && npm run build`** - this is the most common mistake!
2. **Verify the path is absolute** - relative paths don't work, must be full absolute path
3. **Check if `build/index.js` exists** - run `ls -la build/index.js` - you should see the file
4. **Test if MCP server can start manually** - run `node build/index.js`, you should see `AutoResearch MCP server running on stdio`, press `Ctrl+C` to exit
5. **Check Node.js version** - need Node.js 18 or newer: `node --version`

## Usage

### As Claude Code Slash Command (Recommended)

```
/autoresearch task="Train a CNN for image classification" dataset_path="./data/my-dataset" max_iterations=3
```

Parameters:
- `task`: **Required** - Description of the machine learning task
- `dataset_path`: **Required** - Path to the dataset on local filesystem
- `max_iterations`: Optional - Maximum number of research+training iterations (default: 3)
- `experiment_name`: Optional - Name for the experiment

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `start_autoresearch` | Start a new autonomous research experiment |
| `get_training_status` | Get current training status |
| `stop_training` | Stop current training |
| `list_experiments` | List all previous experiments |
| `get_experiment_summary` | Get summary for specific experiment |

## Detailed Workflow

### Step 1: Task Input
You provide:
- Task description (what you want to achieve)
- Dataset path (on local filesystem)
- Maximum number of research+training iterations (default: 3)

### Step 2: Automatic Understanding & Data Exploration (Understanding Agent)

1. **Automatic Data Exploration**
   - Uses Glob to recursively scan your dataset directory
   - Discovers directory structure (are there train/val/test folders?)
   - Counts number of files per split
   - Inspects sample files to determine format (images, CSV, numpy arrays, text, etc.)
   - Infers input shape, output dimensions, and data types
   - Documents everything discovered automatically

2. **Existing Code Analysis** (if you have existing code in the repository)
   - Finds all Python files in your working directory
   - Reads and analyzes code to extract:
     - **Coding style**: naming conventions, import patterns, code organization
     - **Data processing**: how you load data, preprocess, augment
     - **Evaluation**: how you compute metrics, do validation
   - **Purposefully ignores**: specific model architectures and training methods (we'll research those from scratch)
   - Saves the extracted patterns so subsequent agents follow your conventions

3. **Clarification**
   - Only asks you questions about things it *cannot* discover automatically
   - For example: what objective to optimize, any specific GPU constraints, your preference for accuracy vs speed

4. **Output**: Formal `specification.md` with complete experiment specification

### Step 3: Research-Evaluation Loop

For each iteration:

1. **Researcher Agent**
   - Takes the formal specification (with discovered data structure and extracted patterns)
   - Searches recent papers (last 3-5 years) from top conferences
   - Finds official GitHub repositories when available
   - Clones the repository and inspects the reference code
   - Proposes a complete plan: model architecture, training strategy, preprocessing

2. **Evaluator Agent**
   - Critically reviews the plan for completeness and feasibility
   - Checks for: model size appropriateness, data leakage, computational requirements
   - **Rejects** if incomplete or has issues → Researcher revises with feedback
   - **Approves** only when plan is complete and feasible
   - Loops until approval

### Step 4: Code Generation (Coder Agent)

- Writes complete PyTorch training code based on the approved plan
- Follows **your coding conventions** and data processing patterns extracted from your existing code
- Generates:
  - `train.py` - main training loop with logging, checkpoint saving
  - `model.py` - model definition
- Outputs everything to experiment directory

### Step 5: Training & Monitoring (Trainer Agent)

- Launches training as detached background process (supports hours/days of training)
- Periodically polls the training log to monitor progress
- Parses epoch/loss information automatically
- Detects when training completes or fails
- Supports manual stopping via `stop_training` tool

### Step 6: Result Recording & Analysis (Recorder Agent)

- Saves all experiment details: plan, code, logs, metrics
- Writes analysis summary: what worked, what didn't, why
- Provides 2-4 concrete, actionable suggestions for improvement in next iteration
- Commits everything to git

### Step 7: Iterate & Improve

- Repeats Steps 3-6 for the requested number of iterations
- Each iteration incorporates feedback/suggestions from previous results
- After all iterations complete, outputs final summary with the best result

### Full Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Input: Task Description + Dataset Path + Max Iterations    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Understanding Agent                                │
│  • Automatic data exploration (Glob + file inspection)      │
│  • Existing code analysis → extract coding patterns         │
│  • Clarify what's unclear with AskUserQuestion              │
│  • Output: specification.md                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│  For Each Iteration (1 ... MaxIterations):                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Researcher: Find papers + GitHub + make plan       │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Evaluator: Review plan for completeness/feasibility │   │
│  └───────────┬───────────────────────────┬─────────────┘   │
│              │                           │                 │
│         REJECTED                     APPROVED              │
│              │                           │                 │
│              └───────────┐               ┘                 │
│                      FEEDBACK                             │
│              ┌───────────┘                               │
│              │                                           │
│              └────────→ [Repeat Research]                │
│                                                           │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Coder: Write PyTorch code following your patterns  │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Trainer: Launch & monitor long-running training    │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │  Recorder: Analyze results → suggest improvements   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Final Summary: List all iterations, point to best result   │
└─────────────────────────────────────────────────────────────┘
```

## Experiment Structure

Each experiment is stored in `experiments/`:

```
experiments/
├── experiment_log.jsonl               # Global experiment index
└── 1-20240328-123456-task-name/
    ├── specification.md               # Formal specification (with discovered data + extracted patterns)
    ├── plan.md                         # Approved plan with paper references
    ├── config.json                     # Full experiment configuration
    ├── code/
    │   ├── train.py
    │   └── model.py
    ├── references/                     # Cloned official reference code
    ├── logs/
    │   └── training.log
    ├── results/
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── checkpoints/                    # git-ignored
    └── summary.md                      # Final analysis and suggestions
```

## What Gets Extracted from Existing Code

When you provide existing code, AutoResearch extracts:

| What | Purpose |
|------|---------|
| **Coding style & conventions** | Generated code matches your naming, organization, import patterns |
| **Data processing pipeline** | How you load data, what preprocessing steps you use, how you augment |
| **Evaluation methodology** | How you split data, what metrics you compute, how you validate |

What is **not** extracted and will be re-researched:
- Model architecture specifications
- Specific training methods, optimizers, hyperparameters

This matches the requirement: *"Extract common parts from existing code, write experiment rules. For example, understand coding style, data processing, how evaluation is done based on code, then ignore the training methods and models used in existing code"*.

## Example Usage

If you have:
- Dataset in `./data/` with `train/`, `val/`, `test/` folders of images
- Existing code in `./src/` that shows how you preprocess and evaluate
- Want to try new models to improve accuracy

You just run:
```
/autoresearch task="Image classification on my dataset" dataset_path="./data" max_iterations=3
```

AutoResearch will:
1. Auto-discover the `train/val/test` structure and image format
2. Read your existing code, learn your data processing conventions
3. Search for recent best paper architectures on arXiv/top conferences
4. Generate new code that follows your conventions
5. Train, evaluate, and suggest improvements

## Requirements

- Node.js 18+
- Python 3.8+ with PyTorch (for generated training code)
- Git (for cloning paper repositories and auto-commit)

## License

MIT
