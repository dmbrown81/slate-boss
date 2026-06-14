import { useState } from 'react';
import type { Achievement, ContestResult, UnlockReward } from '../types';
import { APP_NAME } from '../config';
import { cashLineRank } from '../lib/payout';

// The line every DFS player checks first: how close was the cash, and who's to blame.
function nearMissInfo(result: ContestResult): { text: string; tone: 'sweat' | 'clutch' } | null {
  const allScores = [...result.field.map((e) => e.totalScore), result.userScore].sort((a, b) => b - a);
  const cashRank = cashLineRank(result.totalEntrants, result.tournament.key);
  const cashScore = allScores[cashRank - 1];

  if (result.payout === 0) {
    const gap = cashScore - result.userScore;
    if (result.tournament.key === 'winner_take_all') {
      const behindWinner = allScores[0] - result.userScore;
      if (behindWinner <= 15) return { text: `You finished ${behindWinner.toFixed(1)} points behind the winner. Brutal.`, tone: 'sweat' };
      return null;
    }
    if (gap > 12) return null;
    const worstScore = result.userEntry.scores.find((s) => s.playerId === result.worstPlayer.id);
    const shortfall = worstScore ? result.worstPlayer.displayedProjection - worstScore.final : 0;
    const blame = shortfall > gap
      ? ` ${result.worstPlayer.name} (${result.worstPlayer.position}) was the biggest swing. If he had reached projection, you likely cash.`
      : '';
    return { text: `You missed the cash by ${gap.toFixed(1)} points.${blame}`, tone: 'sweat' };
  }

  // Cashed — was it a photo finish?
  const bubbleScore = allScores[cashRank] ?? null;
  if (bubbleScore !== null && result.userScore - bubbleScore <= 3 && result.tournament.key !== 'winner_take_all') {
    return { text: `You cleared the cash line by just ${(result.userScore - bubbleScore).toFixed(1)} points. That's a sweat.`, tone: 'clutch' };
  }
  return null;
}

interface Props {
  result: ContestResult;
  streak: number;
  onHome: () => void;
  onCareer: () => void;
  newAchievements: Achievement[];
  newUnlocks: UnlockReward[];
}

const GRADE_COLOR: Record<string, string> = {
  'A+': '#27ae60', A: '#27ae60', B: '#4fc3f7', C: '#f59e0b', D: '#e67e22', F: '#e74c3c',
};

function GradeCard({ grade, label, sentence }: { grade: string; label: string; sentence: string }) {
  return (
    <div style={{
      background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
      padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 800, color: GRADE_COLOR[grade] ?? '#888',
        minWidth: 36, textAlign: 'center',
      }}>{grade}</div>
      <div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#ccc' }}>{sentence}</div>
      </div>
    </div>
  );
}

function resultRead(result: ContestResult): string {
  const build = result.grades.buildQuality.score;
  const luck = result.grades.outcomeLuck.label;
  const cashed = result.payout > 0;

  if (build >= 75 && cashed) return 'Strong build, and it hit. That is the sweet spot.';
  if (build >= 75 && !cashed) return 'Strong build, cold result. That is variance, not a reason to throw out the plan.';
  if (build < 60 && cashed) return 'You got away with one. Fun result, but the build still has room to improve.';
  if (luck === 'Cold') return 'The lineup needed help and the games did not bail it out.';
  return 'This result mostly matched the build quality. The next lesson below is the part to carry forward.';
}

function SummaryCard({
  title,
  value,
  accent,
  children,
}: {
  title: string;
  value: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#111',
      border: `1px solid ${accent}`,
      borderRadius: 8,
      padding: '11px 12px',
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{title}</div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 5 }}>{value}</div>
      <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

export default function ResultsScreen({ result, streak, onHome, onCareer, newAchievements, newUnlocks }: Props) {
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cashed = result.payout > 0;
  const won = result.userRank === 1;
  const refund = result.boonRefund ?? 0;
  const net = result.payout + refund - result.entryFee;
  const nearMiss = nearMissInfo(result);

  const copy = () => {
    navigator.clipboard.writeText(result.shareCard).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: won ? '#241a02' : cashed ? '#0d2a1a' : '#1a0a0a',
        borderBottom: `2px solid ${won ? '#f59e0b' : cashed ? '#27ae60' : '#1e1e1e'}`,
        padding: '20px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{APP_NAME} · {result.tournament.name}</div>
        {won && (
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>
            🏆 YOU WON THE WHOLE THING
          </div>
        )}
        <div style={{ fontSize: 42, fontWeight: 800, color: '#fff' }}>
          {result.userScore.toFixed(1)}
          <span style={{ fontSize: 16, color: '#555', marginLeft: 4 }}>pts</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: cashed ? '#27ae60' : '#888', marginTop: 4 }}>
          {ordinal(result.userRank)} of {result.totalEntrants}
        </div>
        {cashed ? (
          <div style={{ fontSize: 16, color: '#27ae60', marginTop: 6, fontWeight: 700 }}>
            💰 +${result.payout.toFixed(2)} <span style={{ fontSize: 11, color: '#27ae6099', fontWeight: 400 }}>play money</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Outside the cash line — run it back.
          </div>
        )}
        {streak > 1 && (
          <div style={{ fontSize: 13, color: '#f59e0b', marginTop: 4 }}>🔥 Streak: {streak}</div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {(newAchievements.length > 0 || newUnlocks.length > 0) && (
          <div style={{
            background: '#0d1a2a',
            border: '1px solid #2a6ef5',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, marginBottom: 7 }}>
              New Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {newAchievements.slice(0, 5).map((achievement) => (
                <div key={achievement.id} style={{ background: '#111', border: '1px solid #263b61', borderRadius: 7, padding: '7px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>{achievement.name}</span>
                    <span style={{ color: '#f59e0b', fontSize: 11 }}>+{achievement.points}</span>
                  </div>
                  <div style={{ color: '#9db8e8', fontSize: 11 }}>{achievement.description}</div>
                </div>
              ))}
              {newAchievements.length > 5 && (
                <div style={{ color: '#9db8e8', fontSize: 11 }}>+{newAchievements.length - 5} more achievements</div>
              )}
              {newUnlocks.map((unlock) => (
                <div key={unlock.id} style={{ background: '#1a1405', border: '1px solid #6f4d10', borderRadius: 7, padding: '7px 8px' }}>
                  <div style={{ color: '#f5c542', fontSize: 12, fontWeight: 800 }}>Unlock: {unlock.name}</div>
                  <div style={{ color: '#c9a85d', fontSize: 11 }}>{unlock.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearMiss && (
          <div style={{
            background: nearMiss.tone === 'clutch' ? '#071d14' : '#1f1208',
            border: `1px solid ${nearMiss.tone === 'clutch' ? '#1f6f47' : '#6f3a10'}`,
            borderRadius: 8, padding: '10px 12px', marginBottom: 12,
            color: nearMiss.tone === 'clutch' ? '#8ee0b3' : '#f5a34c',
            fontSize: 13, fontWeight: 600, lineHeight: 1.4,
          }}>
            {nearMiss.tone === 'clutch' ? '😅 ' : '😤 '}{nearMiss.text}
          </div>
        )}
        {result.boonMessage && (
          <div style={{
            background: '#071d14',
            border: '1px solid #1f6f47',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 12,
            color: '#8ee0b3',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.4,
          }}>
            Career Boon: {result.boonMessage}
          </div>
        )}
        <div style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <span style={{ color: '#ccc', fontSize: 13, fontWeight: 700 }}>{result.tournament.name}</span>
            <span style={{ color: net >= 0 ? '#27ae60' : '#e74c3c', fontSize: 13, fontWeight: 800 }}>
              {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(2)}
            </span>
          </div>
          <div style={{ color: '#666', fontSize: 11 }}>
            Entry ${result.entryFee.toFixed(2)} · Payout ${result.payout.toFixed(2)}
            {refund > 0 && <span> · Boon refund ${refund.toFixed(2)}</span>}
            {' '}· {result.tournament.prizeSummary}
          </div>
        </div>

        {/* Key players */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: '⭐ Best Play', player: result.bestPlayer },
            { label: '👎 Worst Play', player: result.worstPlayer },
            { label: '💎 Best Value', player: result.bestValue },
            ...(result.biggestRegret ? [{ label: '😬 Biggest Regret', player: result.biggestRegret }] : []),
          ].map(({ label, player }) => (
            <div key={label} style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{player.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{player.position} · ${player.salary.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Decision quality vs outcome */}
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>WHAT HAPPENED</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <SummaryCard
            title="Build Quality"
            value={result.grades.buildQuality.grade}
            accent={GRADE_COLOR[result.grades.buildQuality.grade] ?? '#2a2a2a'}
          >
            {result.grades.buildQuality.sentence}
          </SummaryCard>
          <SummaryCard
            title="Game Luck"
            value={result.grades.outcomeLuck.label}
            accent={result.grades.outcomeLuck.label === 'Hot' ? '#27ae60' : result.grades.outcomeLuck.label === 'Cold' ? '#e74c3c' : '#2a6ef5'}
          >
            {result.grades.outcomeLuck.sentence}
          </SummaryCard>
        </div>
        <div style={{
          background: '#0d1a2a',
          border: '1px solid #263b61',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16,
          color: '#cfe0ff',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 4 }}>Read</div>
          {resultRead(result)}
          <div style={{ color: '#9db8e8', marginTop: 8 }}>
            <strong style={{ color: '#fff' }}>Next time:</strong> {result.grades.buildQuality.lesson}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['Contest Fit', result.grades.buildQuality.contestFit],
            ['Salary Use', result.grades.buildQuality.salaryUse],
            ['QB Combo', result.grades.buildQuality.stackQuality],
            ['Risk', result.grades.buildQuality.riskProfile],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ color: '#555', fontSize: 10, marginBottom: 3 }}>{label}</div>
              <div style={{ color: '#ccc', fontSize: 12, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAdvanced((value) => !value)}
          style={{
            width: '100%',
            background: '#111',
            border: '1px solid #2a2a2a',
            color: '#aaa',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: showAdvanced ? 8 : 20,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 800,
            textAlign: 'left',
          }}
        >
          {showAdvanced ? 'Hide Advanced Breakdown' : 'Show Advanced Breakdown'}
        </button>

        {showAdvanced && (
          <>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 600 }}>ADVANCED REPORT CARD</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <GradeCard grade={result.grades.value} label="Score Value" sentence={result.grades.valueSentence} />
              <GradeCard grade={result.grades.ceiling} label="Upside" sentence={result.grades.ceilingSentence} />
              <GradeCard grade={result.grades.leverage} label="Popularity Mix" sentence={result.grades.leverageSentence} />
              <GradeCard grade={result.grades.risk} label="Risk Taken" sentence={result.grades.riskSentence} />
              <GradeCard grade={result.grades.salaryEfficiency} label="Salary Use" sentence={result.grades.salaryEfficiencySentence} />
            </div>
          </>
        )}

        {/* Share card preview */}
        <div style={{
          background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: 13,
          color: '#ccc', whiteSpace: 'pre-line', lineHeight: 1.6,
        }}>
          {result.shareCard}
        </div>

        <button onClick={copy} style={{
          width: '100%', padding: '11px 0', background: '#1a1a1a',
          border: '1px solid #2a6ef5', color: '#4fc3f7', borderRadius: 8,
          fontSize: 14, cursor: 'pointer', marginBottom: 8,
        }}>
          {copied ? '✓ Copied!' : '📋 Copy Share Card'}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onCareer} style={actionBtn('#2a6ef5')}>Career Run →</button>
          <button onClick={onHome} style={actionBtn('#1a1a1a', '#555')}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}

function actionBtn(bg: string, color = '#fff'): React.CSSProperties {
  return {
    padding: '12px 0', background: bg, border: `1px solid ${bg === '#1a1a1a' ? '#2a2a2a' : bg}`,
    color, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };
}
