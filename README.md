# AutoResearch - Autonomous Multi-Agent Machine Learning Research for Claude Code

给 Claude Code 使用的**自主多智能体机器学习研究插件**。输入任务描述 + 数据集，它会自动：探索数据 → 分析现有代码 → 搜索最新文献 → 编写代码 → 训练模型 → 迭代改进结果。

## 特性

- 🔍 **自动数据探索** - 自动扫描数据集，发现结构，推断输入输出格式
- 📋 **现有代码分析** - 提取你的编码风格、数据处理模式、评估方法（会重新研究模型/训练方法）
- 📚 **自动文献调研** - 搜索顶级会议 (NeurIPS, ICML, ICLR, CVPR, Nature) 最新论文
- 🎯 **强制指定研究方向** - 可以明确要求 "use transformer instead of CNN"，系统会保证搜索符合要求
- 🐙 **GitHub 代码发现** - 克隆并检查官方开源实现
- 🔄 **研究者-评估者循环** - 迭代改进方案直到通过验证
- ✅ **统一评审** - 同一个评估者统一评审方案和代码，进入训练前发现问题
- 💻 **代码生成** - 遵循*你的*编码规范生成完整 PyTorch 训练代码
- ⏱️ **长时间运行监控** - 支持几小时/几天训练，自动检测完成/失败
- 📝 **实验追踪** - 所有实验持久化日志，支持 git 自动提交
- 🎯 **迭代改进** - 基于之前结果自动改进
- 🖥️ **自动 GPU 检测** - 检测显卡型号和显存帮助模型设计
- 🛠️ **便捷命令** - `/autoresearch-status` / `/autoresearch-stop` / `/autoresearch-list` 快速查看状态

## 安装

### 前置要求

- Node.js 18+
- Python 3.8+ (运行生成的训练代码)
- Git (克隆参考代码仓库)

### 安装步骤

```bash
# 克隆
git clone <your-repo-url>
cd autoresearch

# 安装依赖并编译
npm install
npm run build

# 在 Claude Code 中添加插件（使用绝对路径！）
/plugin add /absolute/path/to/autoresearch

# 重启 Claude Code
```

## 使用

### 启动新实验
```
/autoresearch task="你的机器学习任务" dataset_path="./path/to/dataset" [max_iterations=3]
```

**示例** - 指定研究方向：
```
/autoresearch task="训练图像分类，使用 transformer 架构" dataset_path="./data/my-images" max_iterations=3
```

### 实用命令

| 命令 | 功能 |
|------|------|
| `/autoresearch-status` | 查看当前正在运行的训练状态 |
| `/autoresearch-stop` | 停止当前正在运行的训练 |
| `/autoresearch-list` | 列出所有历史实验 |

**示例** - 修改方向：
> 理解阶段完成后，如果你想改变方向，直接说：
```
改成使用 vision transformer 而不是 CNN
```
会更新 specification，researcher 会遵循新方向。

## 工作流程

```
用户输入任务 + 数据集
          ↓
↓ 理解阶段 ↓
  • 自动探索数据结构
  • 分析现有代码提取编码规范
  • ✨自动检测 GPU 型号和显存
  • 明确优化目标（指标）
  • 生成 specification.md → 用户确认/修改
          ↓
↓ 每个迭代 ↓
  1. 研究者 ← 必须先搜索，brainstorm 多个方向
  2. 评估者 ← 评审方案，不通过就返工 (统一评估者评审方案+代码)
  3. 编码 ← 写 train.py + model.py
  4. 评估者 ← 评审代码，不完整不正确就返工
  5. 训练 ← 后台运行，轮询监控直到完成/失败
  6. 记录 ← 分析结果，提出改进建议
          ↓
↓ 最终总结 ↓
  输出所有迭代结果，指向最佳实验
```

## 实验存储

所有实验存在**你运行 `/autoresearch` 的当前目录**下的 `experiments/`：

```
experiments/
├── experiment_log.jsonl    # 全局实验索引
├── result.csv              # 全局结果汇总表
├── specification.md       # ← 整体实验规范（数据+GPU+目标）共享给所有迭代
└── experiment01/           # 迭代 1（顺序编号 01, 02, 03...)
    ├── plan.md             # 本轮迭代批准的方案
    ├── config.json         # 本轮实验配置
    ├── plan/
    │   └── plan.md
    ├── src/                # 训练代码
    │   ├── train.py
    │   └── model.py
    ├── log/
    │   └── training.log
    ├── output/
    │   ├── metrics.json
    │   └── learning_curves.csv
    ├── references/         # 克隆的参考代码
    ├── checkpoints/        # git-忽略
    └── summary.md          # 本轮分析和建议
```

**结构说明**：
- `specification.md` 包含整体实验信息（数据描述、GPU 信息、训练目标），这些在迭代之间不会改变，因此只在根目录保存一份
- 每次迭代会创建一个独立的 `experimentXX` 目录（顺序编号：`experiment01`, `experiment02`, ...）
- 每次迭代独立保存自己的方案、代码、日志和结果

## 初始化实验目录

```bash
# 在你的项目目录初始化实验环境
npx autoresearch init
```

## 许可证

MIT
