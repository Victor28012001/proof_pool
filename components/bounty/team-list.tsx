import { Team } from "@/lib/types";
import { T } from "./theme";
import { Card, SectionLabel, MonoText, Pill } from "./ui";

export function TeamList({ teams }: { teams: Team[] }) {
  return (
    <Card pad={0}>
      <div style={{ padding: '16px 20px 8px' }}>
        <SectionLabel>Teams ({teams.length})</SectionLabel>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        {teams.map((team, i) => (
          <div key={team.team_id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < teams.length - 1 ? `1px solid ${T.hairSoft}` : 'none'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>
                {team.team_name}
              </div>
              <MonoText style={{ fontSize: 11, color: T.mute }}>
                {team.team_wallet.slice(0, 8)}…
              </MonoText>
            </div>
            <Pill tone={team.submission_hash ? 'emerald' : 'neutral'}>
              {team.submission_hash ? 'Submitted' : 'Registered'}
            </Pill>
          </div>
        ))}
        {teams.length === 0 && (
          <div style={{ padding: '12px 0', fontSize: 13, color: T.mute, textAlign: 'center' }}>
            No teams registered yet
          </div>
        )}
      </div>
    </Card>
  );
}