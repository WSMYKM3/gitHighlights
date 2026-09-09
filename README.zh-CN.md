# GitHighlights

[English](README.md) | [简体中文](README.zh-CN.md)

[在线体验](https://wsmykm3.github.io/gitHighlights/)

> 读懂增长曲线背后的代码变化。

GitHighlights 是一款面向公开仓库的增长洞察工具，它把 GitHub Star 的异常增长事件与此前发生的提交、发布版本联系起来，帮助维护者、贡献者和开发者从“仓库何时开始加速增长”进一步理解“这个时间点附近发生了什么变化”，同时避免把相关性误认为因果关系。

输入任意公开 GitHub 仓库的 `owner/repository`，或直接粘贴 GitHub URL。GitHighlights 会重建仓库的 Star 历史、检测统计意义上异常的增长区间，并为你选择的增长事件生成一份有证据支持的分析报告。

## 功能特点

- 使用 OSS Insight 和 GitHub 数据重建并标准化累计 Star 历史。
- 根据仓库自身的历史基线检测异常增长事件。
- 可以直接从曲线图或排序后的事件列表中选择一个增长区间。
- 支持在英文和简体中文之间切换完整界面及生成的分析内容。
- 检查事件附近的提交、发布版本、文件变化和代码增删量。
- 将证据归类为产品能力、上手体验、API/CLI、架构、性能、兼容性、文档、分发和维护等主题。
- 为分析结论标注置信度，并链接到对应的 GitHub 原始证据。
- 当缺少有意义的 Git 证据时明确说明，而不是编造解释。

## 产品预览

### 1. 输入公开仓库

粘贴 GitHub URL 或输入 `owner/repository`。首页还提供了一组示例仓库，便于快速体验。

![GitHighlights 仓库搜索界面](screenshot/searchbar.png)

### 2. 找到增长加速的关键时刻

Star 轨迹图会在累计增长历史上标记检测到的异常增长事件。仓库信息和事件排行榜提供整体背景，每个高亮区间都可以继续展开调查。

![GitHighlights 增长事件曲线](screenshot/chart.png)

### 3. 调查增长事件附近的 Git 活动

选择一个增长事件后，GitHighlights 会检查对应证据窗口中的提交、发布版本、文件变化和代码增删量，以不同置信度展示审慎的分析结论，并链接到原始证据。如果仓库历史不足以支持某种解释，报告也会如实说明。

![GitHighlights Git 证据报告](screenshot/investigate.png)

## 分析流程

1. 从 GitHub API 获取仓库元数据，从 OSS Insight 获取每日 Star 历史。
2. 将历史数据标准化为连续的每日序列，并与自适应基线比较，识别异常增长事件。
3. 针对选择的事件，检查此前证据窗口中的默认分支提交和已发布版本。
4. 对高价值变化进行排序，并归纳为产品和工程主题。
5. 内置的确定性分类器始终可以生成报告。配置 OpenAI API Key 后，还可以在已有证据范围内使用结构化 AI 综合分析增强结论。

GitHighlights 提供的是辅助判断的证据，而不是因果断言。外部传播、社交平台活动、私有开发，以及未被检查的其他分支变化，也可能解释仓库增长。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000)。

### 可选环境变量

| 变量 | 用途 |
| --- | --- |
| `GITHUB_TOKEN` | 提高 GitHub API 的仓库分析请求限额。 |
| `OPENAI_API_KEY` | 启用基于已收集证据的结构化 AI 综合分析。 |
| `OPENAI_ANALYSIS_MODEL` | 指定综合分析使用的模型。 |

不配置这些变量也可以运行：此时使用 GitHub API 的匿名请求限额，证据报告会回退到内置的确定性分析。

## 验证

```bash
npm run build
npm run lint
node --test tests/*.test.mjs
```

## 技术栈

- Next.js 16 与 React 19
- TypeScript
- Vinext 与 Vite
- Cloudflare Workers 工具链
- OSS Insight、GitHub，以及可选的 OpenAI API
