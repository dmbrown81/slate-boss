import type { ContestResult, Lineup, Player } from '../types';
import { ROSTER_SLOTS } from '../types';
import type { RogueLedgerEntry, RoguePattern, RogueScoreResult } from '../lib/rogueScoring';

interface Props {
  result: ContestResult;
  lineup: Lineup;
  rogueScore: RogueScoreResult;
  onHome: () => void;
  onReplay: () => void;
}

const TARGET_SCORE = 210;

function formatEdge(n: number): string {
  return `${n.toFixed(2)}x`;
}

function signedEdge(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
}

function ledgerTone(kind: RogueLedgerEntry['kind']): string {
  if (kind === 'base') return '#2a6ef5';
  if (kind === 'pattern') return '#6b55c8';
  if (kind === 'coordinator') return '#f59e0b';
  return '#27ae60';
}

function PatternCard({ pattern }: { pattern: RoguePattern }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #2a2540',
      borderRadius: 8,
      padding: '9px 10px',
      minWidth: 0,
    }}>
      <div style={{ color: '#fff', fontSize: 12, fontWeight: 900, marginBottom: 3 }}>{pattern.name}</div>
      <div style={{ color: '#8d82bd', fontSize: 10, lineHeight: 1.35, marginBottom: 7 }}>{pattern.description}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {pattern.edgeAdd > 0 && (
          <span style={pillStyle('#241c3f', '#b7a7ff')}>Edge {signedEdge(pattern.edgeAdd)}</span>
        )}
        {pattern.edgeMult !== 1 && (
          <span style={pillStyle('#1b2b1f', '#8ee0b3')}>x{pattern.edgeMult.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}

function ScoreLine({ entry }: { entry: RogueLedgerEntry }) {
  const tone = ledgerTone(entry.kind);
  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${tone}55`,
      borderRadius: 8,
      padding: '9px 10px',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gap: 10,
      alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>{entry.label}</div>
        <div style={{ color: '#777', fontSize: 10, lineHeight: 1.35, marginTop: 2 }}>{entry.detail}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {entry.baseDelta !== undefined && <span style={pillStyle('#102030', '#8fc8ff')}>Base +{entry.baseDelta.toFixed(1)}</span>}
          {entry.edgeAdd !== undefined && <span style={pillStyle('#241c3f', '#b7a7ff')}>Edge {signedEdge(entry.edgeAdd)}</span>}
          {entry.edgeMult !== undefined && <span style={pillStyle('#1b2b1f', '#8ee0b3')}>x{entry.edgeMult.toFixed(2)}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#ccc', fontSize: 12, fontWeight: 800 }}>{entry.runningBase.toFixed(1)}</div>
        <div style={{ color: tone, fontSize: 13, fontWeight: 900 }}>{formatEdge(entry.runningEdge)}</div>
      </div>
    </div>
  );
}

export default function RogueResultsScreen({ result, lineup, rogueScore, onHome, onReplay }: Props) {
  const cleared = rogueScore.finalScore >= TARGET_SCORE;
  const lineupPlayers = ROSTER_SLOTS.map((slot) => lineup[slot]).filter(Boolean) as Player[];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', paddingBottom: 36 }}>
      <div style={{
        background: cleared ? '#071d14' : '#171126',
        borderBottom: `2px solid ${cleared ? '#27ae60' : '#6b55c8'}`,
        padding: '20px 16px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#777', fontSize: 12, marginBottom: 6 }}>Rogue Prototype</div>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, marginBottom: 4 }}>{rogueScore.buildLabel}</div>
        <div style={{ color: '#fff', fontSize: 44, fontWeight: 950, letterSpacing: -1 }}>
          {rogueScore.finalScore.toFixed(1)}
          <span style={{ color: '#777', fontSize: 15, marginLeft: 5 }}>engine</span>
        </div>
        <div style={{ color: cleared ? '#8ee0b3' : '#b7a7ff', fontSize: 12, marginTop: 4, fontWeight: 800 }}>
          {cleared ? 'Boss target cleared' : `${(TARGET_SCORE - rogueScore.finalScore).toFixed(1)} short of prototype boss target`}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 12,
        }}>
          <Metric label="Base" value={rogueScore.adjustedBasePoints.toFixed(1)} tone="#4fc3f7" />
          <Metric label="Flat Edge" value={signedEdge(rogueScore.flatEdge)} tone="#b7a7ff" />
          <Metric label="Total Edge" value={formatEdge(rogueScore.edgeMultiplier)} tone="#8ee0b3" />
        </div>

        <div style={{
          background: '#111',
          border: '1px solid #2a2540',
          borderRadius: 9,
          padding: '10px 12px',
          marginBottom: 12,
        }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, marginBottom: 4 }}>Engine Read</div>
          <div style={{ color: '#b7a7ff', fontSize: 12, lineHeight: 1.45 }}>
            {rogueScore.headline} Contest sim: {result.userScore.toFixed(1)} pts, rank {result.userRank}/{result.totalEntrants}.
          </div>
        </div>

        <div style={{ color: '#888', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>LINEUP PATTERNS</div>
        {rogueScore.patterns.length ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}>
            {rogueScore.patterns.map((pattern) => <PatternCard key={pattern.key} pattern={pattern} />)}
          </div>
        ) : (
          <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#777',
            fontSize: 12,
            marginBottom: 14,
          }}>
            No major patterns fired. Try a QB stack, bring-back, punt value, or leverage core.
          </div>
        )}

        <div style={{ color: '#888', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>SCORING LEDGER</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {rogueScore.ledger.map((entry) => <ScoreLine key={entry.id} entry={entry} />)}
        </div>

        <div style={{ color: '#888', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>STARTER COORDINATORS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {rogueScore.coordinators.map((coordinator) => (
            <div key={coordinator.key} style={{
              background: '#111',
              border: '1px solid #2a2540',
              borderRadius: 8,
              padding: '9px 10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>{coordinator.name}</span>
                <span style={{ color: '#777', fontSize: 10, textTransform: 'uppercase' }}>{coordinator.family.replace('_', ' ')}</span>
              </div>
              <div style={{ color: '#8d82bd', fontSize: 11, lineHeight: 1.35 }}>{coordinator.description}</div>
            </div>
          ))}
        </div>

        <div style={{ color: '#888', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>LINEUP SCORECARD</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {lineupPlayers.map((player) => {
            const score = result.userEntry.scores.find((row) => row.playerId === player.id)?.final ?? 0;
            return (
              <div key={player.id} style={{
                background: '#111',
                border: `1px solid ${score >= player.displayedProjection ? '#1f6f47' : '#1e1e1e'}`,
                borderRadius: 8,
                padding: '8px 9px',
              }}>
                <div style={{ color: '#ccc', fontSize: 12, fontWeight: 800 }}>{player.name}</div>
                <div style={{ color: '#666', fontSize: 10 }}>{player.position} {player.team} ${player.salary.toLocaleString()}</div>
                <div style={{ color: score >= player.displayedProjection ? '#8ee0b3' : '#777', fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                  {score.toFixed(1)} <span style={{ color: '#555', fontSize: 10 }}>pts</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={onReplay} style={actionStyle('#6b55c8', '#fff')}>Run Another Rogue Slate</button>
          <button onClick={onHome} style={actionStyle('#111', '#aaa')}>Home</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #1f1f1f',
      borderRadius: 8,
      padding: '10px 8px',
      textAlign: 'center',
      minWidth: 0,
    }}>
      <div style={{ color: tone, fontSize: 17, fontWeight: 950, overflowWrap: 'anywhere' }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function pillStyle(background: string, color: string): React.CSSProperties {
  return {
    background,
    color,
    borderRadius: 999,
    padding: '3px 7px',
    fontSize: 10,
    fontWeight: 900,
  };
}

function actionStyle(background: string, color: string): React.CSSProperties {
  return {
    background,
    color,
    border: `1px solid ${background === '#111' ? '#2a2a2a' : background}`,
    borderRadius: 8,
    padding: '12px 10px',
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  };
}

