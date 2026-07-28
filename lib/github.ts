import type {
  AnalysisResult,
  ChangeCategory,
  Evidence,
  Finding,
  GrowthEpisode,
  RepositorySummary,
} from "./types";

const GITHUB_API = "https://api.github.com";
const OSS_INSIGHT_API = "https://api.ossinsight.io/v1";
const MAX_COMMIT_DETAILS = 8;
const MAX_COMMIT_EVIDENCE = 16;

type GitHubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  created_at: string;
  pushed_at: string;
  language: string | null;
  owner: { login: string; avatar_url: string };
};

export function parseRepository(value: string): { owner: string; repo: string } {
  const trimmed = value.trim().replace(/\/+$/, "");
  const match = trimmed.match(
    /^(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/,
  );
  if (!match) {
    throw new Error("Enter a GitHub repository like owner/repository.");
  }
  return { owner: match[1], repo: match[2] };
}

export async function fetchRepository(
  owner: string,
  repo: string,
): Promise<RepositorySummary> {
  const data = await githubFetch<GitHubRepoResponse>(`/repos/${owner}/${repo}`);
  return {
    id: data.id,
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    htmlUrl: data.html_url,
    avatarUrl: data.owner.avatar_url,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    defaultBranch: data.default_branch,
    createdAt: data.created_at,
    pushedAt: data.pushed_at,
  };
}

export async function fetchStarHistory(
  owner: string,
  repo: string,
  from: string,
  to: string,
): Promise<Array<{ date: string; count: number }>> {
  const start = new Date(`${from.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${to.slice(0, 10)}T00:00:00Z`);
  const chunkDays = 1_500;
  const dayMs = 86_400_000;
  const ranges: Array<{ from: string; to: string }> = [];

  for (
    let cursor = start.getTime();
    cursor <= end.getTime();
    cursor += chunkDays * dayMs
  ) {
    ranges.push({
      from: new Date(cursor).toISOString().slice(0, 10),
      to: new Date(
        Math.min(end.getTime(), cursor + (chunkDays - 1) * dayMs),
      )
        .toISOString()
        .slice(0, 10),
    });
  }

  const chunks = await Promise.all(
    ranges.map((range) =>
      fetchStarHistoryRange(owner, repo, range.from, range.to),
    ),
  );
  return chunks.flat();
}

async function fetchStarHistoryRange(
  owner: string,
  repo: string,
  from: string,
  to: string,
): Promise<Array<{ date: string; count: number }>> {
  const url = new URL(
    `${OSS_INSIGHT_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers/history/`,
  );
  url.searchParams.set("per", "day");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`Star history is temporarily unavailable (${response.status}).`);
  }
  const payload = (await response.json()) as {
    data?: { rows?: Array<{ date: string; stargazers: string | number }> };
  };
  return (payload.data?.rows ?? []).map((row) => ({
    date: row.date,
    count: Number(row.stargazers),
  }));
}

export async function analyzeGitWindow(
  repository: RepositorySummary,
  episode: GrowthEpisode,
): Promise<AnalysisResult> {
  const spikeStart = new Date(`${episode.start}T00:00:00Z`);
  const spikeEnd = new Date(`${episode.end}T23:59:59Z`);
  const from = new Date(spikeStart);
  from.setUTCDate(from.getUTCDate() - 30);
  const to = new Date(spikeEnd);
  to.setUTCDate(to.getUTCDate() + 3);

  const [commits, releases] = await Promise.all([
    fetchCommits(
      repository.owner,
      repository.name,
      repository.defaultBranch,
      from.toISOString(),
      to.toISOString(),
    ),
    fetchReleases(repository.owner, repository.name).catch(() => []),
  ]);
  const nearbyReleases = releases.filter((release) => {
    const published = new Date(release.published_at ?? release.created_at);
    return published >= shiftDays(from, -60) && published <= to;
  });

  const rankedCommits = rankCommits(commits).slice(0, MAX_COMMIT_EVIDENCE);
  const detailTargets = rankedCommits.slice(0, MAX_COMMIT_DETAILS);
  const details = await Promise.all(
    detailTargets.map((commit) =>
      fetchCommitDetail(repository.owner, repository.name, commit.sha).catch(
        () => null,
      ),
    ),
  );

  const detailsBySha = new Map(
    details
      .filter((detail): detail is GitHubCommitDetail => detail !== null)
      .map((detail) => [detail.sha, detail]),
  );
  const commitEvidence = rankedCommits.map((commit) => {
    const detail = detailsBySha.get(commit.sha);
    return detail ? toCommitEvidence(detail) : toCommitListEvidence(commit);
  });
  const releaseEvidence = nearbyReleases.map(toReleaseEvidence);
  const evidence = [...releaseEvidence, ...commitEvidence].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const findings = buildFindings(evidence, episode);
  const aiFindings = await enhanceWithAI(repository, episode, findings, evidence);
  const allFiles = new Set(commitEvidence.flatMap((item) => item.files ?? []));

  return {
    repo: repository.fullName,
    window: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    findings: aiFindings ?? findings,
    evidence,
    stats: {
      commitsReviewed: commits.length,
      releasesReviewed: nearbyReleases.length,
      filesChanged: allFiles.size,
      additions: commitEvidence.reduce(
        (sum, item) => sum + (item.additions ?? 0),
        0,
      ),
      deletions: commitEvidence.reduce(
        (sum, item) => sum + (item.deletions ?? 0),
        0,
      ),
    },
    mode: aiFindings ? "structured-ai" : "deterministic",
  };
}

type GitHubCommitListItem = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string } | null;
    committer: { date: string } | null;
  };
};

type GitHubCommitDetail = GitHubCommitListItem & {
  stats?: { additions: number; deletions: number; total: number };
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
    status: string;
  }>;
};

type GitHubRelease = {
  id: number;
  html_url: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  created_at: string;
  published_at: string | null;
  prerelease: boolean;
};

async function fetchCommits(
  owner: string,
  repo: string,
  branch: string,
  since: string,
  until: string,
): Promise<GitHubCommitListItem[]> {
  const query = new URLSearchParams({
    sha: branch,
    since,
    until,
    per_page: "50",
  });
  return githubFetch(`/repos/${owner}/${repo}/commits?${query.toString()}`);
}

async function fetchCommitDetail(
  owner: string,
  repo: string,
  sha: string,
): Promise<GitHubCommitDetail> {
  return githubFetch(`/repos/${owner}/${repo}/commits/${sha}`, 10_000, false);
}

async function fetchReleases(
  owner: string,
  repo: string,
): Promise<GitHubRelease[]> {
  return githubFetch(`/repos/${owner}/${repo}/releases?per_page=20`, 5_000, false);
}

async function githubFetch<T>(
  path: string,
  timeoutMs = 12_000,
  retry = true,
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "GitHighlights/0.1",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (retry) {
      await delay(300);
      return githubFetch(path, timeoutMs, false);
    }
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || /timeout|aborted/i.test(error.message))
    ) {
      throw new Error("GitHub took too long to answer. Please try again.");
    }
    throw error;
  }
  if (!response.ok) {
    if (response.status >= 500) {
      if (retry) {
        await response.body?.cancel();
        await delay(300);
        return githubFetch(path, timeoutMs, false);
      }
      throw new Error(
        `GitHub is temporarily unavailable (${response.status}). Please try again.`,
      );
    }
    const rateRemaining = response.headers.get("x-ratelimit-remaining");
    if (response.status === 403 && rateRemaining === "0") {
      throw new Error("GitHub’s request limit was reached. Try again later.");
    }
    if (response.status === 404) {
      throw new Error("That public GitHub repository was not found.");
    }
    const body = (await response.text()).slice(0, 300);
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      detail = parsed.message ?? body;
    } catch {
      // Keep GitHub's original response when it is not JSON.
    }
    throw new Error(
      `GitHub returned ${response.status}${detail ? `: ${detail}` : "."}`,
    );
  }
  return response.json() as Promise<T>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function rankCommits(commits: GitHubCommitListItem[]): GitHubCommitListItem[] {
  const highSignal =
    /\b(add|introduc|support|launch|release|implement|redesign|rewrite|migrat|performance|faster|install|setup|docs?|readme|example|demo|api|cli|plugin|integration|compatib|accessib)\b/i;
  const lowSignal =
    /\b(deps?|dependency|chore|lint|format|typo|merge branch|bump|renovate|dependabot)\b/i;
  return [...commits].sort((a, b) => {
    const score = (item: GitHubCommitListItem) => {
      const message = item.commit.message;
      return (highSignal.test(message) ? 3 : 0) - (lowSignal.test(message) ? 2 : 0);
    };
    return score(b) - score(a);
  });
}

function toCommitEvidence(detail: GitHubCommitDetail): Evidence {
  const files = (detail.files ?? []).map((file) => file.filename);
  const categories = categorize(detail.commit.message, files);
  return {
    id: `commit:${detail.sha}`,
    kind: "commit",
    title: firstLine(detail.commit.message),
    url: detail.html_url,
    date:
      detail.commit.author?.date ??
      detail.commit.committer?.date ??
      new Date().toISOString(),
    sha: detail.sha.slice(0, 7),
    additions: detail.stats?.additions ?? 0,
    deletions: detail.stats?.deletions ?? 0,
    files: files.slice(0, 12),
    categories,
  };
}

function toCommitListEvidence(commit: GitHubCommitListItem): Evidence {
  return {
    id: `commit:${commit.sha}`,
    kind: "commit",
    title: firstLine(commit.commit.message),
    url: commit.html_url,
    date:
      commit.commit.author?.date ??
      commit.commit.committer?.date ??
      new Date().toISOString(),
    sha: commit.sha.slice(0, 7),
    categories: categorize(commit.commit.message, []),
  };
}

function toReleaseEvidence(release: GitHubRelease): Evidence {
  return {
    id: `release:${release.id}`,
    kind: "release",
    title: release.name || release.tag_name,
    url: release.html_url,
    date: release.published_at ?? release.created_at,
    categories: categorize(`${release.name ?? ""} ${release.body ?? ""}`, []),
    summary: cleanText(release.body ?? "").slice(0, 320) || undefined,
  };
}

function categorize(message: string, files: string[]): ChangeCategory[] {
  const haystack = `${message} ${files.join(" ")}`.toLowerCase();
  const categories = new Set<ChangeCategory>();
  const add = (category: ChangeCategory, pattern: RegExp) => {
    if (pattern.test(haystack)) categories.add(category);
  };
  add("onboarding", /\b(install|setup|quickstart|getting.started|onboard|readme|example|demo)\b/);
  add("api_cli", /\b(api|cli|command|endpoint|sdk|interface)\b/);
  add("architecture", /\b(refactor|architecture|core|plugin|modular|rewrite|migrat)\b/);
  add("performance", /\b(perf|performance|faster|speed|cache|latency|memory|optim)\b/);
  add("compatibility", /\b(support|compatib|windows|linux|macos|browser|mobile|python|node|platform)\b/);
  add("documentation", /\b(docs?|readme|guide|example|tutorial|\.md\b|screenshot)\b/);
  add("distribution", /\b(release|package|docker|deploy|npm|pypi|brew|binary|installer|ci\/|workflow)\b/);
  add("capability", /\b(add|introduc|feature|implement|new|enable|support)\b/);
  add("maintenance", /\b(chore|depend|lint|format|test|cleanup|typo|bump)\b/);
  return categories.size > 0 ? [...categories] : ["maintenance"];
}

function buildFindings(evidence: Evidence[], episode: GrowthEpisode): Finding[] {
  const releases = evidence.filter((item) => item.kind === "release");
  const commits = evidence.filter((item) => item.kind === "commit");
  const userFacing = new Set<ChangeCategory>([
    "capability",
    "onboarding",
    "api_cli",
    "performance",
    "compatibility",
    "documentation",
    "distribution",
  ]);
  const meaningful = commits.filter((item) =>
    item.categories.some((category) => userFacing.has(category)),
  );
  const findings: Finding[] = [];

  if (releases.length > 0) {
    const release = releases[0];
    findings.push({
      classification: "possible_contributor",
      title: `A release framed the changes: ${release.title}`,
      explanation:
        "A published release falls inside the adaptive pre-spike window. Releases can make accumulated work easier to understand and adopt, but timing alone cannot establish that it caused the growth.",
      categories: release.categories,
      confidence: "medium",
      evidenceIds: [release.id],
      limitations: ["Repository evidence does not show how new visitors discovered the release."],
    });
  }

  const categoryGroups = new Map<ChangeCategory, Evidence[]>();
  for (const item of meaningful) {
    for (const category of item.categories) {
      if (!userFacing.has(category)) continue;
      const group = categoryGroups.get(category) ?? [];
      group.push(item);
      categoryGroups.set(category, group);
    }
  }

  for (const [category, items] of [...categoryGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)) {
    const churn = items.reduce(
      (sum, item) => sum + (item.additions ?? 0) + (item.deletions ?? 0),
      0,
    );
    const beforePeak = items.filter((item) => item.date.slice(0, 10) <= episode.peakDate);
    const classification =
      items.length >= 2 && beforePeak.length > 0 && category !== "documentation"
        ? "likely_enabling_change"
        : "possible_contributor";
    findings.push({
      classification,
      title: categoryTitle(category),
      explanation: `${items.length} high-signal change${items.length === 1 ? "" : "s"} in this theme landed near the growth episode${churn > 0 ? `, touching roughly ${formatNumber(churn)} changed lines across the reviewed commits` : ""}. The sequence is consistent with an enabling change, while the star chart alone cannot prove causality.`,
      categories: [category],
      confidence: classification === "likely_enabling_change" ? "medium" : "low",
      evidenceIds: items.slice(0, 5).map((item) => item.id),
      limitations: [
        "Only the default branch and published releases are analyzed in this version.",
      ],
    });
  }

  if (findings.length === 0) {
    findings.push({
      classification: "no_git_evidence",
      title: "No meaningful Git change aligns with this episode",
      explanation:
        "The reviewed window contains no strong user-facing commit or release signal. The growth should not be attributed to repository changes without additional evidence.",
      categories: [],
      confidence: "high",
      evidenceIds: [],
      limitations: [
        "External discovery and private development activity are outside this analysis.",
      ],
    });
  }

  return findings.slice(0, 4);
}

async function enhanceWithAI(
  repository: RepositorySummary,
  episode: GrowthEpisode,
  fallback: Finding[],
  evidence: Evidence[],
): Promise<Finding[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || evidence.length === 0) return null;
  const compactEvidence = evidence.slice(0, 24).map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    date: item.date,
    categories: item.categories,
    additions: item.additions,
    deletions: item.deletions,
    files: item.files?.slice(0, 8),
    summary: item.summary,
  }));
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      findings: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            classification: {
              type: "string",
              enum: [
                "likely_enabling_change",
                "possible_contributor",
                "coincident_change",
                "no_git_evidence",
              ],
            },
            title: { type: "string" },
            explanation: { type: "string" },
            categories: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "capability",
                  "onboarding",
                  "api_cli",
                  "architecture",
                  "performance",
                  "compatibility",
                  "documentation",
                  "distribution",
                  "maintenance",
                ],
              },
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            evidenceIds: { type: "array", items: { type: "string" } },
            limitations: { type: "array", items: { type: "string" } },
          },
          required: [
            "classification",
            "title",
            "explanation",
            "categories",
            "confidence",
            "evidenceIds",
            "limitations",
          ],
        },
      },
    },
    required: ["findings"],
  };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.6",
        input: [
          {
            role: "system",
            content:
              "You analyze whether repository changes plausibly enabled GitHub star growth. Use only supplied evidence. Never claim causality. Prefer no_git_evidence when support is weak. Every claim must cite evidence IDs.",
          },
          {
            role: "user",
            content: JSON.stringify({
              repository: repository.fullName,
              episode,
              deterministicFindings: fallback,
              evidence: compactEvidence,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "git_growth_findings",
            strict: true,
            schema,
          },
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const text = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!text) return null;
    const parsed = JSON.parse(text) as { findings?: Finding[] };
    return parsed.findings?.length ? parsed.findings : null;
  } catch {
    return null;
  }
}

function categoryTitle(category: ChangeCategory): string {
  const titles: Record<ChangeCategory, string> = {
    capability: "New capabilities expanded what the project could do",
    onboarding: "Adoption became easier",
    api_cli: "The public interface became more useful",
    architecture: "The project’s structure changed substantially",
    performance: "Performance work improved the experience",
    compatibility: "The project reached more environments",
    documentation: "The project became easier to understand",
    distribution: "Packaging and delivery improved",
    maintenance: "Maintenance activity occurred nearby",
  };
  return titles[category];
}

function firstLine(value: string): string {
  return value.split(/\r?\n/, 1)[0].slice(0, 180);
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}
