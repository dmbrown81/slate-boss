import { FB, card, sectionLabel } from './footballStyles';
import { FB_COORDINATORS, FB_CONCEPT_LABEL } from '../lib/footballRogue';
import { deckValueSummary, SEASON_GAMES, type FbRunState, type Reward } from '../lib/footballRun';

interface Props {
  run: FbRunState;
  rewards: Reward[];
  onPick: (reward: Reward) => void;
}

const KIND_COLOR: Record<Reward['kind'], string> = {
  card: FB.green, coordinator: '#b7a7ff', playbook: FB.blue, trim: FB.red, upgrade: FB.gold,
};

export default function FootballReward({ run, rewards, onPick }: Props) {
  const deck = deckValueSummary(run.deck);
  const nextGame = run.gameNumber + 1;

  return (
    <div style={{ minHeight: '100svh', padding: '20px 16px 28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: FB.green, letterSpacing: 2, fontWeight: 800 }}>GAME CLEARED</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: FB.text, marginTop: 4 }}>Front Office</div>
        <div style={{ fontSize: 12.5, color: FB.textDim, marginTop: 4 }}>
          Pick one to strengthen your team before {nextGame >= SEASON_GAMES ? 'the Championship' : `Game ${nextGame}`} — the target rises.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        {rewards.map((rw) => (
          <button
            key={rw.id}
            onClick={() => onPick(rw)}
            style={{ ...card(14), padding: '14px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 13, alignItems: 'center', borderLeft: `3px solid ${KIND_COLOR[rw.kind]}` }}
          >
            <span style={{ fontSize: 26 }}>{rw.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: FB.text }}>{rw.title}</div>
              <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.4, marginTop: 2 }}>{rw.detail}</div>
            </div>
            <span style={{ color: KIND_COLOR[rw.kind], fontSize: 18, fontWeight: 900 }}>＋</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Team status */}
      <div style={{ ...card(12), padding: '12px 14px', marginTop: 20 }}>
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Your team</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Mini label="Deck" value={`${deck.size}`} />
          <Mini label="Avg yards" value={`${deck.avgValue}`} />
          <Mini label="Avg cost" value={`$${deck.avgCost}`} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {run.coordinators.map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>{FB_COORDINATORS[k].name}</span>
          ))}
          {(Object.entries(run.playbook) as [string, number][]).filter(([, l]) => l > 0).map(([c, l]) => (
            <span key={c} style={{ fontSize: 10, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c as keyof typeof FB_CONCEPT_LABEL] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 16, fontWeight: 900, color: FB.text }}>{value}</div>
      <div style={{ fontSize: 9, color: FB.textFaint, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}
