import { FB, btnPrimary, btnGhost, card } from './footballStyles';
import { FB_COORDINATORS } from '../lib/footballRogue';
import { deckValueSummary, SEASON_GAMES, type FbRunState } from '../lib/footballRun';

interface Props {
  won: boolean;
  gamesWon: number;
  run: FbRunState;
  lostDrive: number;
  onNewSeason: () => void;
  onHome: () => void;
}

export default function FootballRunSummary({ won, gamesWon, run, lostDrive, onNewSeason, onHome }: Props) {
  const deck = deckValueSummary(run.deck);
  const installs = Object.keys(run.playbook).length;

  return (
    <div style={{ minHeight: '100svh', padding: '28px 16px 28px', display: 'flex', flexDirection: 'column' }}>
      <div className="fb-rise" style={{ textAlign: 'center', borderRadius: 18, padding: '30px 18px', background: won ? 'linear-gradient(180deg,#1c2a12,#0a1610)' : 'linear-gradient(180deg,#2a1018,#0b0f16)', border: `1px solid ${won ? FB.gold : FB.red}` }}>
        <div style={{ fontSize: 56 }}>{won ? '🏆' : '🥶'}</div>
        <div style={{ fontSize: 27, fontWeight: 900, color: FB.text, marginTop: 6 }}>{won ? 'Champions!' : 'Season Over'}</div>
        <div style={{ fontSize: 13, color: FB.textDim, marginTop: 6 }}>
          {won
            ? `You ran the table — all ${SEASON_GAMES} games.`
            : `You won ${gamesWon} of ${SEASON_GAMES} games before stalling on Drive ${lostDrive} of Game ${gamesWon + 1}.`}
        </div>
      </div>

      <div style={{ ...card(14), padding: '14px', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label="Games won" value={`${gamesWon}/${SEASON_GAMES}`} accent={won ? FB.gold : FB.text} />
          <Stat label="Final deck" value={`${deck.size}`} />
          <Stat label="Coordinators" value={`${run.coordinators.length}`} />
          <Stat label="Installs" value={`${installs}`} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {run.coordinators.map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>{FB_COORDINATORS[k].name}</span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
        <button onClick={onHome} style={{ ...btnGhost, flex: 1, padding: '14px 0', fontSize: 14, borderRadius: 12 }}>Home</button>
        <button onClick={onNewSeason} style={{ ...btnPrimary, flex: 2 }}>New Season</button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '9px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 18, fontWeight: 900, color: accent ?? FB.text }}>{value}</div>
      <div style={{ fontSize: 8.5, color: FB.textFaint, letterSpacing: 0.5, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}
