import { T } from "../theme";
import { StageHeader, Card, SectionLabel } from "../ui";

export function ReviewStage({ teams }: { teams: any[] }) {
  return (
    <div>
      <StageHeader
        eyebrow="Review Assignment"
        title="Peer reviews randomly assigned"
      />
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
          Each team has been randomly assigned one peer team to review. 
          This prevents collusion and ensures fair evaluation.
        </div>
        
        {teams.map(team => (
          <Card key={team.team_id} pad={16} tint={T.panel} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{team.team_name}</div>
                <div style={{ fontSize: 13, color: T.ink2, marginTop: 4 }}>
                  Reviews: {team.assigned_peer_team_id ? 'Assigned' : 'Waiting...'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: T.mute }}>Status</div>
                <div style={{ fontSize: 13, color: T.blue }}>
                  {team.submission_hash ? 'Ready to review' : 'Submission pending'}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}