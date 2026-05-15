import { NextResponse } from "next/server";
import { getBountyBundle, updateBountyStatus, db, ensureSchema } from "@/lib/store";
import { releaseFunds } from "@/lib/tw/client";
import { randomUUID } from "crypto";

// Define proper types for the scoring
interface TeamScoreInput {
  team_id: string;
  team_name: string;
  judge_score: number;
  peer_score: number;
  self_score: number;
  weighted_score: number;
  rank: number;
  payout_amount: string;
}

interface JudgeScoreRow {
  team_id: string;
  overall: number;
}

interface VoteRow {
  team_id: string;
  self_score: number;
  peer_score: number;
}

interface TeamRow {
  team_id: string;
  team_name: string;
}

interface BountyRow {
  prize_pool: string;
  escrow_id: string;
}

interface BountyBundleForScoring {
  bounty: BountyRow;
  teams: TeamRow[];
  votes: VoteRow[];
  judgeScores: JudgeScoreRow[];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id: bountyId } = await params; // FIX: await the params Promise
  
  try {
    const bundle = await getBountyBundle(bountyId);
    if (!bundle) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });

    const finalScores = calculateWeightedScores(bundle as any);
    
    for (const score of finalScores) {
      await db.run(`
        INSERT INTO final_scores (id, bounty_id, team_id, judge_score, peer_score, self_score, weighted_score, rank, payout_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        randomUUID(), bountyId, score.team_id, score.judge_score, 
        score.peer_score, score.self_score, score.weighted_score, 
        score.rank, score.payout_amount
      ]);
    }
    
    const winner = finalScores.find((s: any) => s.rank === 1);
    if (winner && bundle.bounty.escrow_id && process.env.TW_API_KEY) {
      try {
        await releaseFunds(bundle.bounty.escrow_id);
      } catch (err) {
        console.warn("Fund release failed:", err);
      }
      await db.run("UPDATE bounties SET winner_team_id = ? WHERE id = ?", [winner.team_id, bountyId]);
    }
    
    await updateBountyStatus(bountyId, "completed");
    await db.run("UPDATE bounties SET finalized_at = ? WHERE id = ?", [new Date().toISOString(), bountyId]);
    
    return NextResponse.json(await getBountyBundle(bountyId));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

function calculateWeightedScores(bundle: BountyBundleForScoring): TeamScoreInput[] {
  const { teams, votes, judgeScores } = bundle;
  
  return teams.map((team: TeamRow) => {
    const teamVote = votes.find((v: VoteRow) => v.team_id === team.team_id);
    const selfScore = teamVote?.self_score || 0;
    const peerScore = teamVote?.peer_score || 0;
    
    // Average judge scores for this team
    const teamJudgeScores = judgeScores.filter((js: JudgeScoreRow) => js.team_id === team.team_id);
    const avgJudgeScore = teamJudgeScores.length > 0
      ? teamJudgeScores.reduce((sum: number, js: JudgeScoreRow) => sum + js.overall, 0) / teamJudgeScores.length
      : 0;
    
    // Weighted formula: 70% judge, 20% peer, 10% self
    const weightedScore = (avgJudgeScore * 0.7) + (peerScore * 0.2) + (selfScore * 0.1);
    
    return {
      team_id: team.team_id,
      team_name: team.team_name,
      judge_score: avgJudgeScore,
      peer_score: peerScore,
      self_score: selfScore,
      weighted_score: Math.round(weightedScore * 100) / 100,
      rank: 0,
      payout_amount: "0"
    };
  }).sort((a: TeamScoreInput, b: TeamScoreInput) => b.weighted_score - a.weighted_score)
    .map((score: TeamScoreInput, index: number) => ({
      ...score,
      rank: index + 1,
      payout_amount: index === 0 ? bundle.bounty.prize_pool : "0"
    }));
}