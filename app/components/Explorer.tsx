"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AnalysisResult,
  Finding,
  GrowthEpisode,
  RepositorySummary,
  StarPoint,
} from "@/lib/types";

type RepositoryResult = {
  repository: RepositorySummary;
  history: StarPoint[];
  episodes: GrowthEpisode[];
  generatedAt: string;
  source: string;
};

type Locale = "en" | "zh";

const copy = {
  en: {
    home: "GitHighlights home",
    headerNote: "Public repository intelligence",
    eyebrow: "Growth, meet Git",
    heroLine: "Read the code",
    heroEmphasis: "behind the curve.",
    heroCopy:
      "Find the moments a repository accelerated, then inspect what changed in its product, structure, documentation, and developer experience.",
    repository: "GitHub repository",
    tracing: "Tracing history…",
    trace: "Trace growth",
    examples: "Example repositories",
    try: "Try",
    analysisPaused: "Analysis paused",
    trajectory: "Star trajectory",
    growthEpisodes: "Growth episodes",
    totalStars: "Total stars",
    detectedEpisode: "Detected episode",
    dailyHistory: "Daily history via",
    refreshed: "refreshed",
    chooseMoment: "Choose a moment",
    episodes: "Episodes",
    noAcceleration: "No clear acceleration found",
    noAccelerationBody:
      "This repository’s history does not contain a statistically strong growth episode under the current detector.",
    investigationStopped: "Investigation stopped",
    evidenceLoadFailed: "The Git evidence could not be loaded.",
    tryAgain: "Try again",
    gitInvestigation: "Git investigation",
    investigateChart: "Investigate directly from the chart.",
    investigateChartBody:
      "Hover over a blue growth band, then run its Git investigation. The evidence report will appear here beside the episode ranking.",
    principle: "Git evidence, not a causal claim.",
    principleBody:
      "GitHighlights explains what changed near growth. It can also conclude that the repository contains no meaningful explanation.",
    footer: "Built for curious maintainers and open-source observers.",
    noDescription: "No repository description provided.",
    stars: "Stars",
    forks: "Forks",
    language: "Language",
    lastPush: "Last push",
    mixed: "Mixed",
    starsGained: "Stars gained",
    peakVelocity: "Peak velocity",
    investigateChanges: "Investigate Git changes",
    reviewWindow: "Reviews the 30 days leading into this episode.",
    baseline: "baseline",
    perDay: "/day",
    investigationLoading:
      "Reviewing commits, releases, changed files, and timing around this growth episode.",
    evidenceReport: "Evidence report",
    gitStory: "The Git story around",
    structuredSynthesis: "Structured AI synthesis",
    deterministicSynthesis: "Deterministic evidence synthesis",
    commitsScanned: "commits scanned",
    releases: "releases",
    filesReviewed: "files reviewed",
    lineMovement: "line movement",
    sourceLedger: "Source ledger",
    reviewedEvidence: "Reviewed Git evidence",
    openRepository: "Open repository ↗",
    noEvidence: "No high-signal Git evidence was found in this window.",
    limit: "Limit",
    confidence: "confidence",
    followingCurve: "Following the curve",
    reconstructing: "Reconstructing star velocity…",
    resolving:
      "Resolving the repository and normalizing its public event history.",
    today: "today",
    yesterday: "yesterday",
    daysAgo: "d ago",
  },
  zh: {
    home: "GitHighlights 首页",
    headerNote: "公开仓库增长洞察",
    eyebrow: "增长曲线，遇见 Git",
    heroLine: "读懂曲线背后的",
    heroEmphasis: "代码变化。",
    heroCopy:
      "找到仓库增长加速的关键时刻，并查看产品、架构、文档和开发者体验发生了哪些变化。",
    repository: "GitHub 仓库",
    tracing: "正在追踪历史…",
    trace: "追踪增长",
    examples: "示例仓库",
    try: "试试",
    analysisPaused: "分析已暂停",
    trajectory: "Star 增长轨迹",
    growthEpisodes: "增长事件",
    totalStars: "Star 总数",
    detectedEpisode: "检测到的事件",
    dailyHistory: "每日历史数据来源",
    refreshed: "更新时间",
    chooseMoment: "选择一个时刻",
    episodes: "增长事件",
    noAcceleration: "未发现明显的增长加速",
    noAccelerationBody: "当前检测器未在该仓库历史中发现统计显著的增长事件。",
    investigationStopped: "调查已停止",
    evidenceLoadFailed: "无法加载 Git 证据。",
    tryAgain: "重试",
    gitInvestigation: "Git 调查",
    investigateChart: "从图表直接开始调查。",
    investigateChartBody:
      "将鼠标悬停在蓝色增长区间并启动 Git 调查，证据报告会显示在事件列表旁。",
    principle: "呈现 Git 证据，而非因果断言。",
    principleBody:
      "GitHighlights 解释增长附近发生了什么变化，也会在缺少有效依据时明确说明。",
    footer: "为好奇的维护者与开源观察者打造。",
    noDescription: "该仓库没有提供描述。",
    stars: "Stars",
    forks: "Forks",
    language: "语言",
    lastPush: "最近推送",
    mixed: "多语言",
    starsGained: "新增 Stars",
    peakVelocity: "峰值速度",
    investigateChanges: "调查 Git 变化",
    reviewWindow: "检查该增长事件发生前 30 天的变化。",
    baseline: "基线",
    perDay: "/天",
    investigationLoading: "正在检查该增长事件附近的提交、发布、文件变化和时间关系。",
    evidenceReport: "证据报告",
    gitStory: "这个日期附近的 Git 故事",
    structuredSynthesis: "结构化 AI 综合分析",
    deterministicSynthesis: "确定性证据分析",
    commitsScanned: "扫描的提交",
    releases: "发布版本",
    filesReviewed: "检查的文件",
    lineMovement: "代码行变化",
    sourceLedger: "来源清单",
    reviewedEvidence: "已检查的 Git 证据",
    openRepository: "打开仓库 ↗",
    noEvidence: "该时间窗口内未发现高价值 Git 证据。",
    limit: "局限",
    confidence: "置信度",
    followingCurve: "正在追踪曲线",
    reconstructing: "正在重建 Star 增长速度…",
    resolving: "正在解析仓库并标准化其公开事件历史。",
    today: "今天",
    yesterday: "昨天",
    daysAgo: "天前",
  },
} as const;

const exampleRepos = [
  "star-history/star-history",
  "openai/codex",
  "oven-sh/bun",
] as const;

export function Explorer() {
  const [locale, setLocale] = useState<Locale>("en");
  const [query, setQuery] = useState("star-history/star-history");
  const [result, setResult] = useState<RepositoryResult | null>(null);
  const [selected, setSelected] = useState<GrowthEpisode | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState("");
  const t = copy[locale];

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const loadRepository = useCallback(async (repository: string) => {
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const response = await fetch("/api/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository }),
      });
      const payload = (await response.json()) as RepositoryResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Analysis failed.");
      setResult(payload);
      setSelected(payload.episodes[0] ?? null);
    } catch (cause) {
      setResult(null);
      setSelected(null);
      setError(cause instanceof Error ? cause.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRepository("star-history/star-history");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRepository]);

  useEffect(() => {
    if (!analyzing) return;
    const timer = window.setInterval(() => {
      setAnalysisStep((step) => Math.min(step + 1, 3));
    }, 1700);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await loadRepository(query);
  }

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    if (analysis) setAnalysis(null);
  }

  async function investigate(targetEpisode = selected) {
    if (!result || !targetEpisode) return;
    setSelected(targetEpisode);
    setAnalysisStep(0);
    setAnalyzing(true);
    setAnalysis(null);
    setError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository: result.repository.fullName,
          episode: targetEpisode,
          locale,
        }),
      });
      const payload = (await response.json()) as AnalysisResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Investigation failed.");
      setAnalysis(payload);
      window.setTimeout(() => {
        document
          .getElementById("evidence-report")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Investigation failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label={t.home}>
          <span className="brand-mark" aria-hidden="true">
            GH
          </span>
          <span>GitHighlights</span>
        </a>
        <div className="header-actions">
          <div className="header-note">
            <span className="live-dot" aria-hidden="true" />
            {t.headerNote}
          </div>
          <div className="language-switch" aria-label="Language / 语言">
            <button
              type="button"
              className={locale === "en" ? "active" : ""}
              aria-pressed={locale === "en"}
              disabled={analyzing}
              onClick={() => changeLocale("en")}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              className={locale === "zh" ? "active" : ""}
              aria-pressed={locale === "zh"}
              disabled={analyzing}
              onClick={() => changeLocale("zh")}
            >
              中文
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span>{t.eyebrow}</span>
          <span className="eyebrow-line" />
        </div>
        <h1>
          {t.heroLine}
          <br />
          <em>{t.heroEmphasis}</em>
        </h1>
        <p className="hero-copy">{t.heroCopy}</p>

        <form className="repo-form" onSubmit={submit}>
          <div className="repo-input-wrap">
            <span className="input-prefix" aria-hidden="true">
              github.com/
            </span>
            <input
              aria-label={t.repository}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="owner/repository"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? t.tracing : t.trace}
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div className="examples" aria-label={t.examples}>
          <span>{t.try}</span>
          {exampleRepos.map((repo) => (
            <button
              type="button"
              key={repo}
              onClick={() => {
                setQuery(repo);
                void loadRepository(repo);
              }}
            >
              {repo}
            </button>
          ))}
        </div>
      </section>

      {error && !result && (
        <div className="error-banner" role="alert">
          <span>{t.analysisPaused}</span>
          {error}
        </div>
      )}

      {loading && !result && <LoadingPanel locale={locale} />}

      {result && (
        <section className="workspace" aria-live="polite">
          <RepositoryHeader repository={result.repository} locale={locale} />

          <div className="chart-card">
            <div className="section-heading chart-heading">
              <div>
                <span className="section-index">01</span>
                <div>
                  <p className="kicker">{t.trajectory}</p>
                  <h2>{t.growthEpisodes}</h2>
                </div>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-line" /> {t.totalStars}
                </span>
                <span>
                  <i className="legend-block" /> {t.detectedEpisode}
                </span>
              </div>
            </div>

            <GrowthChart
              key={result.repository.id}
              history={result.history}
              episodes={result.episodes}
              selected={selected}
              analyzing={analyzing}
              analysisStep={analysisStep}
              locale={locale}
              onSelect={(episode) => {
                setSelected(episode);
                setAnalysis(null);
                setError("");
              }}
              onInvestigate={(episode) => void investigate(episode)}
            />

            <div className="chart-foot">
              <span>
                {formatDate(result.history[0]?.date, locale)} —{" "}
                {formatDate(result.history.at(-1)?.date, locale)}
              </span>
              <span>
                {t.dailyHistory} {result.source} · {t.refreshed}{" "}
                {formatTime(result.generatedAt, locale)}
              </span>
            </div>
          </div>

          <div className="analysis-workbench">
            <section className="episode-panel">
              <div className="section-heading">
                <div>
                  <span className="section-index">02</span>
                  <div>
                    <p className="kicker">{t.chooseMoment}</p>
                    <h2>{t.episodes}</h2>
                  </div>
                </div>
              </div>
              {result.episodes.length > 0 ? (
                <div className="episode-list">
                  {result.episodes.map((episode, index) => (
                    <EpisodeButton
                      key={episode.id}
                      episode={episode}
                      index={index}
                      selected={selected?.id === episode.id}
                      locale={locale}
                      onClick={() => {
                        setSelected(episode);
                        setAnalysis(null);
                        setError("");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>∿</span>
                  <h3>{t.noAcceleration}</h3>
                  <p>{t.noAccelerationBody}</p>
                </div>
              )}
            </section>

            <section className="investigation-results-panel" aria-live="polite">
              {analyzing && selected ? (
                <AnalysisLoading
                  episode={selected}
                  message={analysisSteps[locale][analysisStep]}
                  locale={locale}
                />
              ) : error ? (
                <div className="inline-investigation-error" role="alert">
                  <span>{t.investigationStopped}</span>
                  <h2>{t.evidenceLoadFailed}</h2>
                  <p>{error}</p>
                  <button type="button" onClick={() => void investigate()}>
                    {t.tryAgain}
                  </button>
                </div>
              ) : analysis && selected ? (
                <AnalysisReport
                  analysis={analysis}
                  repository={result.repository}
                  episode={selected}
                  locale={locale}
                />
              ) : (
                <div className="report-placeholder">
                  <span className="report-placeholder-mark" aria-hidden="true">
                    ↗
                  </span>
                  <p className="kicker">{t.gitInvestigation}</p>
                  <h2>{t.investigateChart}</h2>
                  <p>{t.investigateChartBody}</p>
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      <section className="principle-strip">
        <p>{t.principle}</p>
        <div>{t.principleBody}</div>
      </section>

      <footer>
        <span>GitHighlights</span>
        <span>{t.footer}</span>
      </footer>
    </main>
  );
}

function RepositoryHeader({
  repository,
  locale,
}: {
  repository: RepositorySummary;
  locale: Locale;
}) {
  const t = copy[locale];
  return (
    <div className="repo-header">
      <div className="repo-identity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={repository.avatarUrl} alt="" />
        <div>
          <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
            {repository.fullName}
            <span aria-hidden="true">↗</span>
          </a>
          <p>{repository.description || t.noDescription}</p>
        </div>
      </div>
      <dl className="repo-stats">
        <div>
          <dt>{t.stars}</dt>
          <dd>{formatCompact(repository.stars, locale)}</dd>
        </div>
        <div>
          <dt>{t.forks}</dt>
          <dd>{formatCompact(repository.forks, locale)}</dd>
        </div>
        <div>
          <dt>{t.language}</dt>
          <dd>{repository.language || t.mixed}</dd>
        </div>
        <div>
          <dt>{t.lastPush}</dt>
          <dd>{relativeDate(repository.pushedAt, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

function GrowthChart({
  history,
  episodes,
  selected,
  analyzing,
  analysisStep,
  locale,
  onSelect,
  onInvestigate,
}: {
  history: StarPoint[];
  episodes: GrowthEpisode[];
  selected: GrowthEpisode | null;
  analyzing: boolean;
  analysisStep: number;
  locale: Locale;
  onSelect: (episode: GrowthEpisode) => void;
  onInvestigate: (episode: GrowthEpisode) => void;
}) {
  const t = copy[locale];
  const [hovered, setHovered] = useState<GrowthEpisode | null>(null);
  const width = 1000;
  const height = 330;
  const top = 24;
  const bottom = 44;
  const plotHeight = height - top - bottom;
  const maxCount = Math.max(1, ...history.map((point) => point.count));
  const dateIndex = useMemo(
    () => new Map(history.map((point, index) => [point.date, index])),
    [history],
  );
  const xForIndex = (index: number) =>
    history.length <= 1 ? 0 : (index / (history.length - 1)) * width;
  const yForCount = (count: number) =>
    top + plotHeight - (count / maxCount) * plotHeight;
  const sampleEvery = Math.max(1, Math.ceil(history.length / 650));
  const sampled = history.filter(
    (_, index) => index % sampleEvery === 0 || index === history.length - 1,
  );
  const path = sampled
    .map((point, index) => {
      const sourceIndex = dateIndex.get(point.date) ?? 0;
      return `${index === 0 ? "M" : "L"}${xForIndex(sourceIndex).toFixed(2)},${yForCount(point.count).toFixed(2)}`;
    })
    .join(" ");

  const gridValues = [0, 0.25, 0.5, 0.75, 1];
  const hoveredStartIndex = hovered
    ? (dateIndex.get(hovered.start) ?? 0)
    : 0;
  const hoveredEndIndex = hovered
    ? (dateIndex.get(hovered.end) ?? hoveredStartIndex)
    : 0;
  const hoveredCenter =
    hovered === null
      ? 0
      : (xForIndex(hoveredStartIndex) + xForIndex(hoveredEndIndex)) / 2;
  const hoveredPercent = (hoveredCenter / width) * 100;
  const popoverEdge =
    hoveredPercent < 18 ? "left-edge" : hoveredPercent > 82 ? "right-edge" : "";

  return (
    <div
      className="chart-wrap"
      onMouseLeave={() => setHovered(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setHovered(null);
      }}
    >
      <svg
        className="growth-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={
          locale === "zh"
            ? `从 ${history[0]?.date} 到 ${history.at(-1)?.date} 的 Star 历史，共检测到 ${episodes.length} 个增长事件`
            : `Star history from ${history[0]?.date} to ${history.at(-1)?.date}, with ${episodes.length} detected growth episodes`
        }
      >
        {gridValues.map((fraction) => {
          const y = top + plotHeight * (1 - fraction);
          return (
            <g key={fraction}>
              <line className="grid-line" x1="0" x2={width} y1={y} y2={y} />
              <text className="grid-label" x="8" y={y - 7}>
                {formatCompact(maxCount * fraction, locale)}
              </text>
            </g>
          );
        })}

        {episodes.map((episode) => {
          const startIndex = dateIndex.get(episode.start) ?? 0;
          const endIndex = dateIndex.get(episode.end) ?? startIndex;
          const x = xForIndex(startIndex);
          const episodeWidth = Math.max(7, xForIndex(endIndex) - x + 7);
          const isSelected = episode.id === selected?.id;
          return (
            <g
              key={episode.id}
              className={`episode-zone ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(episode)}
              onMouseEnter={() => setHovered(episode)}
              onFocus={() => setHovered(episode)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(episode);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={
                locale === "zh"
                  ? `${formatDate(episode.peakDate, locale)} 增长事件，新增 ${formatCompact(episode.starsGained, locale)} Stars。查看 Git 调查。`
                  : `${formatDate(episode.peakDate, locale)} growth episode, ${formatCompact(episode.starsGained, locale)} stars gained. Show Git investigation.`
              }
            >
              <rect
                x={x}
                y={top}
                width={episodeWidth}
                height={plotHeight}
                rx="3"
              />
              <line
                x1={x + episodeWidth / 2}
                x2={x + episodeWidth / 2}
                y1={top}
                y2={top + plotHeight}
              />
            </g>
          );
        })}

        <path className="star-area" d={`${path} L${width},${top + plotHeight} L0,${top + plotHeight} Z`} />
        <path className="star-line" d={path} />
        <circle
          className="end-dot"
          cx={width}
          cy={yForCount(history.at(-1)?.count ?? 0)}
          r="5"
        />
      </svg>
      {hovered && (
        <aside
          className={`chart-investigation-popover ${popoverEdge}`}
          style={{ left: `${hoveredPercent}%` }}
          aria-live="polite"
        >
          <span className="popover-kicker">{t.gitInvestigation}</span>
          <strong className="popover-date">{formatDate(hovered.peakDate, locale)}</strong>
          <div className="popover-metrics">
            <span>
              <small>{t.starsGained}</small>
              <strong>+{formatCompact(hovered.starsGained, locale)}</strong>
            </span>
            <span>
              <small>{t.peakVelocity}</small>
              <strong>+{formatCompact(hovered.peakDaily, locale)}{t.perDay}</strong>
            </span>
          </div>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => {
              onSelect(hovered);
              onInvestigate(hovered);
            }}
          >
            <span>
              {analyzing
                ? analysisSteps[locale][analysisStep]
                : t.investigateChanges}
            </span>
            <span aria-hidden="true">{analyzing ? "•••" : "→"}</span>
          </button>
          <small className="popover-note">
            {t.reviewWindow}
          </small>
        </aside>
      )}
    </div>
  );
}

function EpisodeButton({
  episode,
  index,
  selected,
  locale,
  onClick,
}: {
  episode: GrowthEpisode;
  index: number;
  selected: boolean;
  locale: Locale;
  onClick: () => void;
}) {
  const t = copy[locale];
  return (
    <button
      type="button"
      className={`episode-row ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="episode-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="episode-date">
        <strong>{formatDate(episode.peakDate, locale)}</strong>
        <small>
          {t.baseline} {formatCompact(episode.baseline, locale)}{t.perDay}
        </small>
      </span>
      <span className="episode-gain">
        <strong>+{formatCompact(episode.starsGained, locale)}</strong>
        <small>{t.starsGained}</small>
      </span>
      <span className="episode-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function AnalysisLoading({
  episode,
  message,
  locale,
}: {
  episode: GrowthEpisode;
  message: string;
  locale: Locale;
}) {
  const t = copy[locale];
  return (
    <div className="analysis-loading" role="status">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div>
        <p className="kicker">{t.gitInvestigation} · {formatDate(episode.peakDate, locale)}</p>
        <h2>{message}</h2>
        <p>{t.investigationLoading}</p>
      </div>
    </div>
  );
}

function AnalysisReport({
  analysis,
  repository,
  episode,
  locale,
}: {
  analysis: AnalysisResult;
  repository: RepositorySummary;
  episode: GrowthEpisode;
  locale: Locale;
}) {
  const t = copy[locale];
  return (
    <section className="report-section" id="evidence-report">
      <div className="report-intro">
        <div>
          <p className="kicker">{t.evidenceReport}</p>
          <h2>
            {t.gitStory}
            <br />
            {formatDate(episode.peakDate, locale)}
          </h2>
        </div>
        <div className="report-meta">
          <span>{analysis.window.from}</span>
          <i>→</i>
          <span>{analysis.window.to}</span>
          <small>
            {analysis.mode === "structured-ai"
              ? t.structuredSynthesis
              : t.deterministicSynthesis}
          </small>
        </div>
      </div>

      <div className="report-stats">
        <ReportStat value={analysis.stats.commitsReviewed} label={t.commitsScanned} />
        <ReportStat value={analysis.stats.releasesReviewed} label={t.releases} />
        <ReportStat value={analysis.stats.filesChanged} label={t.filesReviewed} />
        <ReportStat
          value={`+${formatCompact(analysis.stats.additions, locale)} / −${formatCompact(analysis.stats.deletions, locale)}`}
          label={t.lineMovement}
        />
      </div>

      <div className="findings-grid">
        {analysis.findings.map((finding, index) => (
          <FindingCard
            key={`${finding.classification}-${index}`}
            finding={finding}
            evidence={analysis.evidence}
            index={index}
            locale={locale}
          />
        ))}
      </div>

      <div className="evidence-ledger">
        <div className="ledger-heading">
          <div>
            <p className="kicker">{t.sourceLedger}</p>
            <h3>{t.reviewedEvidence}</h3>
          </div>
          <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
            {t.openRepository}
          </a>
        </div>
        <div className="ledger-list">
          {analysis.evidence.slice(0, 16).map((item) => (
            <a
              className="ledger-row"
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className={`evidence-kind ${item.kind}`}>{item.kind}</span>
              <span className="ledger-title">
                <strong>{item.title}</strong>
                <small>
                  {item.sha ? `${item.sha} · ` : ""}
                  {formatDate(item.date, locale)}
                </small>
              </span>
              <span className="ledger-categories">
                {item.categories.slice(0, 2).map((category) => (
                  <i key={category}>{humanize(category, locale)}</i>
                ))}
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
          {analysis.evidence.length === 0 && (
            <div className="ledger-empty">
              {t.noEvidence}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FindingCard({
  finding,
  evidence,
  index,
  locale,
}: {
  finding: Finding;
  evidence: AnalysisResult["evidence"];
  index: number;
  locale: Locale;
}) {
  const t = copy[locale];
  const linked = evidence.filter((item) =>
    finding.evidenceIds.includes(item.id),
  );
  return (
    <article className={`finding-card ${finding.classification}`}>
      <div className="finding-topline">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="finding-label">{labelFinding(finding.classification, locale)}</span>
        <span className={`confidence ${finding.confidence}`}>
          {labelConfidence(finding.confidence, locale)} {t.confidence}
        </span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.explanation}</p>
      {finding.categories.length > 0 && (
        <div className="category-tags">
          {finding.categories.map((category) => (
            <span key={category}>{humanize(category, locale)}</span>
          ))}
        </div>
      )}
      {linked.length > 0 && (
        <div className="finding-links">
          {linked.slice(0, 3).map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
              {item.sha || item.title}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      )}
      {finding.limitations[0] && (
        <p className="limitation">
          <span>{t.limit}</span>
          {finding.limitations[0]}
        </p>
      )}
    </article>
  );
}

function ReportStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LoadingPanel({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="loading-panel" role="status">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div>
        <p className="kicker">{t.followingCurve}</p>
        <h2>{t.reconstructing}</h2>
        <p>{t.resolving}</p>
      </div>
    </section>
  );
}

const analysisSteps = {
  en: [
    "Collecting Git history…",
    "Reviewing change clusters…",
    "Weighing evidence…",
    "Writing report… may take 30s",
  ],
  zh: [
    "正在收集 Git 历史…",
    "正在检查变化集群…",
    "正在评估证据…",
    "正在撰写报告…可能需要 30 秒",
  ],
} as const;

function formatCompact(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(value);
}

function formatDate(value: string | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function formatTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeDate(value: string, locale: Locale): string {
  const t = copy[locale];
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  );
  if (days === 0) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 30) {
    return locale === "zh" ? `${days} ${t.daysAgo}` : `${days}${t.daysAgo}`;
  }
  return formatDate(value, locale);
}

function labelFinding(
  value: Finding["classification"],
  locale: Locale,
): string {
  const labels = {
    en: {
      likely_enabling_change: "Likely enabling change",
      possible_contributor: "Possible contributor",
      coincident_change: "Coincident change",
      no_git_evidence: "No Git evidence",
    },
    zh: {
      likely_enabling_change: "可能的促进变化",
      possible_contributor: "可能的影响因素",
      coincident_change: "同期变化",
      no_git_evidence: "无 Git 证据",
    },
  } as const;
  return labels[locale][value];
}

function labelConfidence(value: Finding["confidence"], locale: Locale): string {
  if (locale === "en") return value;
  return { high: "高", medium: "中", low: "低" }[value];
}

function humanize(value: string, locale: Locale): string {
  if (locale === "en") return value.replace(/_/g, " ");
  const labels: Record<string, string> = {
    capability: "产品能力",
    onboarding: "上手体验",
    api_cli: "API / CLI",
    architecture: "架构",
    performance: "性能",
    compatibility: "兼容性",
    documentation: "文档",
    distribution: "分发",
    maintenance: "维护",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}
