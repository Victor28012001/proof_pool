import { FinalScore } from "@/lib/types";
import { T } from "../theme";
import { StageHeader, Card, MonoText, Btn } from "../ui";

export function ResultsStage({ finalScores, onFinalize, completed, loading }: {
  finalScores: FinalScore[];
  onFinalize?: () => void;
  completed?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <StageHeader
        eyebrow={completed ? "Competition Complete" : "Final Results"}
        title={completed ? "Winner has been paid" : "Ready to finalize"}
      />
      <div style={{ padding: '24px' }}>
        {finalScores.length > 0 ? (
          <div>
            {finalScores.map((score: FinalScore, i: number) => (
              <Card key={score.team_id} pad={20} tint={i === 0 ? T.emeraldSoft : T.panel} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 16,
                        background: i === 0 ? T.emerald : T.ink,
                        color: '#fff', display: 'grid', placeItems: 'center',
                        fontWeight: 600, fontSize: 14
                      }}>
                        {score.rank}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                          Team {score.team_id.slice(0, 8)}
                        </div>
                        {i === 0 && score.payout_amount && (
                          <div style={{ fontSize: 13, color: T.emerald, fontWeight: 500, marginTop: 2 }}>
                            🏆 Winner — {score.payout_amount} USDC
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <MonoText style={{ fontSize: 10, color: T.mute, textTransform: 'uppercase' }}>Judge (70%)</MonoText>
                        <MonoText style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                          {score.judge_score?.toFixed(1) ?? '0.0'}
                        </MonoText>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <MonoText style={{ fontSize: 10, color: T.mute, textTransform: 'uppercase' }}>Peer (20%)</MonoText>
                        <MonoText style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                          {score.peer_score?.toFixed(1) ?? '0.0'}
                        </MonoText>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <MonoText style={{ fontSize: 10, color: T.mute, textTransform: 'uppercase' }}>Self (10%)</MonoText>
                        <MonoText style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                          {score.self_score?.toFixed(1) ?? '0.0'}
                        </MonoText>
                      </div>
                    </div>
                    
                    <div style={{
                      marginTop: 12, padding: '8px 12px',
                      background: T.surface, borderRadius: 8,
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 13, color: T.ink2 }}>Weighted Final Score</span>
                      <MonoText style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? T.emerald : T.ink }}>
                        {score.weighted_score?.toFixed(2) ?? '0.00'}
                      </MonoText>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {!completed && onFinalize && (
              <Btn 
                tone="emerald" 
                size="lg" 
                full 
                onClick={onFinalize} 
                style={{ marginTop: 16 }} 
                disabled={loading}
              >
                {loading ? 'Finalizing...' : 'Finalize & Pay Winner'}
              </Btn>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: T.mute }}>
            Waiting for all votes and judge scores...
          </div>
        )}
      </div>
    </div>
  );
}