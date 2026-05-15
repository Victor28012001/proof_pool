import { NextResponse } from "next/server";
import { getBountyBundle, submitTeamWork, updateBountyStatus, ensureSchema } from "@/lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params; // FIX: await the params Promise
  
  try {
    const { team_id, submission_hash } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    
    await submitTeamWork(bountyId, team_id, submission_hash);
    
    // Check if all teams submitted
    const updatedBundle = await getBountyBundle(bountyId);
    const allSubmitted = updatedBundle?.teams.every(t => 
      t.submission_hash && t.submission_hash.length > 0
    );
    
    if (allSubmitted && updatedBundle && updatedBundle.teams.length >= 2) {
      await updateBountyStatus(bountyId, "voting_open");
    }
    
    return NextResponse.json(await getBountyBundle(bountyId));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}