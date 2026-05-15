import { useState } from "react";
import { Team } from "@/lib/types";
import { T } from "../theme";
import { Btn, StageHeader, Card, MonoText, SectionLabel } from "../ui";

export function RegistrationStage({ onRegisterTeam, teams, loading }: {
  onRegisterTeam: (teamName: string, teamWallet: string) => void;
  teams: Team[];
  loading: boolean;
}) {
  const [teamName, setTeamName] = useState("");
  const [teamWallet, setTeamWallet] = useState("");
  
  const canRegister = teamName.trim() && teamWallet.trim() && !loading;

  return (
    <div>
      <StageHeader
        eyebrow="Registration Open"
        title="Register your team"
        right={<MonoText style={{ color: T.mute, fontSize: 13 }}>{teams.length} teams</MonoText>}
      />
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
          Each team needs a Stellar wallet address for prize payouts. 
          Multi-sig wallets are supported for team treasury security.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Team Name</label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Nebula Labs"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Team Wallet (Stellar)</label>
            <input
              value={teamWallet}
              onChange={(e) => setTeamWallet(e.target.value)}
              placeholder="GABCD…"
              style={inputStyle}
            />
          </div>
        </div>

        <Btn tone="primary" size="lg" full onClick={() => onRegisterTeam(teamName, teamWallet)} disabled={!canRegister}>
          {loading ? 'Registering...' : 'Register Team'}
        </Btn>

        {teams.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.hairSoft}` }}>
            <SectionLabel>Registered Teams</SectionLabel>
            {teams.map(team => (
              <div key={team.team_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: `1px solid ${T.hairSoft}`
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{team.team_name}</div>
                  <MonoText style={{ fontSize: 11, color: T.mute }}>{team.team_wallet.slice(0, 8)}…</MonoText>
                </div>
              </div>
            ))}
          </div>
        )}
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