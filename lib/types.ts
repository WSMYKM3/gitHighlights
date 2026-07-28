export type StarPoint = {
  date: string;
  count: number;
  daily: number;
};

export type GrowthEpisode = {
  id: string;
  start: string;
  end: string;
  peakDate: string;
  baseline: number;
  peakDaily: number;
  starsGained: number;
  excessStars: number;
  score: number;
};

export type RepositorySummary = {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  avatarUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  defaultBranch: string;
  createdAt: string;
  pushedAt: string;
};

export type Evidence = {
  id: string;
  kind: "commit" | "release";
  title: string;
  url: string;
  date: string;
  sha?: string;
  additions?: number;
  deletions?: number;
  files?: string[];
  categories: ChangeCategory[];
  summary?: string;
};

export type ChangeCategory =
  | "capability"
  | "onboarding"
  | "api_cli"
  | "architecture"
  | "performance"
  | "compatibility"
  | "documentation"
  | "distribution"
  | "maintenance";

export type Finding = {
  classification:
    | "likely_enabling_change"
    | "possible_contributor"
    | "coincident_change"
    | "no_git_evidence";
  title: string;
  explanation: string;
  categories: ChangeCategory[];
  confidence: "high" | "medium" | "low";
  evidenceIds: string[];
  limitations: string[];
};

export type AnalysisResult = {
  repo: string;
  window: { from: string; to: string };
  findings: Finding[];
  evidence: Evidence[];
  stats: {
    commitsReviewed: number;
    releasesReviewed: number;
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  mode: "structured-ai" | "deterministic";
};
