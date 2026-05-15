import { Judge } from "@/lib/types";
import { T } from "./theme";
import { Card, SectionLabel, MonoText, Pill } from "./ui";

export function JudgePanel({ judges }: { judges: Judge[] }) {
  return (
    <Card pad={0}>
      <div style={{ padding: '16px 20px 8px' }}>
        <SectionLabel>Judges ({judges.length})</SectionLabel>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        {judges.map((judge, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < judges.length - 1 ? `1px solid ${T.hairSoft}` : 'none'
          }}>
            <MonoText style={{ fontSize: 12, color: T.ink }}>
              {judge.address.slice(0, 8)}…
            </MonoText>
            <Pill tone={judge.score_submitted ? 'emerald' : judge.accepted ? 'blue' : 'neutral'}>
              {judge.score_submitted ? 'Scored' : judge.accepted ? 'Accepted' : 'Pending'}
            </Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}