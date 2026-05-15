import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = !!DATABASE_URL;

function transformQuery(query: string) {
  if (!isPostgres) return query;
  let i = 1;
  return query.replace(/\?/g, () => `$${i++}`);
}

// Define the database row types
interface BountyRow {
  id: string;
  creator_address: string;
  title: string;
  description: string;
  prize_distributions: string;
  total_prize_pool: string;
  escrow_id: string;
  status: string;
  created_at: string;
  registration_start: string;
  registration_end: string;
  submission_start: string;
  submission_end: string;
  judging_start: string;
  judging_end: string;
  disbursement_time: string;
  judge_addresses: string;
  judge_count: number;
  platform_fee_percent: number;
  winner_team_id: string;
  finalized_at: string;
  auto_resolved: number;
}

interface TeamRow {
  team_id: string;
  bounty_id: string;
  team_name: string;
  team_wallet: string;
  members: string;
  submission_hash: string;
  eligible_to_vote: number;
  registered_at: string;
  assigned_peer_team_id: string;
}

interface JudgeRow {
  id: string;
  bounty_id: string;
  address: string;
  accepted: number;
  stake_amount: string;
  committed_at: string;
  score_submitted: number;
  deadline_exceeded: number;
}

interface JudgeScoreRow {
  id: string;
  bounty_id: string;
  judge_address: string;
  team_id: string;
  creativity: number;
  execution: number;
  impact: number;
  presentation: number;
  overall: number;
  feedback: string;
  submitted_at: string;
}

interface VoteRevealRow {
  id: string;
  bounty_id: string;
  team_id: string;
  self_score: number;
  peer_score: number;
  peer_team_id: string;
  revealed_at: string;
}

interface FinalScoreRow {
  id: string;
  bounty_id: string;
  team_id: string;
  team_name: string;
  judge_score: number;
  peer_score: number;
  self_score: number;
  community_votes: number;
  weighted_score: number;
  rank: number;
  payout_amount: string;
  position_title: string;
}

const db = (() => {
  if (isPostgres) {
    const sql = neon(DATABASE_URL!);
    return {
      run: async (query: string, ...params: any[]) => {
        await (sql as any).query(transformQuery(query), params);
      },
      get: async <T>(query: string, ...params: any[]): Promise<T | null> => {
        const rows = await (sql as any).query(transformQuery(query), params);
        return (rows[0] as T) || null;
      },
      all: async <T>(query: string, ...params: any[]): Promise<T[]> => {
        return (await (sql as any).query(transformQuery(query), params)) as T[];
      },
      exec: async (query: string) => {
        await (sql as any).query(query);
      }
    };
  } else {
    const DB_PATH = process.env.BOUNTY_DB_PATH || path.join(process.cwd(), "bounty.db");
    const sqlite = new Database(DB_PATH);
    return {
      run: async (query: string, ...params: any[]) => {
        sqlite.prepare(query).run(...params);
      },
      get: async <T>(query: string, ...params: any[]): Promise<T | null> => {
        return (sqlite.prepare(query).get(...params) as T) || null;
      },
      all: async <T>(query: string, ...params: any[]): Promise<T[]> => {
        return sqlite.prepare(query).all(...params) as T[];
      },
      exec: async (query: string) => {
        sqlite.exec(query);
      }
    };
  }
})();

let schemaInitialized = false;
async function ensureSchema() {
  if (schemaInitialized) return;
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      creator_address TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      prize_distributions TEXT DEFAULT '[]',
      total_prize_pool TEXT NOT NULL,
      escrow_id TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      registration_start TEXT,
      registration_end TEXT,
      submission_start TEXT,
      submission_end TEXT,
      judging_start TEXT,
      judging_end TEXT,
      disbursement_time TEXT,
      judge_addresses TEXT DEFAULT '[]',
      judge_count INTEGER DEFAULT 3,
      platform_fee_percent INTEGER DEFAULT 5,
      winner_team_id TEXT,
      finalized_at TEXT,
      auto_resolved INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS teams (
      team_id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      team_name TEXT NOT NULL,
      team_wallet TEXT NOT NULL,
      members TEXT DEFAULT '[]',
      submission_hash TEXT,
      eligible_to_vote INTEGER DEFAULT 1,
      registered_at TEXT NOT NULL,
      assigned_peer_team_id TEXT,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    )`,
    `CREATE TABLE IF NOT EXISTS judges (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      address TEXT NOT NULL,
      accepted INTEGER DEFAULT 0,
      stake_amount TEXT DEFAULT '0',
      committed_at TEXT,
      score_submitted INTEGER DEFAULT 0,
      deadline_exceeded INTEGER DEFAULT 0,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    )`,
    `CREATE TABLE IF NOT EXISTS judge_scores (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      judge_address TEXT NOT NULL,
      team_id TEXT NOT NULL,
      creativity REAL,
      execution REAL,
      impact REAL,
      presentation REAL,
      overall REAL,
      feedback TEXT,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    )`,
    `CREATE TABLE IF NOT EXISTS vote_reveals (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      self_score REAL NOT NULL,
      peer_score REAL NOT NULL,
      peer_team_id TEXT NOT NULL,
      revealed_at TEXT NOT NULL,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    )`,
    `CREATE TABLE IF NOT EXISTS final_scores (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      team_name TEXT,
      judge_score REAL,
      peer_score REAL,
      self_score REAL,
      community_votes INTEGER DEFAULT 0,
      weighted_score REAL,
      rank INTEGER,
      payout_amount TEXT,
      position_title TEXT,
      FOREIGN KEY (bounty_id) REFERENCES bounties(id)
    )`
  ];

  for (const table of tables) {
    await db.exec(table);
  }
  
  schemaInitialized = true;
}

export { db, ensureSchema };

// Get full bounty bundle
export async function getBountyBundle(bountyId: string) {
  await ensureSchema();
  
  const bounty = await db.get<BountyRow>("SELECT * FROM bounties WHERE id = ?", [bountyId]);
  if (!bounty) return null;

  const teams = await db.all<TeamRow>("SELECT * FROM teams WHERE bounty_id = ?", [bountyId]);
  const judges = await db.all<JudgeRow>("SELECT * FROM judges WHERE bounty_id = ?", [bountyId]);
  const judgeScores = await db.all<JudgeScoreRow>("SELECT * FROM judge_scores WHERE bounty_id = ?", [bountyId]);
  const votes = await db.all<VoteRevealRow>("SELECT * FROM vote_reveals WHERE bounty_id = ?", [bountyId]);
  const finalScores = await db.all<FinalScoreRow>("SELECT * FROM final_scores WHERE bounty_id = ? ORDER BY rank", [bountyId]);

  return {
    bounty: {
      ...bounty,
      prize_distributions: JSON.parse(bounty.prize_distributions || '[]'),
      judge_addresses: JSON.parse(bounty.judge_addresses || '[]'),
      auto_resolved: Boolean(bounty.auto_resolved)
    },
    teams: teams.map((t: any) => ({ ...t, members: JSON.parse(t.members || '[]') })),
    judges,
    judgeScores,
    votes,
    final_scores: finalScores,
    total_prize_pool: bounty.total_prize_pool
  };
}

// Check if judging deadline exceeded and resolve automatically
export async function checkAndAutoResolve(bountyId: string): Promise<boolean> {
  await ensureSchema();
  const bounty = await db.get<BountyRow>("SELECT * FROM bounties WHERE id = ?", [bountyId]);
  if (!bounty) return false;

  const now = new Date();
  const disbursementTime = new Date(bounty.disbursement_time);

  if (now > disbursementTime && bounty.status !== 'completed') {
    await autoResolveByCommunityVotes(bountyId);
    return true;
  }

  return false;
}

// Auto-resolve based on community votes when judges fail
export async function autoResolveByCommunityVotes(bountyId: string) {
  await ensureSchema();
  const bundle = await getBountyBundle(bountyId);
  if (!bundle) return;

  const { teams, votes, bounty } = bundle;
  
  const communityScores = teams.map((team: TeamRow) => {
    const teamVote = votes.find((v: VoteRevealRow) => v.team_id === team.team_id);
    const selfScore = teamVote?.self_score || 0;
    const peerScore = teamVote?.peer_score || 0;
    const communityScore = (selfScore + peerScore) / 2;
    
    return {
      team_id: team.team_id,
      team_name: team.team_name,
      community_score: communityScore,
      self_score: selfScore,
      peer_score: peerScore
    };
  });

  communityScores.sort((a, b) => b.community_score - a.community_score);

  const prizes = bounty.prize_distributions || [];
  
  for (let i = 0; i < communityScores.length && i < prizes.length; i++) {
    const score = communityScores[i];
    const prize = prizes[i];
    
    await db.run(`
      INSERT INTO final_scores (id, bounty_id, team_id, team_name, self_score, peer_score, community_votes, weighted_score, rank, payout_amount, position_title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      randomUUID(), bountyId, score.team_id, score.team_name,
      score.self_score, score.peer_score, teams.length,
      score.community_score, i + 1, prize.amount, prize.title
    ]);
  }

  await db.run(
    "UPDATE bounties SET status = 'completed', auto_resolved = 1, finalized_at = ? WHERE id = ?", 
    [new Date().toISOString(), bountyId]
  );
}

// Finalize bounty with proper scoring
export async function finalizeBounty(bountyId: string) {
  await ensureSchema();
  const bundle = await getBountyBundle(bountyId);
  if (!bundle) throw new Error("Bounty not found");

  const { teams, votes, judgeScores, bounty } = bundle;
  
  const finalScores = teams.map((team: TeamRow) => {
    const teamVote = votes.find((v: VoteRevealRow) => v.team_id === team.team_id);
    const selfScore = teamVote?.self_score || 0;
    const peerScore = teamVote?.peer_score || 0;
    
    const teamJudgeScores = judgeScores.filter((js: JudgeScoreRow) => js.team_id === team.team_id);
    const avgJudgeScore = teamJudgeScores.length > 0
      ? teamJudgeScores.reduce((sum: number, js: JudgeScoreRow) => sum + js.overall, 0) / teamJudgeScores.length
      : 0;
    
    const communityVotes = votes.filter((v: VoteRevealRow) => v.peer_team_id === team.team_id).length;
    const weightedScore = (avgJudgeScore * 0.7) + (peerScore * 0.2) + (selfScore * 0.1);
    
    return {
      team_id: team.team_id,
      team_name: team.team_name,
      judge_score: avgJudgeScore,
      peer_score: peerScore,
      self_score: selfScore,
      community_votes: communityVotes,
      weighted_score: Math.round(weightedScore * 100) / 100,
      rank: 0,
      payout_amount: "0",
      position_title: ""
    };
  });

  finalScores.sort((a, b) => b.weighted_score - a.weighted_score);

  const prizes = bounty.prize_distributions || [];
  
  for (let i = 0; i < finalScores.length && i < prizes.length; i++) {
    finalScores[i].rank = i + 1;
    finalScores[i].payout_amount = prizes[i].amount;
    finalScores[i].position_title = prizes[i].title;
    
    await db.run(`
      INSERT INTO final_scores (id, bounty_id, team_id, team_name, judge_score, peer_score, self_score, community_votes, weighted_score, rank, payout_amount, position_title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      randomUUID(), bountyId, finalScores[i].team_id, finalScores[i].team_name,
      finalScores[i].judge_score, finalScores[i].peer_score, finalScores[i].self_score,
      finalScores[i].community_votes, finalScores[i].weighted_score,
      finalScores[i].rank, finalScores[i].payout_amount, finalScores[i].position_title
    ]);
  }

  await db.run(
    "UPDATE bounties SET status = 'completed', finalized_at = ?, winner_team_id = ? WHERE id = ?", 
    [new Date().toISOString(), finalScores[0]?.team_id, bountyId]
  );

  return finalScores;
}

// Create bounty with full configuration
export async function createBounty(data: {
  creator_address: string;
  title: string;
  description: string;
  prize_distributions: any[];
  total_prize_pool: string;
  judge_addresses: string[];
  judge_count: number;
  registration_end: string;
  submission_end: string;
  judging_start: string;
  judging_end: string;
  disbursement_time: string;
}): Promise<string> {
  await ensureSchema();
  
  const bountyId = randomUUID();
  const now = new Date().toISOString();
  
  await db.run(`
    INSERT INTO bounties (
      id, creator_address, title, description, prize_distributions, total_prize_pool,
      status, created_at, registration_start, registration_end,
      submission_start, submission_end, judging_start, judging_end,
      disbursement_time, judge_addresses, judge_count
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    bountyId, data.creator_address, data.title, data.description,
    JSON.stringify(data.prize_distributions), data.total_prize_pool,
    now, now, data.registration_end,
    data.registration_end, data.submission_end,
    data.judging_start, data.judging_end,
    data.disbursement_time, JSON.stringify(data.judge_addresses),
    data.judge_count
  ]);

  // Pre-register judges
  for (const judgeAddress of data.judge_addresses) {
    await db.run(
      "INSERT INTO judges (id, bounty_id, address, accepted, stake_amount) VALUES (?, ?, ?, 0, '0')",
      [randomUUID(), bountyId, judgeAddress]
    );
  }

  return bountyId;
}

// Update bounty status
export async function updateBountyStatus(bountyId: string, status: string) {
  await ensureSchema();
  await db.run("UPDATE bounties SET status = ? WHERE id = ?", [status, bountyId]);
}

// Set escrow contract
export async function setBountyEscrow(bountyId: string, escrowId: string) {
  await ensureSchema();
  await db.run("UPDATE bounties SET escrow_id = ? WHERE id = ?", [escrowId, bountyId]);
}

// Register team
export async function registerTeam(bountyId: string, teamName: string, teamWallet: string) {
  await ensureSchema();
  
  const existing = await db.get<{ team_id: string }>(
    "SELECT team_id FROM teams WHERE bounty_id = ? AND team_wallet = ?", 
    [bountyId, teamWallet]
  );
  if (existing) throw new Error("Team wallet already registered for this bounty");
  
  const teamId = randomUUID();
  const now = new Date().toISOString();
  
  await db.run(
    "INSERT INTO teams (team_id, bounty_id, team_name, team_wallet, members, registered_at) VALUES (?, ?, ?, ?, '[]', ?)",
    [teamId, bountyId, teamName, teamWallet, now]
  );

  // Randomly assign a peer reviewer
  const teams = await db.all<{ team_id: string }>(
    "SELECT team_id FROM teams WHERE bounty_id = ? AND team_id != ?", 
    [bountyId, teamId]
  );
  if (teams.length > 0) {
    const randomIndex = Math.floor(Math.random() * teams.length);
    const randomPeer = teams[randomIndex].team_id;
    await db.run("UPDATE teams SET assigned_peer_team_id = ? WHERE team_id = ?", [randomPeer, teamId]);
  }

  return teamId;
}

// Submit team work
export async function submitTeamWork(bountyId: string, teamId: string, submissionHash: string) {
  await ensureSchema();
  await db.run(
    "UPDATE teams SET submission_hash = ? WHERE team_id = ? AND bounty_id = ?", 
    [submissionHash, teamId, bountyId]
  );
}

// Judge accepts role
export async function judgeAccept(bountyId: string, judgeAddress: string) {
  await ensureSchema();
  const now = new Date().toISOString();
  await db.run(
    "UPDATE judges SET accepted = 1, committed_at = ? WHERE bounty_id = ? AND address = ?",
    [now, bountyId, judgeAddress]
  );
}

// Submit judge score
export async function submitJudgeScore(bountyId: string, judgeAddress: string, scores: {
  team_id: string;
  creativity: number;
  execution: number;
  impact: number;
  presentation: number;
  overall: number;
  feedback?: string;
}) {
  await ensureSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO judge_scores (id, bounty_id, judge_address, team_id, creativity, execution, impact, presentation, overall, feedback, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, bountyId, judgeAddress, scores.team_id, scores.creativity, scores.execution, 
     scores.impact, scores.presentation, scores.overall, scores.feedback || '', now]
  );
  
  // Check if judge has scored all teams
  const teams = await db.all("SELECT team_id FROM teams WHERE bounty_id = ?", [bountyId]);
  const scoredTeams = await db.all(
    "SELECT DISTINCT team_id FROM judge_scores WHERE bounty_id = ? AND judge_address = ?",
    [bountyId, judgeAddress]
  );
  
  if (scoredTeams.length >= teams.length) {
    await db.run(
      "UPDATE judges SET score_submitted = 1 WHERE bounty_id = ? AND address = ?",
      [bountyId, judgeAddress]
    );
  }
}

// Reveal vote (self + peer)
export async function revealVote(bountyId: string, teamId: string, selfScore: number, peerScore: number, peerTeamId: string) {
  await ensureSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  
  await db.run(
    "INSERT INTO vote_reveals (id, bounty_id, team_id, self_score, peer_score, peer_team_id, revealed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, bountyId, teamId, selfScore, peerScore, peerTeamId, now]
  );
}