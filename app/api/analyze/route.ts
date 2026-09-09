import { NextResponse } from "next/server";
import { analyzeGitWindow, fetchRepository, parseRepository } from "@/lib/github";
import type { GrowthEpisode } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      repository?: string;
      episode?: GrowthEpisode;
      locale?: "en" | "zh";
    };
    const parsed = parseRepository(body.repository ?? "");
    if (!body.episode?.start || !body.episode?.end || !body.episode?.peakDate) {
      throw new Error("Choose a growth episode first.");
    }
    const repository = await fetchRepository(parsed.owner, parsed.repo);
    const result = await analyzeGitWindow(
      repository,
      body.episode,
      body.locale === "zh" ? "zh" : "en",
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Git investigation could not be completed.",
      },
      { status: 400 },
    );
  }
}
