import { NextResponse } from "next/server";
import { getBountyBundle, registerTeam, ensureSchema } from "@/lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params; // FIX: await the params Promise
  
  try {
    const { team_name, team_wallet } = await request.json();
    const bundle = await getBountyBundle(bountyId);
    
    if (!bundle) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    
    if (bundle.bounty.status !== "registration_open" && bundle.bounty.status !== "funded") {
      return NextResponse.json({ error: "Registration is not open" }, { status: 400 });
    }
    
    await registerTeam(bountyId, team_name, team_wallet);
    
    return NextResponse.json(await getBountyBundle(bountyId));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}