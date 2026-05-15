export type BountyStatus = 
  | "draft" 
  | "funded" 
  | "registration_open" 
  | "submission_closed" 
  | "review_in_progress"
  | "judging_in_progress"
  | "votes_revealed" 
  | "judging_complete" 
  | "completed"
  | "disputed"
  | "auto_resolved";

export interface PrizeDistribution {
  position: number;
  title: string;
  amount: string;
  description?: string;
}

export interface Team {
  team_id: string;
  bounty_id: string;
  team_name: string;
  team_wallet: string;
  members: string[];
  submission_hash: string;
  eligible_to_vote: boolean;
  registered_at: string;
  assigned_peer_team_id?: string;
}

export interface Judge {
  id: string;
  bounty_id: string;
  address: string;
  accepted: boolean;
  stake_amount: string;
  committed_at: string;
  score_submitted: boolean;
  deadline_exceeded: boolean;
}

export interface JudgeScore {
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

export interface VoteReveal {
  id: string;
  bounty_id: string;
  team_id: string;
  self_score: number;
  peer_score: number;
  peer_team_id: string;
  revealed_at: string;
}

export interface FinalScore {
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

export interface Bounty {
  id: string;
  creator_address: string;
  title: string;
  description: string;
  prize_distributions: string; // JSON string of PrizeDistribution[]
  total_prize_pool: string;
  escrow_id: string;
  status: BountyStatus;
  created_at: string;
  registration_start: string;
  registration_end: string;
  submission_start: string;
  submission_end: string;
  judging_start: string;
  judging_end: string;
  disbursement_time: string;
  judge_addresses: string; // JSON string of judge wallet addresses
  judge_count: number;
  platform_fee_percent: number;
  winner_team_id: string;
  finalized_at: string;
  auto_resolved: boolean;
}

export interface BountyBundle {
  bounty: Bounty;
  teams: Team[];
  judges: Judge[];
  judgeScores: JudgeScore[];
  votes: VoteReveal[];
  final_scores: FinalScore[];
  total_prize_pool: string;
}