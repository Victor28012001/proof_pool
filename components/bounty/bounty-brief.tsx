import { Bounty } from "@/lib/types";
import { T } from "./theme";
import { Card, SectionLabel, MonoText, Pill } from "./ui";

export function BountyBrief({ bounty }: { bounty?: Bounty }) {
  if (!bounty) return null;
  
  // Parse prize distributions if they're stored as a string
  const prizeDistributions = typeof bounty.prize_distributions === 'string' 
    ? JSON.parse(bounty.prize_distributions) 
    : bounty.prize_distributions;
  
  return (
    <Card pad={20}>
      <SectionLabel>The Brief</SectionLabel>
      <div style={{
        fontFamily: 'var(--geist-font-sans)', fontSize: 17, fontWeight: 500,
        color: T.ink, letterSpacing: -0.2, lineHeight: 1.4, marginBottom: 12
      }}>
        {bounty.title}
      </div>
      <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.5, marginBottom: 16 }}>
        {bounty.description}
      </div>
      
      {/* Total Prize Pool */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 14, borderTop: `1px solid ${T.hairSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <MonoText style={{ fontSize: 22, fontWeight: 500, color: T.ink, letterSpacing: -0.4 }}>
            {bounty.total_prize_pool}
          </MonoText>
          <MonoText style={{ fontSize: 12, color: T.mute }}>USDC total prize pool</MonoText>
        </div>
        <div style={{ color: T.mute }}>·</div>
        <MonoText style={{ fontSize: 12, color: T.mute }}>
          {bounty.judge_count} judges
        </MonoText>
      </div>

      {/* Prize Breakdown */}
      {prizeDistributions && Array.isArray(prizeDistributions) && prizeDistributions.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.hairSoft}` }}>
          <SectionLabel>Prize Distribution</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prizeDistributions.map((prize: any, index: number) => (
              <div key={index} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 12px',
                background: T.panel, borderRadius: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill tone={index === 0 ? 'emerald' : index === 1 ? 'blue' : 'neutral'}>
                    {prize.position || index + 1}
                  </Pill>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>
                    {prize.title}
                  </span>
                </div>
                <MonoText style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                  {prize.amount} USDC
                </MonoText>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}