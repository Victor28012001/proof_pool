import { NextResponse } from "next/server";
import { getBountyBundle, submitJudgeScore, updateBountyStatus, ensureSchema } from "@/lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params; // FIX: await the params Promise
  
  try {
    const { judge_address, team_id, creativity, execution, impact, presentation, overall, feedback } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    
    await submitJudgeScore(bountyId, judge_address, {
      team_id,
      creativity,
      execution,
      impact,
      presentation,
      overall,
      feedback
    });
    
    const updatedBundle = await getBountyBundle(bountyId);
    
    // Check if all judges scored
    const allJudgesScored = updatedBundle?.judges.every(j => j.score_submitted);
    if (allJudgesScored && updatedBundle?.bounty.status === "votes_revealed") {
      await updateBountyStatus(bountyId, "judging_complete");
    }
    
    return NextResponse.json(updatedBundle);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}