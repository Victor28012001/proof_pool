import { useState } from "react";
import { Team } from "@/lib/types";
import { T } from "../theme";
import { Btn, StageHeader, Card, MonoText } from "../ui";

export function SubmissionStage({ teams, onSubmitWork, loading }: {
  teams: Team[];
  onSubmitWork: (teamId: string, submissionHash: string) => void;
  loading: boolean;
}) {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [submissionHash, setSubmissionHash] = useState("");
  
  const canSubmit = selectedTeam && submissionHash.trim() && !loading;

  return (
    <div>
      <StageHeader
        eyebrow="Submission Phase"
        title="Submit your work"
      />
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
          Provide the hash of your submission. This should be a content-addressable hash 
          (like IPFS CID) that uniquely identifies your work.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Your Team</label>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={selectStyle}>
              <option value="">Select team...</option>
              {teams.map(team => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Submission Hash (IPFS CID)</label>
            <input
              value={submissionHash}
              onChange={(e) => setSubmissionHash(e.target.value)}
              placeholder="Qm..."
              style={inputStyle}
            />
          </div>
        </div>

        <Btn tone="primary" size="lg" full onClick={() => onSubmitWork(selectedTeam, submissionHash)} disabled={!canSubmit}>
          {loading ? 'Submitting...' : 'Submit Work'}
        </Btn>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: T.ink2, marginBottom: 6, display: 'block'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${T.hair}`, background: T.surface,
  color: T.ink, fontSize: 14, fontFamily: 'inherit', outline: 'none'
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer'
};