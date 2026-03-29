# CLAUDE.md

AutoResearch - 使用显式状态机控制的多智能体机器学习研究插件。

## 常用命令

```bash
npm install      # 安装依赖
npm run build    # 编译 TypeScript
npm run dev      # 开发模式
```

## 代码架构

```
src/
├── AutoResearchSkill.ts    # 主协调器，显式状态机控制工作流
├── MultiAgentSkill.ts      # 提供 runSubagent() 用于显式调用
├── agents/                 # 子 agent 配置
│   ├── understanding.ts   # 数据探索、GPU检测、写 specification
│   ├── researcher.ts      # 文献搜索、brainstorm、写 plan
│   ├── evaluator.ts       # 统一评审（方案+代码+最终分析）
│   ├── coder.ts           # 生成 PyTorch 代码
│   ├── trainer.ts         # 启动和监控训练
│   └── recorder.ts        # 记录结果、写 summary
├── utils/
│   ├── experimentTracker.ts
│   ├── trainingMonitor.ts
│   └── gitHelper.ts
└── skills/autoresearch/SKILL.md
```

## 显式状态机工作流

```typescript
runStateMachine()
    ↓
runUnderstandingPhase()     // understanding → evaluator (循环直到通过)
    ↓
for i in 1..maxIterations:
    runResearchPhase()      // researcher → evaluator (循环)
    runCodePhase()          // coder → evaluator (循环)
    runTrainingPhase()      // trainer (监控到完成)
    runAnalysisPhase()      // recorder (写 summary)
    ↓
generateFinalSummary()
```

**关键点**: 不使用 Agent SDK 自动调度，由代码显式控制每个 agent 的调用顺序。

## 上下文传递

每个 agent 接收包含 skill 元数据的 context：

```typescript
{
    task: "...",
    datasetPath: "...",
    skill: {
        skillName: "AutoResearch",
        skillPurpose: "自主多智能体机器学习研究",
        skillWorkflow: "understanding → evaluator → researcher → ...",
        currentStep: "understanding - 探索数据...",
        maxIterations: 3
    }
}
```

## Agent 职责

| Agent | 关键任务 | Tools |
|-------|---------|-------|
| understanding | 写 analyze_data.py 探索数据、check_hardware.py 检测GPU、提取代码规范 | AskUserQuestion, Read, Write, Glob, Bash |
| researcher | WebSearch 论文、brainstorm 多方向、克隆 GitHub 代码 | WebSearch, WebFetch, Bash |
| evaluator | 评审 spec/plan/code，最终 retrospective 分析 | Read, Write |
| coder | 按 plan 生成 train.py + model.py，遵循现有代码风格 | Write, Read, Edit |
| trainer | 后台启动训练，轮询日志监控 | Bash, Read |
| recorder | 更新 CSV、写 summary、调用 evaluator 最终评审 | Read, Write, Bash, Agent |

## 评审反馈循环

```typescript
while (!approved && attempts < maxAttempts) {
    const result = await runSubagent('agent', context, queryFn);
    const evalResult = await runSubagent('evaluator', { phase: 'review', ... }, queryFn);
    const outcome = parseOutcome(evalResult);  // APPROVED/REJECTED

    if (!outcome.approved) {
        context.feedback = outcome.feedback;   // 反馈给下一轮
        context.previousResult = result;
    }
}
```

## 实验目录结构

```
experiments/
├── specification.md       # 整体实验规范
├── result.csv            # 全局结果汇总
└── experiment01/
    ├── plan/plan.md
    ├── src/{train,model}.py
    ├── log/training.log
    ├── output/metrics.json
    └── summary.md
```
