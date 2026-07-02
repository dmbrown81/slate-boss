import { useEffect, useState } from 'react';
import { FB, btnPrimary, btnGhost, card } from './footballStyles';
import { FB_CARD_EDITIONS, FB_CONCEPT_LABEL, FB_COORDINATORS, FB_ENVIRONMENTS, FB_BOSS_SCHEMES, STAFF_SLOT_ORDER, STAFF_SLOT_META, randomEnvironment, randomBossScheme, TEAM_PROFILES } from '../lib/footballRogue';
import { buildCoachDebrief, buildIdentity, buildLossReasons, generateBuildTitle, isChampionship, runRng, stakeProfile, SEASON_GAMES, type FbRunState } from '../lib/footballRun';
import { bestGridironHistoryRun, loadGridironHistory, saveGridironDailyResult, saveGridironHistoryEntry, type GridironRunHistoryEntry } from '../lib/gridironStorage';
import { formatRunCode, rarestOwned, coordinatorTaxonomy, RARITY_META } from '../lib/gridironTaxonomy';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';

interface Props {
  won: boolean;
  gamesWon: number;
  run: FbRunState;
  lostDrive: number;
  score: number;
  bestDrive?: number;
  overtimeRound?: number;
  overtimeScore?: number;
  overtimeBestDrive?: number;
  dailyRun?: { date: string; seed: number; practice: boolean };
  onNewSeason: () => void;
  onHome: () => void;
}

export default function FootballRunSummary({ won, gamesWon, run, lostDrive, score, bestDrive = 0, overtimeRound = 0, overtimeScore = 0, overtimeBestDrive = 0, dailyRun, onNewSeason, onHome }: Props) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const runCode = formatRunCode(run.team, run.seed);
  const rarest = rarestOwned(run.coordinators);
  const buildTitle = generateBuildTitle(run);
  const identity = buildIdentity(run);
  // The climactic game's defense + weather, recomputed deterministically from the
  // seed (same derivation FootballSeason uses), for a one-line story highlight.
  const finalGameNo = won ? SEASON_GAMES : gamesWon + 1;
  const finalScope = { seed: run.seed, team: run.team, gameNumber: finalGameNo };
  const finalEnv = FB_ENVIRONMENTS[randomEnvironment(runRng(finalScope, 'environment'))];
  const finalBoss = FB_BOSS_SCHEMES[randomBossScheme(finalGameNo, isChampionship(finalGameNo), runRng(finalScope, 'boss'))];
  const highlight = `${won ? 'Won' : 'Fell'} vs ${finalBoss.label} · ${finalEnv.label}`;
  const debrief = buildCoachDebrief(run, won, gamesWon, lostDrive);
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
  const editedCards = run.deck.filter((c) => c.edition);
  const bestLabel = previousBest
    ? `${TEAM_PROFILES[previousBest.team].displayName} · ${previousBest.won ? 'Champions' : `${previousBest.gamesWon}/${SEASON_GAMES}`} · ${previousBest.score}`
    : 'First recorded run';
  // A complete, PII-free, local share card. Multi-line so it reads as a story:
  // label, build identity + result, score + best drive, Overtime, rarest find,
  // and the replayable code (omitted for daily, which is a fixed assignment).
  const shareLines = [
    dailyRun ? `🏈 CALLSMITH · Daily ${dailyRun.date}` : '🏈 CALLSMITH',
    `${buildTitle} — ${won ? `Champions ${SEASON_GAMES}/${SEASON_GAMES}` : `${gamesWon}/${SEASON_GAMES}`}`,
    `Score ${score}${bestDrive ? ` · Best drive ${bestDrive}` : ''}`,
  ];
  if (run.stake > 1) shareLines.push(`League: ${stakeProfile(run.stake).name}`);
  if (overtimeRound > 0) shareLines.push(`🔥 Overtime: Round ${overtimeRound} · ${overtimeScore} pts`);
  if (rarest) shareLines.push(`Rarest: ${rarest.label} (${RARITY_META[rarest.rarity].label})`);
  if (!dailyRun) shareLines.push(`Code ${runCode}`);
  const shareText = shareLines.join('\n');
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
      identityTitle: buildTitle,
      debrief: debrief.takeaway,
      ...(overtimeRound > 0 ? { overtimeRound, overtimeScore, overtimeBestDrive } : {}),
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
  }, [dailyRun, debrief.takeaway, gamesWon, buildTitle, run.seed, run.team, score, won, overtimeRound, overtimeScore, overtimeBestDrive]);

  function copyShare() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    }).catch(() => undefined);
  }

  function copyCode() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(runCode).then(() => {
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1300);
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
          <div style={{ fontSize: 19, color: identity.level >= 2 ? FB.gold : FB.text, fontWeight: 900, marginTop: 2, lineHeight: 1.1 }}>{buildTitle}</div>
          {run.stake > 1 && <span style={{ display: 'inline-block', marginTop: 5, fontSize: 11, fontWeight: 900, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 999, padding: '2px 8px' }}>🏅 {stakeProfile(run.stake).name}</span>}
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 6 }}>{identity.detail}</div>
          <div style={{ fontSize: 11.5, color: won ? FB.green : FB.textDim, fontWeight: 800, marginTop: 6 }}>{highlight}</div>
        </div>

        {overtimeRound > 0 && (
          <div style={{ marginBottom: 12, padding: '11px 12px', background: 'linear-gradient(160deg,#1f170a,#0e151d)', border: `1px solid #5a4112`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.2, fontWeight: 900 }}>🔥 OVERTIME CHASE</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Stat label="Reached" value={`R${overtimeRound}`} accent={FB.gold} />
              <Stat label="OT score" value={`${overtimeScore}`} accent={FB.gold} />
              <Stat label="Best drive" value={`${overtimeBestDrive}`} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label="Games won" value={`${gamesWon}/${SEASON_GAMES}`} accent={won ? FB.gold : FB.text} />
          <Stat label="Score" value={`${score}`} accent={FB.gold} />
          <Stat label="Best drive" value={`${bestDrive}`} />
          <Stat label="Coordinators" value={`${run.coordinators.length}`} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {run.coordinators.map((k) => {
            const rm = RARITY_META[coordinatorTaxonomy(k).rarity];
            return (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: rm.color }} />{FB_COORDINATORS[k].name}
              </span>
            );
          })}
          {(Object.entries(run.playbook) as [keyof typeof FB_CONCEPT_LABEL, number][]).filter(([, l]) => l > 0).map(([c, l]) => (
            <span key={c} style={{ fontSize: 11, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
          {STAFF_SLOT_ORDER.map((slot) => {
            const key = run.staffBoard?.[slot];
            if (!key) return null;
            return (
              <span key={slot} title={STAFF_SLOT_META[slot].description} style={{ fontSize: 11, fontWeight: 800, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 7, padding: '4px 8px' }}>
                {STAFF_SLOT_META[slot].short} · {FB_COORDINATORS[key].name}
              </span>
            );
          })}
          {editedCards.map((c) => {
            const ed = FB_CARD_EDITIONS[c.edition!];
            return (
              <span key={c.id} style={{ fontSize: 11, fontWeight: 800, color: ed.color, background: FB.inset, border: `1px solid ${ed.color}55`, borderRadius: 7, padding: '4px 8px' }}>
                {c.label} · {ed.label}
              </span>
            );
          })}
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

        {!dailyRun && (
          <div style={{ marginTop: 12, background: '#101720', border: `1px solid ${FB.borderSoft}`, borderRadius: 10, padding: '10px 11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.1, fontWeight: 900 }}>REPLAY CODE</div>
                <div className="fb-num" style={{ fontSize: 16, color: FB.gold, fontWeight: 900, marginTop: 2, letterSpacing: 1 }}>{runCode}</div>
              </div>
              <button onClick={copyCode} style={{ flexShrink: 0, background: FB.inset, border: `1px solid ${FB.borderSoft}`, color: codeCopied ? FB.green : FB.gold, borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                {codeCopied ? '✓ Copied' : '📋 Copy replay'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: FB.textDim, marginTop: 6, lineHeight: 1.35 }}>
              Replay this exact run (team, weather, bosses, shelves) from Home → Play a Code.
              {rarest && <> Rarest find: <span style={{ color: RARITY_META[rarest.rarity].color, fontWeight: 800 }}>{rarest.label} ({RARITY_META[rarest.rarity].label})</span>.</>}
            </div>
          </div>
        )}

        <button
          onClick={copyShare}
          style={{ ...btnPrimary, width: '100%', marginTop: 12, ...(copied ? { background: FB.greenSoft, color: FB.green, boxShadow: 'none' } : {}) }}
        >
          {copied ? '✓ Result copied' : '📋 Copy challenge result'}
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
