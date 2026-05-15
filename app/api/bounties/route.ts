import { NextResponse } from "next/server";
import { ensureSchema, createBounty, getBountyBundle, db } from "@/lib/store";

export async function POST(request: Request) {
  await ensureSchema();
  
  try {
    const body = await request.json();
    console.log("Received bounty data:", body); // Debug log
    
    const {
      title,
      description,
      prize_distributions,
      total_prize_pool,
      judge_addresses,
      judge_count,
      creator_address,
      registration_end,
      submission_end,
      judging_start,
      judging_end,
      disbursement_time
    } = body;

    // Validate required fields
    if (!title || !total_prize_pool || !creator_address) {
      console.log("Missing fields:", { title, total_prize_pool, creator_address }); // Debug
      return NextResponse.json({ 
        error: "Missing required fields",
        received: { title: !!title, total_prize_pool: !!total_prize_pool, creator_address: !!creator_address }
      }, { status: 400 });
    }

    if (!judge_addresses || judge_addresses.length === 0) {
      return NextResponse.json({ error: "At least one judge address is required" }, { status: 400 });
    }

    if (!prize_distributions || prize_distributions.length === 0) {
      return NextResponse.json({ error: "At least one prize position is required" }, { status: 400 });
    }

    // Set default dates if not provided
    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const bountyId = await createBounty({
      creator_address,
      title,
      description: description || '',
      prize_distributions: prize_distributions || [],
      total_prize_pool,
      judge_addresses: judge_addresses || [],
      judge_count: judge_count || judge_addresses.length,
      registration_end: registration_end || defaultEnd.toISOString(),
      submission_end: submission_end || defaultEnd.toISOString(),
      judging_start: judging_start || defaultEnd.toISOString(),
      judging_end: judging_end || defaultEnd.toISOString(),
      disbursement_time: disbursement_time || defaultEnd.toISOString()
    });

    const bundle = await getBountyBundle(bountyId);
    console.log("Created bounty:", bountyId); // Debug
    return NextResponse.json({ bounty: bundle?.bounty });
  } catch (err: unknown) {
    console.error("Create bounty error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  await ensureSchema();
  
  try {
    const bounties = await db.all("SELECT * FROM bounties ORDER BY created_at DESC");
    return NextResponse.json(bounties);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}