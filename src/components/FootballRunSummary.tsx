import { useState } from 'react';
import { FB, btnPrimary, btnGhost, card } from './footballStyles';
import { FB_CONCEPT_LABEL, FB_COORDINATORS, TEAM_PROFILES } from '../lib/footballRogue';
import { buildCoachDebrief, buildIdentity, deckValueSummary, SEASON_GAMES, type FbRunState } from '../lib/footballRun';

interface Props {
  won: boolean;
  gamesWon: number;
  run: FbRunState;
  lostDrive: number;
  onNewSeason: () => void;
  onHome: () => void;
}

export default function FootballRunSummary({ won, gamesWon, run, lostDrive, onNewSeason, onHome }: Props) {
  const [copied, setCopied] = useState(false);
  const deck = deckValueSummary(run.deck);
  const topPlan = Math.max(0, ...Object.values(run.playbook));
  const identity = buildIdentity(run);
  const debrief = buildCoachDebrief(run, won, gamesWon, lostDrive);
  const team = TEAM_PROFILES[run.team];
  const shareText = `GRIDIRON · ${team.displayName} · ${won ? 'Champions' : `Lost G${gamesWon + 1}`} · ${identity.title} · Seed ${run.seed}`;

  function copyShare() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    }).catch(() => undefined);
  }

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
        <div style={{ marginBottom: 12, padding: '10px 11px', background: FB.inset, border: `1px solid ${identity.level >= 2 ? '#5a4112' : FB.borderSoft}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: FB.textFaint, letterSpacing: 1.2, fontWeight: 900 }}>FINAL BUILD</div>
          <div style={{ fontSize: 17, color: identity.level >= 2 ? FB.gold : FB.text, fontWeight: 900, marginTop: 2 }}>{identity.title}</div>
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 3 }}>{identity.detail}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label="Games won" value={`${gamesWon}/${SEASON_GAMES}`} accent={won ? FB.gold : FB.text} />
          <Stat label="Final deck" value={`${deck.size}`} />
          <Stat label="Coordinators" value={`${run.coordinators.length}`} />
          <Stat label="Top Plan" value={topPlan ? `Lv${topPlan}` : '—'} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {run.coordinators.map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>{FB_COORDINATORS[k].name}</span>
          ))}
          {(Object.entries(run.playbook) as [keyof typeof FB_CONCEPT_LABEL, number][]).filter(([, l]) => l > 0).map(([c, l]) => (
            <span key={c} style={{ fontSize: 10, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
        </div>
        <div style={{ marginTop: 13, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 10, padding: '11px 12px' }}>
          <div style={{ fontSize: 10, color: FB.gold, letterSpacing: 1.1, fontWeight: 900 }}>{debrief.title.toUpperCase()}</div>
          <div style={{ fontSize: 12.5, color: FB.text, lineHeight: 1.4, fontWeight: 700, marginTop: 5 }}>{debrief.takeaway}</div>
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.45, marginTop: 6 }}>{debrief.nextFocus}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
            {debrief.tags.map((tag) => (
              <span key={`${tag.label}-${tag.value}`} style={{ fontSize: 9.5, color: FB.textDim, background: FB.panelSoft, border: `1px solid ${FB.borderSoft}`, borderRadius: 7, padding: '3px 7px', fontWeight: 800 }}>
                {tag.label}: <span style={{ color: FB.text }}>{tag.value}</span>
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={copyShare}
          style={{ width: '100%', marginTop: 12, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 10, color: copied ? FB.green : FB.gold, fontSize: 11.5, fontWeight: 800, padding: '9px 10px', cursor: 'pointer', textAlign: 'left' }}
        >
          {copied ? 'Copied run string' : shareText}
        </button>
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
