import { useEffect, useState } from 'react';
import { FB, btnPrimary, btnGhost, card } from './footballStyles';
import { FB_CONCEPT_LABEL, FB_COORDINATORS, TEAM_PROFILES } from '../lib/footballRogue';
import { buildCoachDebrief, buildIdentity, buildLossReasons, deckValueSummary, SEASON_GAMES, type FbRunState } from '../lib/footballRun';
import { bestGridironHistoryRun, loadGridironHistory, saveGridironDailyResult, saveGridironHistoryEntry, type GridironRunHistoryEntry } from '../lib/gridironStorage';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';

interface Props {
  won: boolean;
  gamesWon: number;
  run: FbRunState;
  lostDrive: number;
  score: number;
  dailyRun?: { date: string; seed: number; practice: boolean };
  onNewSeason: () => void;
  onHome: () => void;
}

export default function FootballRunSummary({ won, gamesWon, run, lostDrive, score, dailyRun, onNewSeason, onHome }: Props) {
  const [copied, setCopied] = useState(false);
  const deck = deckValueSummary(run.deck);
  const identity = buildIdentity(run);
  const debrief = buildCoachDebrief(run, won, gamesWon, lostDrive);
  const team = TEAM_PROFILES[run.team];
  const coachId = TEAM_IDENTITY[run.team];
  const coachOpener = won
    ? `We ran the table. ${coachId.quote}`
    : gamesWon > 0
      ? `${gamesWon} in the books before the wall. ${coachId.quote}`
      : `Rough opener. ${coachId.quote} We regroup.`;
  const history = loadGridironHistory();
  const previousBest = bestGridironHistoryRun(history);
  const recent = history.slice(0, 5);
  const lossReasons = won ? [] : buildLossReasons(run, gamesWon, lostDrive);
  const bestLabel = previousBest
    ? `${TEAM_PROFILES[previousBest.team].displayName} · ${previousBest.won ? 'Champions' : `${previousBest.gamesWon}/${SEASON_GAMES}`} · ${previousBest.score}`
    : 'First recorded run';
  const shareText = dailyRun
    ? `GRIDIRON Daily ${dailyRun.date} · ${team.shortName} · ${won ? 'Champions 5/5' : `${gamesWon}/${SEASON_GAMES}`} · ${score}`
    : `GRIDIRON · ${team.displayName} · ${won ? 'Champions' : `Lost G${gamesWon + 1}`} · ${identity.title} · Score ${score} · Seed ${run.seed}`;
  const dailyLabel = dailyRun
    ? dailyRun.practice
      ? `Daily practice · ${dailyRun.date}`
      : `Daily Scrimmage · ${dailyRun.date}`
    : null;

  useEffect(() => {
    saveGridironHistoryEntry({
      id: `${run.seed}:${run.team}:${won ? 'won' : 'lost'}:${gamesWon}:${score}`,
      completedAt: new Date().toISOString(),
      seed: run.seed,
      team: run.team,
      won,
      gamesWon,
      score,
      identityTitle: identity.title,
      debrief: debrief.takeaway,
    });
    if (dailyRun && !dailyRun.practice) {
      saveGridironDailyResult({
        date: dailyRun.date,
        seed: dailyRun.seed,
        team: run.team,
        won,
        gamesWon,
        score,
      });
    }
  }, [dailyRun, debrief.takeaway, gamesWon, identity.title, run.seed, run.team, score, won]);

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
        {dailyLabel && <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, letterSpacing: 1.1, marginTop: 4 }}>{dailyLabel.toUpperCase()}</div>}
        <div style={{ fontSize: 13, color: FB.textDim, marginTop: 6 }}>
          {won
            ? `You ran the table — all ${SEASON_GAMES} games.`
            : `You won ${gamesWon} of ${SEASON_GAMES} games before stalling on Drive ${lostDrive} of Game ${gamesWon + 1}.`}
        </div>
      </div>

      <div style={{ ...card(14), padding: '12px 14px', marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', borderLeft: `4px solid ${coachId.primary}` }}>
        <CoachPortrait team={run.team} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: FB.text }}>{coachId.coachName}</div>
          <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.4, marginTop: 3, fontStyle: 'italic' }}>“{coachOpener}”</div>
        </div>
      </div>

      <div style={{ ...card(14), padding: '14px', marginTop: 12 }}>
        <div style={{ marginBottom: 12, padding: '10px 11px', background: FB.inset, border: `1px solid ${identity.level >= 2 ? '#5a4112' : FB.borderSoft}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.2, fontWeight: 900 }}>FINAL BUILD</div>
          <div style={{ fontSize: 17, color: identity.level >= 2 ? FB.gold : FB.text, fontWeight: 900, marginTop: 2 }}>{identity.title}</div>
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 3 }}>{identity.detail}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label="Games won" value={`${gamesWon}/${SEASON_GAMES}`} accent={won ? FB.gold : FB.text} />
          <Stat label="Score" value={`${score}`} accent={FB.gold} />
          <Stat label="Final deck" value={`${deck.size}`} />
          <Stat label="Coordinators" value={`${run.coordinators.length}`} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {run.coordinators.map((k) => (
            <span key={k} style={{ fontSize: 11, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>{FB_COORDINATORS[k].name}</span>
          ))}
          {(Object.entries(run.playbook) as [keyof typeof FB_CONCEPT_LABEL, number][]).filter(([, l]) => l > 0).map(([c, l]) => (
            <span key={c} style={{ fontSize: 11, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
        </div>
        <div style={{ marginTop: 13, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 10, padding: '11px 12px' }}>
          <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.1, fontWeight: 900 }}>{debrief.title.toUpperCase()}</div>
          <div style={{ fontSize: 12.5, color: FB.text, lineHeight: 1.4, fontWeight: 700, marginTop: 5 }}>{debrief.takeaway}</div>
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.45, marginTop: 6 }}>{debrief.nextFocus}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
            {debrief.tags.map((tag) => (
              <span key={`${tag.label}-${tag.value}`} style={{ fontSize: 11, color: FB.textDim, background: FB.panelSoft, border: `1px solid ${FB.borderSoft}`, borderRadius: 7, padding: '3px 7px', fontWeight: 800 }}>
                {tag.label}: <span style={{ color: FB.text }}>{tag.value}</span>
              </span>
            ))}
          </div>
        </div>
        {lossReasons.length > 0 && (
          <div style={{ marginTop: 12, background: 'linear-gradient(180deg,#1d1014,#120c10)', border: `1px solid #4a2530`, borderRadius: 10, padding: '11px 12px' }}>
            <div style={{ fontSize: 11, color: FB.red, letterSpacing: 1.1, fontWeight: 900 }}>WHY THE SEASON ENDED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {lossReasons.map((reason, i) => (
                <div key={reason.label} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, background: i === 0 ? '#4a2530' : FB.inset, border: `1px solid ${i === 0 ? FB.red : FB.borderSoft}`, color: i === 0 ? FB.red : FB.textDim, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: FB.text, fontWeight: 800, lineHeight: 1.25 }}>{reason.label}</div>
                    <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 1 }}>{reason.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, background: '#101720', border: `1px solid ${previousBest && score >= previousBest.score ? '#5a4112' : FB.borderSoft}`, borderRadius: 10, padding: '10px 11px' }}>
          <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.1, fontWeight: 900 }}>LOCAL BEST</div>
          <div style={{ fontSize: 12, color: FB.text, lineHeight: 1.35, marginTop: 4, fontWeight: 800 }}>{bestLabel}</div>
          {previousBest && (
            <div style={{ fontSize: 11, color: score > previousBest.score ? FB.green : FB.textDim, marginTop: 4 }}>
              {score > previousBest.score ? `New high score by ${score - previousBest.score}.` : `Needed ${previousBest.score - score + 1} more to beat it.`}
            </div>
          )}
        </div>
        {recent.length > 0 && (
          <div style={{ marginTop: 12, background: '#101720', border: `1px solid ${FB.borderSoft}`, borderRadius: 10, padding: '10px 11px' }}>
            <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.1, fontWeight: 900, marginBottom: 7 }}>RECENT RUNS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.map((entry) => (
                <RunFingerprint key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={copyShare}
          style={{ width: '100%', marginTop: 12, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 10, color: copied ? FB.green : FB.gold, fontSize: 11.5, fontWeight: 800, padding: '9px 10px', cursor: 'pointer', textAlign: 'left' }}
        >
          {copied ? 'Copied recap to clipboard' : `📋 ${shareText}`}
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

// A scannable one-line fingerprint of a past run: team-colour stripe, 5 W/L dots
// (a loss is the red dot after the last win), identity, and score.
function RunFingerprint({ entry }: { entry: GridironRunHistoryEntry }) {
  const id = TEAM_IDENTITY[entry.team];
  const profile = TEAM_PROFILES[entry.team];
  const dots = Array.from({ length: SEASON_GAMES }, (_, i) => {
    if (i < entry.gamesWon) return 'win';
    if (!entry.won && i === entry.gamesWon) return 'loss';
    return 'empty';
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ flexShrink: 0, width: 4, height: 26, borderRadius: 3, background: id.primary }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: FB.text, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {profile.shortName} · {entry.identityTitle}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
          {dots.map((d, i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: 2, background: d === 'win' ? FB.green : d === 'loss' ? FB.red : '#22303f' }} />
          ))}
        </div>
      </div>
      <span className="fb-num" style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, color: entry.won ? FB.gold : FB.textDim }}>
        {entry.won ? '🏆' : `${entry.gamesWon}/${SEASON_GAMES}`} · {entry.score}
      </span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '9px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 18, fontWeight: 900, color: accent ?? FB.text }}>{value}</div>
      <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 0.5, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}
