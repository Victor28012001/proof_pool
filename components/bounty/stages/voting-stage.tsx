import { useState } from "react";
import { Team } from "@/lib/types";
import { T } from "../theme";
import { Btn, StageHeader, Card, MonoText } from "../ui";

export function VotingStage({ teams, onSubmitVote, loading }: {
  teams: Team[];
  onSubmitVote: (teamId: string, selfScore: number, peerScore: number, peerTeamId: string) => void;
  loading: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selfScore, setSelfScore] = useState<number>(0);
  const [peerScore, setPeerScore] = useState<number>(0);
  
  // Find the assigned peer for the selected team (in a real app, this comes from the server)
  const getAssignedPeer = (teamId: string): Team | null => {
    // This would be fetched from the server based on random assignment
    const otherTeams = teams.filter(t => t.team_id !== teamId);
    return otherTeams.length > 0 ? otherTeams[0] : null;
  };

  const assignedPeer = selectedTeam ? getAssignedPeer(selectedTeam) : null;
  const canSubmit = selectedTeam && selfScore > 0 && peerScore > 0 && assignedPeer;

  return (
    <div>
      <StageHeader
        eyebrow="Peer Review Phase"
        title="Submit your evaluations"
      />
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
          Each team evaluates themselves and one randomly assigned peer team. 
          This creates accountability and prevents collusion.
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.ink2, marginBottom: 8, display: 'block' }}>
            Your Team
          </label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select your team...</option>
            {teams.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name}
              </option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card tint={T.panel} pad={20}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: T.ink }}>
                Self Evaluation (10% of final score)
              </div>
              <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12 }}>
                Be honest — significant variance from judge scores will affect your reputation.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={selfScore}
                  onChange={(e) => setSelfScore(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <MonoText style={{ fontSize: 18, fontWeight: 600 }}>{selfScore}/10</MonoText>
              </div>
            </Card>

            {assignedPeer && (
              <Card tint={T.panel} pad={20}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: T.ink }}>
                  Peer Review: {assignedPeer.team_name} (20% of final score)
                </div>
                <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12 }}>
                  You've been randomly assigned to review this team's submission.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={peerScore}
                    onChange={(e) => setPeerScore(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <MonoText style={{ fontSize: 18, fontWeight: 600 }}>{peerScore}/10</MonoText>
                </div>
              </Card>
            )}

            <Btn 
              tone="primary" 
              size="lg" 
              full 
              onClick={() => onSubmitVote(selectedTeam, selfScore, peerScore, assignedPeer!.team_id)} 
              disabled={!canSubmit || loading}
            >
              {loading ? 'Submitting...' : 'Submit Votes'}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: `1.5px solid ${T.hair}`,
  background: T.surface,
  color: T.ink,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};