import { NextResponse } from "next/server";
import { getBountyBundle, revealVote, updateBountyStatus, ensureSchema } from "@/lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params; // FIX: await the params Promise
  
  try {
    const { team_id, self_score, peer_score, peer_team_id } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    
    await revealVote(bountyId, team_id, self_score, peer_score, peer_team_id);
    
    // Check if all teams voted
    const updatedBundle = await getBountyBundle(bountyId);
    const allVoted = updatedBundle?.teams.every(t => 
      updatedBundle?.votes.some(v => v.team_id === t.team_id)
    );
    
    if (allVoted) {
      await updateBountyStatus(bountyId, "votes_revealed");
    }
    
    return NextResponse.json(updatedBundle);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}