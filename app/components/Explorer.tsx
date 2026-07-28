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

const exampleRepos = [
  "star-history/star-history",
  "openai/codex",
  "oven-sh/bun",
] as const;

export function Explorer() {
  const [query, setQuery] = useState("star-history/star-history");
  const [result, setResult] = useState<RepositoryResult | null>(null);
  const [selected, setSelected] = useState<GrowthEpisode | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState("");

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
        <a className="brand" href="#" aria-label="GitHighlights home">
          <span className="brand-mark" aria-hidden="true">
            GH
          </span>
          <span>GitHighlights</span>
        </a>
        <div className="header-note">
          <span className="live-dot" aria-hidden="true" />
          Public repository intelligence
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span>Growth, meet Git</span>
          <span className="eyebrow-line" />
        </div>
        <h1>
          Read the code
          <br />
          <em>behind the curve.</em>
        </h1>
        <p className="hero-copy">
          Find the moments a repository accelerated, then inspect what changed
          in its product, structure, documentation, and developer experience.
        </p>

        <form className="repo-form" onSubmit={submit}>
          <div className="repo-input-wrap">
            <span className="input-prefix" aria-hidden="true">
              github.com/
            </span>
            <input
              aria-label="GitHub repository"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="owner/repository"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Tracing history…" : "Trace growth"}
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div className="examples" aria-label="Example repositories">
          <span>Try</span>
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
          <span>Analysis paused</span>
          {error}
        </div>
      )}

      {loading && !result && <LoadingPanel />}

      {result && (
        <section className="workspace" aria-live="polite">
          <RepositoryHeader repository={result.repository} />

          <div className="chart-card">
            <div className="section-heading chart-heading">
              <div>
                <span className="section-index">01</span>
                <div>
                  <p className="kicker">Star trajectory</p>
                  <h2>Growth episodes</h2>
                </div>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-line" /> Total stars
                </span>
                <span>
                  <i className="legend-block" /> Detected episode
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
              onSelect={(episode) => {
                setSelected(episode);
                setAnalysis(null);
                setError("");
              }}
              onInvestigate={(episode) => void investigate(episode)}
            />

            <div className="chart-foot">
              <span>
                {formatDate(result.history[0]?.date)} —{" "}
                {formatDate(result.history.at(-1)?.date)}
              </span>
              <span>
                Daily history via {result.source} · refreshed{" "}
                {formatTime(result.generatedAt)}
              </span>
            </div>
          </div>

          <div className="investigation-grid">
            <section className="episode-panel">
              <div className="section-heading">
                <div>
                  <span className="section-index">02</span>
                  <div>
                    <p className="kicker">Choose a moment</p>
                    <h2>Episodes</h2>
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
                      onClick={() => {
                        setSelected(episode);
                        setAnalysis(null);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>∿</span>
                  <h3>No clear acceleration found</h3>
                  <p>
                    This repository’s history does not contain a statistically
                    strong growth episode under the current detector.
                  </p>
                </div>
              )}
            </section>

            <section className="selection-panel">
              <div className="section-heading">
                <div>
                  <span className="section-index">03</span>
                  <div>
                    <p className="kicker">Git investigation</p>
                    <h2>What changed?</h2>
                  </div>
                </div>
              </div>

              {selected ? (
                <>
                  <SelectedEpisode episode={selected} />
                  <button
                    className="investigate-button"
                    type="button"
                    onClick={() => void investigate()}
                    disabled={analyzing}
                  >
                    <span>
                      {analyzing
                        ? analysisSteps[analysisStep]
                        : analysis
                          ? "Run investigation again"
                          : "Investigate Git changes"}
                    </span>
                    <span aria-hidden="true">{analyzing ? "•••" : "→"}</span>
                  </button>
                  <p className="method-note">
                    Reviews the default branch, releases, and high-signal file
                    changes in an adaptive pre-spike window.
                  </p>
                  {error && (
                    <div className="investigation-error" role="alert">
                      <strong>Investigation stopped</strong>
                      <span>{error}</span>
                      <button type="button" onClick={() => void investigate()}>
                        Try again
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state compact">
                  <span>←</span>
                  <h3>Select an episode</h3>
                  <p>Choose a marked growth period to inspect its Git history.</p>
                </div>
              )}
            </section>
          </div>

          {analysis && (
            <AnalysisReport
              analysis={analysis}
              repository={result.repository}
              episode={selected!}
            />
          )}
        </section>
      )}

      <section className="principle-strip">
        <p>Git evidence, not a causal claim.</p>
        <div>
          GitHighlights explains what changed near growth. It can also conclude
          that the repository contains no meaningful explanation.
        </div>
      </section>

      <footer>
        <span>GitHighlights</span>
        <span>Built for curious maintainers and open-source observers.</span>
      </footer>
    </main>
  );
}

function RepositoryHeader({ repository }: { repository: RepositorySummary }) {
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
          <p>{repository.description || "No repository description provided."}</p>
        </div>
      </div>
      <dl className="repo-stats">
        <div>
          <dt>Stars</dt>
          <dd>{formatCompact(repository.stars)}</dd>
        </div>
        <div>
          <dt>Forks</dt>
          <dd>{formatCompact(repository.forks)}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{repository.language || "Mixed"}</dd>
        </div>
        <div>
          <dt>Last push</dt>
          <dd>{relativeDate(repository.pushedAt)}</dd>
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
  onSelect,
  onInvestigate,
}: {
  history: StarPoint[];
  episodes: GrowthEpisode[];
  selected: GrowthEpisode | null;
  analyzing: boolean;
  analysisStep: number;
  onSelect: (episode: GrowthEpisode) => void;
  onInvestigate: (episode: GrowthEpisode) => void;
}) {
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
        aria-label={`Star history from ${history[0]?.date} to ${history.at(-1)?.date}, with ${episodes.length} detected growth episodes`}
      >
        {gridValues.map((fraction) => {
          const y = top + plotHeight * (1 - fraction);
          return (
            <g key={fraction}>
              <line className="grid-line" x1="0" x2={width} y1={y} y2={y} />
              <text className="grid-label" x="8" y={y - 7}>
                {formatCompact(maxCount * fraction)}
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
              aria-label={`${formatDate(episode.peakDate)} growth episode, ${formatCompact(episode.starsGained)} stars gained. Show Git investigation.`}
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
          <span className="popover-kicker">Git investigation</span>
          <strong className="popover-date">{formatDate(hovered.peakDate)}</strong>
          <div className="popover-metrics">
            <span>
              <small>Stars gained</small>
              <strong>+{formatCompact(hovered.starsGained)}</strong>
            </span>
            <span>
              <small>Peak velocity</small>
              <strong>+{formatCompact(hovered.peakDaily)}/day</strong>
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
                ? analysisSteps[analysisStep]
                : "Investigate Git changes"}
            </span>
            <span aria-hidden="true">{analyzing ? "•••" : "→"}</span>
          </button>
          <small className="popover-note">
            Reviews the 30 days leading into this episode.
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
  onClick,
}: {
  episode: GrowthEpisode;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`episode-row ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="episode-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="episode-date">
        <strong>{formatDate(episode.peakDate)}</strong>
        <small>
          baseline {formatCompact(episode.baseline)}/day
        </small>
      </span>
      <span className="episode-gain">
        <strong>+{formatCompact(episode.starsGained)}</strong>
        <small>stars gained</small>
      </span>
      <span className="episode-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function SelectedEpisode({ episode }: { episode: GrowthEpisode }) {
  const acceleration =
    episode.baseline > 0
      ? Math.round(episode.peakDaily / episode.baseline)
      : episode.peakDaily;
  return (
    <div className="selected-episode">
      <div className="selected-date">
        <span>Peak</span>
        <strong>{formatDate(episode.peakDate)}</strong>
      </div>
      <div className="selected-metrics">
        <div>
          <span>Peak velocity</span>
          <strong>+{formatCompact(episode.peakDaily)}/day</strong>
        </div>
        <div>
          <span>Above baseline</span>
          <strong>{formatCompact(episode.excessStars)} stars</strong>
        </div>
        <div>
          <span>Acceleration</span>
          <strong>{formatCompact(acceleration)}×</strong>
        </div>
      </div>
    </div>
  );
}

function AnalysisReport({
  analysis,
  repository,
  episode,
}: {
  analysis: AnalysisResult;
  repository: RepositorySummary;
  episode: GrowthEpisode;
}) {
  return (
    <section className="report-section" id="evidence-report">
      <div className="report-intro">
        <div>
          <p className="kicker">Evidence report</p>
          <h2>
            The Git story around
            <br />
            {formatDate(episode.peakDate)}
          </h2>
        </div>
        <div className="report-meta">
          <span>{analysis.window.from}</span>
          <i>→</i>
          <span>{analysis.window.to}</span>
          <small>
            {analysis.mode === "structured-ai"
              ? "Structured AI synthesis"
              : "Deterministic evidence synthesis"}
          </small>
        </div>
      </div>

      <div className="report-stats">
        <ReportStat value={analysis.stats.commitsReviewed} label="commits scanned" />
        <ReportStat value={analysis.stats.releasesReviewed} label="releases" />
        <ReportStat value={analysis.stats.filesChanged} label="files reviewed" />
        <ReportStat
          value={`+${formatCompact(analysis.stats.additions)} / −${formatCompact(analysis.stats.deletions)}`}
          label="line movement"
        />
      </div>

      <div className="findings-grid">
        {analysis.findings.map((finding, index) => (
          <FindingCard
            key={`${finding.classification}-${index}`}
            finding={finding}
            evidence={analysis.evidence}
            index={index}
          />
        ))}
      </div>

      <div className="evidence-ledger">
        <div className="ledger-heading">
          <div>
            <p className="kicker">Source ledger</p>
            <h3>Reviewed Git evidence</h3>
          </div>
          <a href={repository.htmlUrl} target="_blank" rel="noreferrer">
            Open repository ↗
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
                  {formatDate(item.date)}
                </small>
              </span>
              <span className="ledger-categories">
                {item.categories.slice(0, 2).map((category) => (
                  <i key={category}>{humanize(category)}</i>
                ))}
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
          {analysis.evidence.length === 0 && (
            <div className="ledger-empty">
              No high-signal Git evidence was found in this window.
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
}: {
  finding: Finding;
  evidence: AnalysisResult["evidence"];
  index: number;
}) {
  const linked = evidence.filter((item) =>
    finding.evidenceIds.includes(item.id),
  );
  return (
    <article className={`finding-card ${finding.classification}`}>
      <div className="finding-topline">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="finding-label">{labelFinding(finding.classification)}</span>
        <span className={`confidence ${finding.confidence}`}>
          {finding.confidence} confidence
        </span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.explanation}</p>
      {finding.categories.length > 0 && (
        <div className="category-tags">
          {finding.categories.map((category) => (
            <span key={category}>{humanize(category)}</span>
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
          <span>Limit</span>
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

function LoadingPanel() {
  return (
    <section className="loading-panel" role="status">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div>
        <p className="kicker">Following the curve</p>
        <h2>Reconstructing star velocity…</h2>
        <p>Resolving the repository and normalizing its public event history.</p>
      </div>
    </section>
  );
}

const analysisSteps = [
  "Collecting Git history…",
  "Reviewing change clusters…",
  "Weighing evidence…",
  "Writing report… may take 30s",
];

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(value);
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeDate(value: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function labelFinding(value: Finding["classification"]): string {
  return {
    likely_enabling_change: "Likely enabling change",
    possible_contributor: "Possible contributor",
    coincident_change: "Coincident change",
    no_git_evidence: "No Git evidence",
  }[value];
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}
