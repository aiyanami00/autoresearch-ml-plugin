# AutoResearch - Autonomous ML Research for Claude Code

自主多智能体机器学习研究插件。输入任务 + 数据集，自动完成：探索数据 → 搜索文献 → 编写代码 → 训练模型 → 迭代改进。

## 特性

- 🔍 **自动数据探索** - 编写 Python 脚本分析数据集结构和格式
- 🖥️ **GPU 自动检测** - 运行 `nvidia-smi` 获取显存信息指导模型设计
- 📚 **强制文献调研** - 先搜索最新论文，brainstorm 多个方向
- ✅ **统一评审** - 同一 evaluator 评审方案和代码，通过后才进入下一阶段
- 💻 **代码生成** - 遵循现有代码风格生成 PyTorch 训练代码
- ⏱️ **长时间训练支持** - 后台运行，自动监控完成/失败
- 🔄 **迭代改进** - 每轮基于结果自动优化

## 安装

### 前置要求

- Node.js >= 18
- Claude Code CLI 已安装

### 方法一：临时加载（推荐用于开发测试）

使用 `--plugin-dir` 标志在当前会话中临时加载插件：

```bash
cd /path/to/autoresearch-ml-plugin
npm install
npm run build

# 启动 Claude Code 并加载插件
cc --plugin-dir /path/to/autoresearch-ml-plugin
```

> **提示**：`--plugin-dir` 是叠加行为，会额外加载指定插件，不影响其他已安装插件。

### 方法二：用户级安装（永久使用）

将插件安装到 Claude Code 用户目录，所有项目可用：

```bash
# 1. 构建插件
cd /path/to/autoresearch-ml-plugin
npm install
npm run build

# 2. 复制到 Claude Code 插件目录
mkdir -p ~/.claude/plugins/
cp -r /path/to/autoresearch-ml-plugin ~/.claude/plugins/autoresearch

# 3. 启动 Claude Code
cc
```

### 方法三：项目级安装（仅当前项目）

将插件安装到当前项目的 `.claude/` 目录：

```bash
# 1. 构建插件
cd /path/to/autoresearch-ml-plugin
npm install
npm run build

# 2. 在项目根目录创建 .claude 目录并复制插件
cd /path/to/your-project
mkdir -p .claude/plugins/
cp -r /path/to/autoresearch-ml-plugin .claude/plugins/autoresearch

# 3. 启动 Claude Code
cc
```

### 验证安装

安装完成后，在 Claude Code 中运行以下命令验证：

```
/help
```

应看到 `autoresearch` 相关命令已列出。

或使用：

```
/autoresearch-list
```

应返回 "No experiments found" 或当前实验列表。

## 使用

### 快速开始

```bash
# 1. 启动实验（首次运行）
/autoresearch task="训练 MNIST 分类器" dataset_path="./data" max_iterations=3

# 2. 查看训练状态
/autoresearch-status

# 3. 查看所有实验
/autoresearch-list

# 4. 汇总实验结果
/autoresearch-summary
```

### 完整命令列表

| 命令 | 功能 | 示例 |
|------|------|------|
| `/autoresearch` | 启动新实验 | `/autoresearch task="图像分类" dataset_path="./data" max_iterations=3` |
| `/autoresearch-status` | 查看当前训练状态 | `/autoresearch-status` |
| `/autoresearch-stop` | 停止正在运行的训练 | `/autoresearch-stop` |
| `/autoresearch-list` | 列出所有实验 | `/autoresearch-list` |
| `/autoresearch-summary` | 汇总所有实验结果 | `/autoresearch-summary` |

### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `task` | string | 是* | - | 机器学习任务描述 |
| `dataset_path` | string | 是* | - | 数据集路径（绝对或相对） |
| `max_iterations` | number | 否 | 3 | 最大迭代次数（研究→训练循环） |
| `experiment_name` | string | 否 | auto-generated | 实验名称 |
| `action` | string | 否 | start | 操作类型：start/status/stop/list |

\* `action=start` 时必填

## 工作流程

```
用户输入任务 + 数据集
        ↓
┌─────────────────┐
│ Understanding   │ 探索数据、检测GPU、分析代码、写 specification
│ → Evaluator评审 │ 不通过则返工
└─────────────────┘
        ↓
┌─────────────────┐
│ 迭代循环        │
│ 1. Researcher   │ 搜索论文、brainstorm、克隆参考代码 → Evaluator评审
│ 2. Coder        │ 生成 train.py + model.py → Evaluator评审
│ 3. Trainer      │ 后台训练、监控进度
│ 4. Recorder     │ 记录结果、写 summary、提出改进建议
└─────────────────┘
```

## 实验存储

```
experiments/
├── specification.md       # 实验规范（共享）
├── result.csv            # 全局结果汇总
└── experiment01/         # 第1轮迭代
    ├── plan/plan.md      # 研究方案
    ├── src/              # train.py, model.py
    ├── log/training.log  # 训练日志
    ├── output/           # 结果和指标
    └── summary.md        # 分析和改进建议
```

## 开发

```bash
npm install
npm run build    # 编译 TypeScript
npm run dev      # 开发模式
```

## 许可证

MIT
