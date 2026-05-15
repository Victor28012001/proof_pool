import { NextResponse } from "next/server";
import { db, ensureSchema, checkAndAutoResolve } from "@/lib/store";
import { releaseFunds } from "@/lib/tw/client";

export const runtime = "nodejs";

export async function GET() {
  await ensureSchema();
  
  try {
    const activeBounties = await db.all(
      "SELECT id FROM bounties WHERE status IN ('judging_in_progress', 'votes_revealed', 'judging_complete') AND auto_resolved = 0"
    ) as { id: string }[];

    const resolved: string[] = [];
    
    for (const bounty of activeBounties) {
      const wasResolved = await checkAndAutoResolve(bounty.id);
      if (wasResolved) {
        resolved.push(bounty.id);
        
        // Try to release funds if escrow exists
        const bundle = await db.get("SELECT escrow_id FROM bounties WHERE id = ?", [bounty.id]) as any;
        if (bundle?.escrow_id && process.env.TW_API_KEY) {
          try {
            await releaseFunds(bundle.escrow_id);
          } catch (err) {
            console.warn(`Failed to release funds for ${bounty.id}:`, err);
          }
        }
      }
    }

    return NextResponse.json({ 
      checked: activeBounties.length, 
      resolved: resolved.length,
      resolved_ids: resolved 
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}