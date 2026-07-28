import { NextResponse } from "next/server";
import {
  fetchRepository,
  fetchStarHistory,
  parseRepository,
} from "@/lib/github";
import { detectGrowthEpisodes, normalizeHistory } from "@/lib/spikes";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { repository?: string };
    const parsed = parseRepository(body.repository ?? "");
    const repository = await fetchRepository(parsed.owner, parsed.repo);
    const today = new Date();
    const rawHistory = await fetchStarHistory(
      repository.owner,
      repository.name,
      repository.createdAt,
      today.toISOString(),
    );
    const history = normalizeHistory(
      rawHistory,
      repository.createdAt,
      repository.stars,
      today,
    );
    const episodes = detectGrowthEpisodes(history);

    return NextResponse.json({
      repository,
      history,
      episodes,
      generatedAt: new Date().toISOString(),
      source: "OSS Insight + GitHub",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The repository could not be analyzed.",
      },
      { status: 400 },
    );
  }
}
