# 编码时长统计工具

本工具集提供了多种方法来动态获取和统计本周编码时长，帮助你了解自己的编码习惯和效率。

## 功能流程图

```mermaid
graph TD
    A[开始统计编码时长] --> B{选择统计方式}
    B -->|基于Git提交记录| C[Git提交分析]
    B -->|基于VSCode扩展| D[实时编码跟踪]
    B -->|基于文件修改| E[文件修改分析]
    
    C --> F[获取本周Git提交]
    F --> G[计算提交间隔]
    G --> H[估算编码时长]
    
    D --> I[监听编辑器活动]
    I --> J[记录编码会话]
    J --> K[计算累计时长]
    
    E --> L[查找本周修改文件]
    L --> M[按小时分组统计]
    M --> N[估算编码时长]
    
    H --> O[生成统计报告]
    K --> O
    N --> O
    
    O --> P[展示本周编码时长]
```

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| Git提交分析 | 无需额外工具，基于已有Git记录 | 依赖提交频率，可能不够精确 | 有规律提交代码的项目 |
| VSCode扩展 | 实时精确统计，可视化展示 | 需要安装扩展，仅限VSCode | 需要精确统计的开发者 |
| 文件修改分析 | 简单快速，无需特殊配置 | 精度较低，可能包含非编码修改 | 快速了解大致编码量 |

## 使用方法

### 方案一：基于Git提交记录

```bash
# TypeScript版本
npm run coding-time

# Python版本
npm run coding-time:py
# 或直接运行
python scripts/coding_time.py
```

### 方案二：VSCode扩展

1. 进入扩展目录：`cd scripts/vscode-extension/coding-time-tracker`
2. 安装依赖：`npm install`
3. 编译扩展：`npm run compile`
4. 在VSCode中按F5调试运行，或打包后安装

### 方案三：基于文件修改时间

```bash
# 直接运行
npx ts-node scripts/quick-coding-time.ts
```

## 技术栈

- TypeScript/Node.js
- Python 3
- VSCode Extension API
- Git命令行工具
