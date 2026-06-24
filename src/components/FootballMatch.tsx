import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  buildStarterDeck, scoreFootballPlay, shuffle, cardCost,
  HAND_SIZE, DRIVES_PER_MATCH, AUDIBLES_PER_DRIVE, MAX_PLAY_CARDS, DRIVE_BUDGET,
  FB_BOSS_SCHEMES, FB_COORDINATORS, FB_ENVIRONMENTS, FB_CONCEPT_LABEL, FB_CARD_MODIFIERS, TEAM_PROFILES,
  type FbBossSchemeKey, type FbCard, type FbCoordinatorKey, type FbEnvironmentKey, type FbPlaybook, type FbPlayResult, type FbConceptKey, type TeamArchetype,
} from '../lib/footballRogue';
import { mulberry32, stringSeed, type RNG } from '../lib/rng';
import { buildIdentity } from '../lib/footballRun';
import { FB, SIDE, btnPrimary, btnGhost } from './footballStyles';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';
import FootballHelpModal from './FootballHelpModal';
import { haptic } from '../lib/feedback';
import { loadGridironPrefs, saveGridironPrefs, type GridironPrefs } from '../lib/gridironStorage';

export interface MatchProps {
  team: TeamArchetype;
  deck: FbCard[];
  coordinators: FbCoordinatorKey[];
  playbook: FbPlaybook;
  bombGames: number;
  keeperGames: number;
  takeawayGames: number;
  targets: number[];
  environment: FbEnvironmentKey;
  bossScheme: FbBossSchemeKey;
  gameNumber: number;
  totalGames: number;
  championship: boolean;
  seed: number;
  audiblesPerDrive?: number;
  // When set (1-based), this match is an Overtime score-chase round, not a
  // campaign game. Display + result copy switch to Overtime; scoring is unchanged.
  overtimeRound?: number;
  onWon: (summary: { bombLanded: boolean; keeperLanded: boolean; takeawayGame: boolean; score: number; bestDrive: number }) => void;
  onLost: (info: { drive: number; score: number; bestDrive: number }) => void;
  onHome: () => void;
}

interface MatchState {
  deck: FbCard[];
  hand: FbCard[];
  discard: FbCard[];
  driveIndex: number;
  driveScore: number;
  totalScore: number;
  budgetLeft: number;
  audiblesLeft: number;
  stacksThisMatch: number;
  groundBonusThisMatch: number;
  qbRunsThisMatch: number;
  defPlaysThisMatch: number;
  cleanConceptsThisMatch: number;
  bestDriveThisMatch: number;
  bombLanded: boolean;
  keeperLanded: boolean;
  signatureFired: boolean;
  conceptCountsThisDrive: Partial<Record<FbConceptKey, number>>;
  status: 'playing' | 'won' | 'lost';
  lastPlay: FbPlayResult | null;
  popKey: number;
}

function freshDrive(deck: FbCard[], discard: FbCard[], rng: RNG) {
  const pool = shuffle([...deck, ...discard], rng);
  return { deck: pool.slice(HAND_SIZE), hand: pool.slice(0, HAND_SIZE), discard: [] as FbCard[] };
}

function drawUp(deck: FbCard[], hand: FbCard[], discard: FbCard[], rng: RNG) {
  let d = [...deck]; let dp = [...discard]; const h = [...hand];
  while (h.length < HAND_SIZE) {
    if (d.length === 0) { if (dp.length === 0) break; d = shuffle(dp, rng); dp = []; }
    h.push(d.shift()!);
  }
  return { deck: d, hand: h, discard: dp };
}

// Concepts splashy enough to earn a full-bleed banner. Everything else stays
// quiet — the brief's rule is "boring concepts get a chip, splashy ones a banner."
const SPLASH_CONCEPTS = new Set<FbConceptKey>(['double_stack_bomb', 'shootout_stack', 'pick_six', 'qb_keeper']);
const DRIVE_STAMP = ['FIRST DOWN', 'DRIVE!', 'TOUCHDOWN!'] as const;

interface PlayStampState {
  id: number;
  kind: 'drive' | 'concept' | 'turnover';
  text: string;
  tone: 'gold' | 'red';
}

// Count a number up to its target with an ease-out curve. Only animates on an
// increase (a scored play); resets like a new drive snap instantly. Honors
// reduced motion by snapping.
function useCountUp(value: number, reduced: boolean, quick: boolean) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduced || value <= from) {
      setDisplay(value);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const dur = quick ? 220 : 480;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, quick]);

  return display;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

export default function FootballMatch(props: MatchProps) {
  const { team, deck: runDeck, coordinators, playbook, bombGames, keeperGames, takeawayGames, targets, environment, bossScheme, gameNumber, totalGames, championship, seed } = props;
  const overtimeRound = props.overtimeRound ?? 0;
  const isOvertime = overtimeRound > 0;
  const audPerDrive = props.audiblesPerDrive ?? AUDIBLES_PER_DRIVE;
  const teamId = TEAM_IDENTITY[team];
  const [matchRng] = useState<RNG>(() => mulberry32(stringSeed(`gridiron-match:${seed}:g${gameNumber}:${environment}:${bossScheme}`)));

  const [match, setMatch] = useState<MatchState>(() => {
    const full = shuffle(runDeck.length ? runDeck : buildStarterDeck().cards, matchRng);
    return {
      deck: full.slice(HAND_SIZE), hand: full.slice(0, HAND_SIZE), discard: [],
      driveIndex: 0, driveScore: 0, totalScore: 0,
      budgetLeft: DRIVE_BUDGET[0], audiblesLeft: audPerDrive,
      stacksThisMatch: 0, groundBonusThisMatch: 0, qbRunsThisMatch: 0, defPlaysThisMatch: 0, cleanConceptsThisMatch: 0,
      bestDriveThisMatch: 0,
      bombLanded: false, keeperLanded: false, signatureFired: false,
      conceptCountsThisDrive: {}, status: 'playing', lastPlay: null, popKey: 0,
    };
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [scoreBeat, setScoreBeat] = useState(0);
  const [stamp, setStamp] = useState<PlayStampState | null>(null);
  const [buildOpen, setBuildOpen] = useState(() => gameNumber === 1);
  // Boss-intro reveal: a short full-screen card naming the defense before the
  // snap, from Game 2 on. Skippable on tap; it never gates play for long.
  // Suppressed in Overtime — the score-chase wants fast iteration, and the boss
  // is already shown on the scoreboard each round.
  const [showBossIntro, setShowBossIntro] = useState(() => gameNumber >= 2 && bossScheme !== 'balanced' && overtimeRound === 0);
  const [liveMessage, setLiveMessage] = useState('');
  const [prefs, setPrefs] = useState<GridironPrefs>(() => loadGridironPrefs());
  const [askCoach, setAskCoach] = useState(false);
  const [laneCallout, setLaneCallout] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const quickMode = prefs.quickResults && !reducedMotion;
  const displayDriveScore = useCountUp(match.driveScore, reducedMotion, quickMode);
  // The action bar is fixed at the bottom and its Play Preview grows when cards
  // are selected. Measure it so the scroll container reserves exactly enough room
  // to scroll the whole hand clear of it (otherwise the preview covers the last
  // card groups — Defense / Kick). Falls back to a safe default before measure.
  const actionBarRef = useRef<HTMLDivElement>(null);
  const [actionBarHeight, setActionBarHeight] = useState(240);
  useEffect(() => {
    const el = actionBarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setActionBarHeight(el.offsetHeight));
    ro.observe(el);
    setActionBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [match.status]);

  function updatePrefs(patch: Partial<GridironPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveGridironPrefs(next);
      return next;
    });
  }

  const selectedCards = useMemo(
    () => selected.map((id) => match.hand.find((c) => c.id === id)).filter(Boolean) as FbCard[],
    [selected, match.hand],
  );
  const scoreCtx = useMemo(() => ({
    coordinators, environment, bossScheme, playbook, bombGames, keeperGames, takeawayGames,
    stacksThisMatch: match.stacksThisMatch,
    groundBonusThisMatch: match.groundBonusThisMatch,
    qbRunsThisMatch: match.qbRunsThisMatch,
    defPlaysThisMatch: match.defPlaysThisMatch,
    conceptCountsThisDrive: match.conceptCountsThisDrive,
    driveIndex: match.driveIndex,
    championship,
  }), [coordinators, environment, bossScheme, playbook, bombGames, keeperGames, takeawayGames, match.stacksThisMatch, match.groundBonusThisMatch, match.qbRunsThisMatch, match.defPlaysThisMatch, match.conceptCountsThisDrive, match.driveIndex, championship]);
  const preview = useMemo(() => scoreFootballPlay(selectedCards, scoreCtx), [selectedCards, scoreCtx]);

  const env = FB_ENVIRONMENTS[environment];
  const boss = FB_BOSS_SCHEMES[bossScheme];
  const identity = useMemo(() => buildIdentity({ deck: runDeck, playbook }), [runDeck, playbook]);
  const target = targets[match.driveIndex];
  const remaining = Math.max(0, target - match.driveScore);
  const pct = Math.min(100, (match.driveScore / target) * 100);
  const selectedCost = selectedCards.reduce((s, c) => s + cardCost(c), 0);
  const overBudget = selectedCost > match.budgetLeft;
  const cheapest = match.hand.length ? Math.min(...match.hand.map((c) => cardCost(c))) : 0;
  const canAffordAnything = match.budgetLeft >= cheapest;
  const handHasPass = match.hand.some((c) => c.side === 'pass');
  const handHasRun = match.hand.some((c) => c.action === 'power_run' || c.action === 'breakaway_run');
  const handGroups = useMemo(() => groupHand(match.hand), [match.hand]);
  // Game 1 teaches with an always-on coach. From Game 2 the coach steps back —
  // the player owns it — but an "Ask coach" affordance re-surfaces the same
  // team-aware read on demand, so the handoff isn't a silent cliff.
  const coachActive = gameNumber === 1 || askCoach;
  const coach = useMemo(
    () => (coachActive ? coachGuidance(team, match, selectedCards, preview, target, remaining) : null),
    [coachActive, team, match, selectedCards, preview, target, remaining],
  );
  const coachHighlights = useMemo(() => new Set(coach?.highlightIds ?? []), [coach]);
  const coachEyebrow = gameNumber === 1 ? "COACH'S FIRST DRIVE" : 'COACH (ON REQUEST)';
  const mathVisible = gameNumber === 1 || prefs.showMath;
  const showG2Intro = gameNumber >= 2 && !askCoach && match.status === 'playing' && match.driveIndex === 0 && !match.lastPlay;
  const firstDriveFocus = gameNumber === 1 && match.driveIndex === 0 && match.status === 'playing' && !match.lastPlay;
  const playbookEntries = useMemo(
    () => (Object.entries(playbook) as [FbConceptKey, number][]).filter(([, level]) => level > 0),
    [playbook],
  );
  const visibleScoreBeat = reducedMotion && match.lastPlay ? 3 : scoreBeat;
  const teamPlan = teamWinCondition(team);

  useEffect(() => {
    if (!match.lastPlay) return undefined;
    if (reducedMotion) return undefined;
    const delays = quickMode ? [80, 160, 240] : [260, 560, 900];
    const timers = delays.map((ms, i) => window.setTimeout(() => setScoreBeat(i + 1), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [match.lastPlay, match.popKey, reducedMotion, quickMode]);

  // A stalled drive earns a beat of mourning before the result panel.
  useEffect(() => {
    if (match.status !== 'lost') return undefined;
    haptic('turnover', prefs.hapticsEnabled);
    const timer = window.setTimeout(
      () => setStamp({ id: match.popKey, kind: 'turnover', text: 'TURNOVER ON DOWNS', tone: 'red' }),
      reducedMotion ? 0 : 120,
    );
    return () => window.clearTimeout(timer);
  }, [match.status, match.popKey, reducedMotion, prefs.hapticsEnabled]);

  // Signature lane callout (Volts keeper chain, Ghosts pressure chain, …) is a
  // transient toast — auto-dismiss it. Snappier under Quick Results.
  useEffect(() => {
    if (!laneCallout) return undefined;
    const timer = window.setTimeout(() => setLaneCallout(null), quickMode ? 1100 : 2200);
    return () => window.clearTimeout(timer);
  }, [laneCallout, quickMode]);

  // Stamps and banners are a flash, not a panel — auto-dismiss them.
  useEffect(() => {
    if (!stamp) return undefined;
    const full = stamp.kind === 'turnover' ? 1400 : 1050;
    // Quick Results snaps ordinary drive stamps; splash concepts + turnovers keep weight.
    const ms = reducedMotion ? Math.min(full, 850) : quickMode && stamp.kind === 'drive' ? 480 : full;
    const timer = window.setTimeout(() => setStamp((s) => (s?.id === stamp.id && s.kind === stamp.kind ? null : s)), ms);
    return () => window.clearTimeout(timer);
  }, [stamp, reducedMotion, quickMode]);

  function toggle(id: string) {
    if (match.status !== 'playing') return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_PLAY_CARDS ? prev : [...prev, id]);
  }

  function runPlay() {
    if (match.status !== 'playing' || selectedCards.length === 0 || overBudget) return;
    const result = scoreFootballPlay(selectedCards, scoreCtx);
    setScoreBeat(0);
    const projectedDriveScore = match.driveScore + result.total;
    const projectedBudget = match.budgetLeft - result.cost;
    const cleared = projectedDriveScore >= target;
    setLiveMessage(`${result.playName} scored ${result.total}. ${cleared ? 'Drive cleared.' : `Drive score ${projectedDriveScore}, ${Math.max(0, target - projectedDriveScore)} to go, ${projectedBudget} budget left.`}`);

    // Theatre: a cleared drive escalates FIRST DOWN → DRIVE! → TOUCHDOWN!;
    // otherwise a splash concept gets its own banner. Quiet plays stay quiet.
    if (result.valid) {
      if (match.driveScore + result.total >= target) {
        setStamp({ id: Date.now(), kind: 'drive', text: DRIVE_STAMP[Math.min(match.driveIndex, DRIVE_STAMP.length - 1)], tone: 'gold' });
      } else if (SPLASH_CONCEPTS.has(result.concept)) {
        setStamp({ id: Date.now(), kind: 'concept', text: FB_CONCEPT_LABEL[result.concept] ?? result.playName, tone: 'gold' });
      }
    }

    // Signature engine moment — Volts keeper chain, Ghosts pressure chain, etc.
    // Fires once per game, the first time the team's identity concept connects.
    const sig = result.valid ? signatureCallout(team, result.concept) : null;
    if (sig && !match.signatureFired) {
      setLaneCallout(sig);
      haptic('signature', prefs.hapticsEnabled);
    } else if (cleared) {
      haptic('drive_clear', prefs.hapticsEnabled);
    }
    if (askCoach) setAskCoach(false);

    setMatch((m) => {
      const playedIds = new Set(selected);
      const handAfter = m.hand.filter((c) => !playedIds.has(c.id));
      const discardAfter = [...m.discard, ...m.hand.filter((c) => playedIds.has(c.id))];
      const newScore = m.driveScore + result.total;
      const newBudget = m.budgetLeft - result.cost;
      const isStackCon = result.concept === 'stack_td' || result.concept === 'double_stack_bomb' || result.concept === 'shootout_stack';
      const isDefSplash = result.concept === 'pick_six' || result.concept === 'takeaway' || result.concept === 'sack';
      const playedQbRun = result.valid && selectedCards.some((c) => c.action === 'scramble' || c.action === 'qb_sneak');
      const stacks = m.stacksThisMatch + (isStackCon ? 1 : 0);
      const ground = m.groundBonusThisMatch + (result.concept === 'ground_pound' ? 6 : 0);
      const qbRuns = m.qbRunsThisMatch + (playedQbRun ? 1 : 0);
      const defPlays = m.defPlaysThisMatch + (isDefSplash ? 1 : 0);
      const cleanConcepts = m.cleanConceptsThisMatch + (result.valid && result.concept !== 'busted_play' ? 1 : 0);
      const bomb = m.bombLanded || result.concept === 'double_stack_bomb';
      const keeper = m.keeperLanded || result.concept === 'qb_keeper';
      const counts = { ...m.conceptCountsThisDrive, [result.concept]: (m.conceptCountsThisDrive[result.concept] ?? 0) + 1 };
      const signatureFired = m.signatureFired || (result.valid && Boolean(signatureCallout(team, result.concept)));
      const base = { ...m, stacksThisMatch: stacks, groundBonusThisMatch: ground, qbRunsThisMatch: qbRuns, defPlaysThisMatch: defPlays, cleanConceptsThisMatch: cleanConcepts, bestDriveThisMatch: Math.max(m.bestDriveThisMatch, newScore), bombLanded: bomb, keeperLanded: keeper, signatureFired, lastPlay: result, popKey: m.popKey + 1 };

      if (newScore >= target) {
        const nextIndex = m.driveIndex + 1;
        if (nextIndex >= DRIVES_PER_MATCH) {
          return { ...base, driveScore: newScore, totalScore: m.totalScore + newScore, budgetLeft: newBudget, conceptCountsThisDrive: counts, status: 'won' };
        }
        const fd = freshDrive(m.deck, discardAfter, matchRng);
        return { ...base, ...fd, driveIndex: nextIndex, driveScore: 0, totalScore: m.totalScore + newScore, budgetLeft: DRIVE_BUDGET[nextIndex], audiblesLeft: audPerDrive, conceptCountsThisDrive: {}, status: 'playing' };
      }

      const drawn = drawUp(m.deck, handAfter, discardAfter, matchRng);
      const broke = newBudget < (drawn.hand.length ? Math.min(...drawn.hand.map((c) => c.cost)) : Infinity);
      return { ...base, ...drawn, driveScore: newScore, totalScore: m.totalScore + result.total, budgetLeft: newBudget, conceptCountsThisDrive: counts, status: broke ? 'lost' : 'playing' };
    });
    setSelected([]);
  }

  function audible() {
    if (match.status !== 'playing' || selectedCards.length === 0 || match.audiblesLeft <= 0) return;
    setMatch((m) => {
      const ids = new Set(selected);
      const handAfter = m.hand.filter((c) => !ids.has(c.id));
      const discardAfter = [...m.discard, ...m.hand.filter((c) => ids.has(c.id))];
      const drawn = drawUp(m.deck, handAfter, discardAfter, matchRng);
      return { ...m, ...drawn, audiblesLeft: m.audiblesLeft - 1 };
    });
    setSelected([]);
  }

  return (
    <div style={{ minHeight: '100svh', paddingTop: 14, paddingLeft: 14, paddingRight: 14, paddingBottom: match.status === 'playing' ? actionBarHeight + 24 : 26, display: 'flex', flexDirection: 'column', gap: 11, position: 'relative' }}>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={props.onHome} aria-label="Return home" style={{ ...btnGhost, minWidth: 44, minHeight: 44 }}>←</button>
        <div style={{ fontSize: 11, color: isOvertime ? '#f0b429' : FB.gold, letterSpacing: 1.5, fontWeight: 900 }}>
          {isOvertime ? `🔥 OVERTIME · ROUND ${overtimeRound}` : championship ? '🏆 CHAMPIONSHIP' : `GAME ${gameNumber} / ${totalGames}`}
        </div>
        <button onClick={() => setShowHelp(true)} aria-label="Open how to play" style={{ ...btnGhost, minWidth: 44, minHeight: 44 }}>?</button>
      </div>

      <div className="fb-yard" style={{ background: championship ? 'linear-gradient(180deg,#2a2410,#0b1119)' : 'linear-gradient(180deg,#11202c,#0b1119)', border: `1px solid ${championship ? '#5a4a16' : FB.border}`, borderLeft: `4px solid ${teamId.primary}`, borderRadius: 16, padding: firstDriveFocus ? 11 : 15 }}>
        {!firstDriveFocus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CoachPortrait team={team} size={30} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: FB.text, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamId.coachName}</div>
              <div style={{ fontSize: 11, color: teamId.primary, fontWeight: 800, letterSpacing: 0.3 }}>{TEAM_PROFILES[team].displayName}</div>
            </div>
          </div>
        )}
        {!firstDriveFocus && (
          <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.035)', border: `1px solid ${teamId.primary}55`, borderRadius: 9, padding: '7px 9px', color: FB.textDim, fontSize: 11.5, fontWeight: 750, lineHeight: 1.25 }}>
            <span style={{ color: teamId.primary, fontWeight: 900 }}>Win condition:</span> {teamPlan}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {targets.map((_, i) => (
              <div key={i} style={{ width: 26, height: 5, borderRadius: 3, background: i < match.driveIndex ? FB.green : i === match.driveIndex ? FB.gold : '#22303f' }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: FB.textDim, fontWeight: 800, letterSpacing: 0.5 }}>
            DRIVE {Math.min(match.driveIndex + 1, DRIVES_PER_MATCH)}/{DRIVES_PER_MATCH}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 9 }}>
          <div>
            <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.5, fontWeight: 800 }}>DRIVE SCORE</div>
            <div key={match.popKey} className="fb-num fb-pop" style={{ fontSize: 40, fontWeight: 900, color: teamId.primary, lineHeight: 1 }}>{displayDriveScore}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.5, fontWeight: 800 }}>TARGET</div>
            <div className="fb-num" style={{ fontSize: 22, fontWeight: 900, color: FB.gold }}>{target}</div>
            <div style={{ fontSize: 11, color: pct >= 100 ? FB.green : FB.textDim, fontWeight: 700 }}>{remaining > 0 ? `${remaining} to go` : '✓ cleared'}</div>
          </div>
        </div>
        <div aria-label={`Drive progress ${Math.round(pct)} percent${pct >= 100 ? ', cleared' : ''}`} style={{ height: 9, background: '#0a1016', borderRadius: 6, overflow: 'hidden', border: '1px solid #0c151d', position: 'relative' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? `linear-gradient(90deg,#2aa85e,${FB.green})` : `linear-gradient(90deg,#c98f17,${FB.gold})`, transition: 'width .35s ease' }} />
          {pct >= 100 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08100b', fontSize: 11, fontWeight: 900 }}>✓</div>}
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
          <Stat label="Budget" value={`${match.budgetLeft} · ~${estimateCallsLeft(match.budgetLeft, match.hand)}`} accent={FB.gold} wide={firstDriveFocus} />
          <Stat label="Audibles" value={`${match.audiblesLeft}`} />
          {!firstDriveFocus && <Stat label="Deck" value={`${match.deck.length}`} />}
          {!firstDriveFocus && <Stat label="Weather" value={env.label.split(' ')[0]} />}
        </div>
        {!firstDriveFocus && (
          <>
            <button
              type="button"
              onClick={() => setBuildOpen((open) => !open)}
              aria-expanded={buildOpen}
              style={{ width: '100%', marginTop: 9, background: '#0a1016', border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '8px 9px', color: FB.textDim, fontSize: 11.5, fontWeight: 900, textAlign: 'left', cursor: 'pointer' }}
            >
              Build {buildOpen ? '▾' : '▸'} <span style={{ color: FB.textFaint, fontWeight: 750 }}>{identity.title} · {boss.shortLabel}</span>
            </button>
            {buildOpen && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 9 }}>
                  <Scout label="Current Build" title={identity.title} detail={identity.tag} color={identity.level >= 2 ? FB.gold : FB.green} />
                  <Scout label="Defense" title={boss.shortLabel} detail={`${bossScheme === 'balanced' ? 'Base look' : 'Threat'} · ${boss.hint}`} color={bossScheme === 'balanced' ? FB.textDim : FB.red} />
                </div>
                <BuildChipRows
                  team={team}
                  coordinators={coordinators}
                  playbookEntries={playbookEntries}
                  stacksThisMatch={match.stacksThisMatch}
                  groundBonusThisMatch={match.groundBonusThisMatch}
                  qbRunsThisMatch={match.qbRunsThisMatch}
                  defPlaysThisMatch={match.defPlaysThisMatch}
                  bombGames={bombGames}
                  keeperGames={keeperGames}
                  takeawayGames={takeawayGames}
                />
              </>
            )}
          </>
        )}
      </div>

      {match.status === 'playing' && (
        <>
          {coach && <CoachCall coach={coach} eyebrow={coachEyebrow} onDismiss={gameNumber >= 2 ? () => setAskCoach(false) : undefined} />}
          {showG2Intro && (
            <div style={{ background: '#101926', border: `1px solid ${teamId.primary}66`, borderLeft: `3px solid ${teamId.primary}`, borderRadius: 12, padding: '11px 12px' }}>
              <div style={{ fontSize: 11, color: teamId.primary, letterSpacing: 1.2, fontWeight: 900 }}>YOUR CALL NOW</div>
              <div style={{ fontSize: 13, color: FB.text, fontWeight: 850, lineHeight: 1.35, marginTop: 3 }}>
                {teamId.coachName.replace('Coach ', '')} steps back — you’ve got the grammar. Read the quality label and pace your budget. Tap <b>Ask coach</b> any time for a read.
              </div>
              <button onClick={() => setAskCoach(true)} style={{ ...btnGhost, marginTop: 9, color: teamId.primary, borderColor: `${teamId.primary}66` }}>Ask coach</button>
            </div>
          )}
          <div ref={actionBarRef} className="fb-action-bar" style={{ position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: 'min(100%, 480px)', zIndex: 40, padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, rgba(9,12,17,0.15), #090c11 18%, #090c11 100%)', borderTop: `1px solid ${FB.borderSoft}`, boxShadow: '0 -16px 32px -24px rgba(0,0,0,0.9)' }}>
            {laneCallout && (
              <div className="fb-pop" onClick={() => setLaneCallout(null)} style={{ marginBottom: 8, background: `${teamId.primary}1c`, border: `1px solid ${teamId.primary}`, borderRadius: 11, padding: '8px 11px', color: FB.text, fontSize: 12, fontWeight: 850, lineHeight: 1.3, cursor: 'pointer' }}>
                {laneCallout}
              </div>
            )}
            <PlayPreview result={preview} count={selectedCards.length} remaining={remaining} target={target} driveScore={match.driveScore} budgetLeft={match.budgetLeft} overBudget={overBudget} coachActive={Boolean(coach)} lastPlay={match.lastPlay} scoreBeat={visibleScoreBeat} showQuality={gameNumber === 1} showMath={mathVisible} onToggleMath={gameNumber >= 2 ? () => updatePrefs({ showMath: !prefs.showMath }) : undefined} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={audible} disabled={selectedCards.length === 0 || match.audiblesLeft <= 0}
                aria-label={`Audible ${selectedCards.length} selected card${selectedCards.length === 1 ? '' : 's'}. ${match.audiblesLeft} audibles left.`}
                className={coach?.action === 'audible' ? 'fb-glow' : undefined}
                style={{ ...btnGhost, flex: 1, minHeight: 48, padding: '13px 0', fontSize: 14, borderRadius: 12, opacity: selectedCards.length === 0 || match.audiblesLeft <= 0 ? 0.45 : 1 }}>
                Audible · {match.audiblesLeft}
              </button>
              <button onClick={runPlay} disabled={selectedCards.length === 0 || overBudget}
                aria-label={selectedCards.length ? `Run ${preview.playName} for ${preview.total} points at ${preview.cost} budget` : 'Select cards to run a play'}
                className={coach?.action === 'run' ? 'fb-glow' : undefined}
                style={{ ...btnPrimary, flex: 2, minHeight: 48, ...(selectedCards.length === 0 || overBudget ? { background: '#1a2330', color: FB.textFaint, boxShadow: 'none' } : {}) }}>
                {overBudget ? `Over budget by ${selectedCost - match.budgetLeft}` : selectedCards.length ? `Run · +${preview.total} · $${preview.cost}` : 'Select cards'}
              </button>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 2px 7px' }}>
              <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.4, fontWeight: 800 }}>YOUR HAND · TAP UP TO {MAX_PLAY_CARDS}</div>
              {gameNumber >= 2 && !askCoach && (
                <button onClick={() => setAskCoach(true)} aria-label="Ask the coach for a read on this hand" style={{ background: '#101926', border: `1px solid ${teamId.primary}66`, color: teamId.primary, borderRadius: 8, padding: '4px 9px', fontSize: 11, fontWeight: 900, cursor: 'pointer', minHeight: 30 }}>🎧 Ask coach</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {handGroups.map((group) => (
                <div key={group.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 2px 5px' }}>
                    <span style={{ fontSize: 11, color: group.color, fontWeight: 900, letterSpacing: 1.1 }}>{group.label}</span>
                    <span style={{ height: 1, flex: 1, background: FB.borderSoft }} />
                    <span style={{ fontSize: 11, color: FB.textFaint, fontWeight: 800 }}>{group.cards.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
                    {group.cards.map((c) => (
                    <CardView key={c.id} card={c} active={selected.includes(c.id)} highlighted={coachHighlights.has(c.id)} affordable={cardCost(c) <= match.budgetLeft} onClick={() => toggle(c.id)} />
                  ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!coach && !canAffordAnything && <div style={{ fontSize: 11, color: FB.red, textAlign: 'center' }}>Out of budget — audible for cheaper cards or the drive stalls.</div>}
          {!coach && canAffordAnything && !handHasPass && !handHasRun && match.audiblesLeft > 0 && (
            <div style={{ fontSize: 11, color: FB.gold, textAlign: 'center' }}>💡 No QB pass or run in hand — select a few catches and Audible to dig for one.</div>
          )}
        </>
      )}

      {match.status === 'won' && (
        <ResultPanel won title={isOvertime ? `Overtime R${overtimeRound} Survived` : championship ? 'Champions!' : `Game ${gameNumber} Won`}
          detail={isOvertime ? 'You held on. The next round climbs higher.' : championship ? 'You cleared the championship.' : 'All three drives cleared.'}
          cta={isOvertime ? 'Next Overtime →' : championship ? 'See Results →' : 'Choose Reward →'}
          onCta={() => props.onWon({ bombLanded: match.bombLanded, keeperLanded: match.keeperLanded, takeawayGame: match.defPlaysThisMatch >= 2, score: match.totalScore, bestDrive: match.bestDriveThisMatch })} />
      )}
      {match.status === 'lost' && (
        <ResultPanel won={false} title={isOvertime ? 'Overtime Ends' : 'Drive Stalled'}
          detail={isOvertime
            ? `Ran out of budget on Drive ${match.driveIndex + 1}. You reached Overtime Round ${overtimeRound}.`
            : `Ran out of budget on Drive ${match.driveIndex + 1} before the target. The season ends here.`}
          cta="See Results →" onCta={() => props.onLost({ drive: match.driveIndex + 1, score: match.totalScore, bestDrive: match.bestDriveThisMatch })} />
      )}

      {stamp && <PlayStamp stamp={stamp} reduced={reducedMotion} onSkip={() => setStamp(null)} />}

      {showBossIntro && (
        <BossIntroCard
          boss={boss}
          accent={teamId.primary}
          gameNumber={gameNumber}
          championship={championship}
          reduced={reducedMotion}
          onDismiss={() => setShowBossIntro(false)}
        />
      )}

      {showHelp && <FootballHelpModal onClose={() => setShowHelp(false)} prefs={prefs} onPrefsChange={updatePrefs} />}
    </div>
  );
}

// Boss-intro reveal — names the defensive scheme before the snap and tells the
// player what it punishes and how to beat it. Presentation only; the scheme math
// lives in scoreFootballPlay. Tap anywhere (or the button) to start the drive.
function BossIntroCard({ boss, accent, gameNumber, championship, reduced, onDismiss }: {
  boss: (typeof FB_BOSS_SCHEMES)[FbBossSchemeKey];
  accent: string;
  gameNumber: number;
  championship: boolean;
  reduced: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      onClick={onDismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', background: 'rgba(6,9,13,0.82)', cursor: 'pointer' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={reduced ? undefined : 'fb-rise'}
        style={{ width: '100%', maxWidth: 420, background: 'linear-gradient(180deg,#1d0f14,#0c1119)', border: `1px solid ${FB.red}`, borderRadius: 18, padding: '22px 20px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 11, color: FB.red, letterSpacing: 2, fontWeight: 900 }}>
          {championship ? '🏆 CHAMPIONSHIP DEFENSE' : `GAME ${gameNumber} · SCOUTING REPORT`}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: FB.text, marginTop: 8, lineHeight: 1.05 }}>{boss.label}</div>
        <div style={{ fontSize: 12.5, color: FB.textDim, fontStyle: 'italic', lineHeight: 1.4, marginTop: 8 }}>“{boss.flavor}”</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, textAlign: 'left' }}>
          <div style={{ flex: 1, background: '#1d1014', border: `1px solid #4a2530`, borderRadius: 10, padding: '9px 10px' }}>
            <div style={{ fontSize: 11, color: FB.red, letterSpacing: 0.8, fontWeight: 900 }}>PUNISHES</div>
            <div style={{ fontSize: 12, color: FB.text, fontWeight: 800, marginTop: 3, lineHeight: 1.25 }}>{boss.punishes}</div>
          </div>
          <div style={{ flex: 1, background: '#0c2419', border: `1px solid #1f6b44`, borderRadius: 10, padding: '9px 10px' }}>
            <div style={{ fontSize: 11, color: FB.green, letterSpacing: 0.8, fontWeight: 900 }}>COUNTER</div>
            <div style={{ fontSize: 12, color: FB.text, fontWeight: 800, marginTop: 3, lineHeight: 1.25 }}>{boss.hint}</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{ ...btnPrimary, width: '100%', marginTop: 18, background: `linear-gradient(180deg,${accent},${accent}cc)`, color: '#0b0b0b' }}>
          Take the field →
        </button>
      </div>
    </div>
  );
}

function PlayStamp({ stamp, reduced, onSkip }: { stamp: PlayStampState; reduced: boolean; onSkip: () => void }) {
  const tone = stamp.tone === 'red' ? FB.red : FB.gold;
  const isTurnover = stamp.kind === 'turnover';
  const animClass = reduced ? undefined : isTurnover ? 'fb-stamp-slam' : 'fb-banner-slide';
  return (
    <div
      onClick={onSkip}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', background: isTurnover ? 'rgba(8,5,7,0.5)' : 'transparent', cursor: 'pointer',
      }}
    >
      <div
        className={animClass}
        style={{
          fontSize: isTurnover ? 30 : 34, fontWeight: 900, letterSpacing: 1, textAlign: 'center', lineHeight: 1.05,
          color: isTurnover ? '#fff' : '#0b0b0b',
          textTransform: 'uppercase', maxWidth: 460,
          padding: isTurnover ? '14px 22px' : '12px 26px',
          borderRadius: 12,
          transform: isTurnover ? 'rotate(-7deg)' : 'skewX(-7deg)',
          background: isTurnover ? 'transparent' : `linear-gradient(90deg, ${tone}, #ffd76a)`,
          border: isTurnover ? `3px solid ${FB.red}` : 'none',
          boxShadow: isTurnover ? 'none' : '0 8px 30px -6px rgba(240,180,41,0.7)',
          WebkitTextStroke: isTurnover ? '0' : undefined,
        }}
      >
        {stamp.text}
      </div>
    </div>
  );
}

function BuildChipRows({
  team,
  coordinators,
  playbookEntries,
  stacksThisMatch,
  groundBonusThisMatch,
  qbRunsThisMatch,
  defPlaysThisMatch,
  bombGames,
  keeperGames,
  takeawayGames,
}: {
  team: TeamArchetype;
  coordinators: FbCoordinatorKey[];
  playbookEntries: [FbConceptKey, number][];
  stacksThisMatch: number;
  groundBonusThisMatch: number;
  qbRunsThisMatch: number;
  defPlaysThisMatch: number;
  bombGames: number;
  keeperGames: number;
  takeawayGames: number;
}) {
  const signature = TEAM_PROFILES[team].startingCoordinators[0];
  const ordered = [...coordinators].sort((a, b) => {
    if (a === signature && b !== signature) return -1;
    if (b === signature && a !== signature) return 1;
    return coordinators.indexOf(a) - coordinators.indexOf(b);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 9 }}>
      <ChipRow label="Coordinators">
        {ordered.map((k) => {
          const ramp = coordinatorRamp(k, {
            stacksThisMatch,
            groundBonusThisMatch,
            qbRunsThisMatch,
            defPlaysThisMatch,
            bombGames,
            keeperGames,
            takeawayGames,
          });
          const isSignature = k === signature;
          return (
            <span key={k} style={{ fontSize: 11, fontWeight: isSignature ? 900 : 800, color: '#b7a7ff', background: isSignature ? '#1b1530' : '#140f24', border: `1px solid ${isSignature ? '#5a4ba0' : '#2a2440'}`, borderRadius: 7, padding: '4px 8px' }}>
              {isSignature ? '★ ' : ''}{FB_COORDINATORS[k].name}{ramp && <span style={{ color: FB.gold }}> · {ramp}</span>}
            </span>
          );
        })}
      </ChipRow>
      {playbookEntries.length > 0 && (
        <ChipRow label="Game Plan">
          {playbookEntries.map(([c, l]) => (
            <span key={c} style={{ fontSize: 11, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
        </ChipRow>
      )}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1, fontWeight: 900, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function coordinatorRamp(k: FbCoordinatorKey, state: {
  stacksThisMatch: number;
  groundBonusThisMatch: number;
  qbRunsThisMatch: number;
  defPlaysThisMatch: number;
  bombGames: number;
  keeperGames: number;
  takeawayGames: number;
}) {
  if (k === 'air_raid' && state.stacksThisMatch > 0) return `+${(0.25 * state.stacksThisMatch).toFixed(2)} EXE`;
  if (k === 'bell_cow' && state.groundBonusThisMatch > 0) return `+${state.groundBonusThisMatch} BASE`;
  if (k === 'franchise_qb' && state.bombGames > 0) return `×${(1 + 0.2 * state.bombGames).toFixed(2)} BP`;
  if (k === 'read_option' && state.qbRunsThisMatch > 0) return `+${(0.2 * state.qbRunsThisMatch).toFixed(2)} EXE`;
  if (k === 'pressure_chain' && state.defPlaysThisMatch > 0) return `+${(0.14 * state.defPlaysThisMatch).toFixed(2)} EXE`;
  if (k === 'improviser' && state.keeperGames > 0) return `×${(1 + 0.18 * state.keeperGames).toFixed(2)} BP`;
  if (k === 'takeaway_machine' && state.takeawayGames > 0) return `×${(1 + 0.05 * state.takeawayGames).toFixed(2)} BP`;
  return '';
}

function Stat({ label, value, accent, wide }: { label: string; value: string; accent?: string; wide?: boolean }) {
  return (
    <div style={{ flex: wide ? 1.4 : 1, background: '#0a1016', border: '1px solid #14202b', borderRadius: 9, padding: '7px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: value.length > 5 ? 13 : 15, fontWeight: 900, color: accent ?? FB.text }}>{value}</div>
      <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 0.6, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function Scout({ label, title, detail, color }: { label: string; title: string; detail: string; color: string }) {
  return (
    <div style={{ background: '#0a1016', border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '8px 9px' }}>
      <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 0.8, fontWeight: 800 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, color, fontWeight: 900, lineHeight: 1.2, marginTop: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.25, marginTop: 2 }}>{detail}</div>
    </div>
  );
}

function CardView({ card, active, highlighted, affordable, onClick }: { card: FbCard; active: boolean; highlighted: boolean; affordable: boolean; onClick: () => void }) {
  const c = SIDE[card.side];
  const eff = cardCost(card);
  const discounted = eff < card.cost;
  const trait = card.modifier ? FB_CARD_MODIFIERS[card.modifier] : null;
  const costText = `${affordable || active ? '$' : '🔒 $'}${eff}${discounted ? ' ↓' : ''}`;
  return (
    <button onClick={onClick} aria-label={`${active ? 'Deselect' : 'Select'} ${card.label}, ${card.position}, ${card.value} value, cost ${eff}${discounted ? ', discounted' : ''}${affordable || active ? '' : ', unaffordable with current budget'}`} className={highlighted && !active ? 'fb-glow' : undefined} style={{
      background: active ? c.grad : FB.panelSoft,
      border: `1.5px solid ${active || highlighted ? c.border : trait ? `${trait.color}55` : FB.borderSoft}`,
      borderRadius: 11, padding: '8px 6px 7px', cursor: 'pointer', textAlign: 'left',
      transform: active ? 'translateY(-5px)' : 'none', transition: 'transform .14s ease, border-color .14s',
      minHeight: 84, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      opacity: affordable || active ? 1 : 0.42,
      boxShadow: highlighted && !active ? `0 0 0 2px ${c.border}44, 0 0 18px ${c.border}25` : undefined,
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: c.text, background: c.chip, border: `1px solid ${c.border}55`, borderRadius: 4, padding: '1px 4px' }}>{card.position}</span>
          <span className="fb-num" style={{ fontSize: 11, fontWeight: 900, color: discounted ? FB.green : affordable || active ? FB.gold : FB.red, background: discounted ? FB.greenSoft : affordable || active ? FB.goldSoft : '#2a141a', border: `1px solid ${discounted ? '#1f6b44' : affordable || active ? '#5a4112' : '#4a2530'}`, borderRadius: 4, padding: '1px 5px' }}>{costText}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: c.text, marginTop: 5, lineHeight: 1.05 }}>{card.label}</div>
        <div className="fb-num" style={{ fontSize: 16, fontWeight: 900, color: FB.text, marginTop: 1 }}>{card.value}</div>
      </div>
      {trait ? (
        <div style={{ fontSize: 11, fontWeight: 900, color: trait.color, background: `${trait.color}1a`, border: `1px solid ${trait.color}55`, borderRadius: 4, padding: '1px 4px', textAlign: 'center', letterSpacing: 0.4 }}>{trait.label.toUpperCase()}</div>
      ) : (
        <div style={{ fontSize: 11, color: FB.textFaint, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.playerName} · {card.team}</div>
      )}
    </button>
  );
}

interface Coach {
  title: string;
  detail: string;
  action: 'select' | 'audible' | 'run';
  highlightIds: string[];
}

function CoachCall({ coach, eyebrow, onDismiss }: { coach: Coach; eyebrow: string; onDismiss?: () => void }) {
  const accent = coach.action === 'run' ? FB.green : coach.action === 'audible' ? FB.gold : FB.blue;
  return (
    <div style={{ background: '#101926', border: `1px solid ${accent}66`, borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: '10px 12px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: accent, letterSpacing: 1.2, fontWeight: 900 }}>{eyebrow}</div>
        {onDismiss && (
          <button onClick={onDismiss} aria-label="Dismiss coach" style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 12, fontWeight: 900, cursor: 'pointer', padding: '0 2px' }}>Dismiss ✕</button>
        )}
      </div>
      <div style={{ fontSize: 13.5, color: FB.text, fontWeight: 900, marginTop: 2 }}>{coach.title}</div>
      <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 2 }}>{coach.detail}</div>
    </div>
  );
}

function PlayPreview({
  result,
  count,
  remaining,
  target,
  driveScore,
  budgetLeft,
  overBudget,
  coachActive,
  lastPlay,
  scoreBeat,
  showQuality,
  showMath,
  onToggleMath,
}: {
  result: FbPlayResult;
  count: number;
  remaining: number;
  target: number;
  driveScore: number;
  budgetLeft: number;
  overBudget: boolean;
  coachActive: boolean;
  lastPlay: FbPlayResult | null;
  scoreBeat: number;
  showQuality: boolean;
  showMath: boolean;
  onToggleMath?: () => void;
}) {
  const live = count > 0;
  const good = result.valid && !overBudget;
  const subtext = live ? result.flavor : coachActive ? '' : 'Tap cards to call a play.';
  const closure = live ? Math.min(100, Math.round((result.total / Math.max(1, remaining)) * 100)) : 0;
  const totalPct = live ? Math.min(100, Math.round(((driveScore + result.total) / target) * 100)) : 0;
  const equation = `${result.base} × (1 + ${result.execution.toFixed(2)}) × ${formatMultiplier(result.bigPlay)} = ${result.total}`;
  const quality = live && showQuality ? classifyPlayQuality(result, remaining, budgetLeft, overBudget) : null;
  if (!live && lastPlay) return <ScoreBeats result={lastPlay} stage={scoreBeat} />;
  return (
    <div style={{ background: live ? (good ? FB.greenSoft : '#23121a') : FB.panelSoft, border: `1px solid ${live ? (good ? '#1f6b44' : '#6b3344') : FB.borderSoft}`, borderRadius: 13, padding: 12, transition: 'background .15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: live ? 9 : 0 }}>
        <div>
          <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.2, fontWeight: 900, marginBottom: 3 }}>PLAY PREVIEW</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: FB.text }}>{live ? result.playName : 'Pick your call'}</div>
          {subtext && <div style={{ fontSize: 11, color: FB.textDim }}>{subtext}</div>}
        </div>
        {live && (
          <div style={{ textAlign: 'right' }}>
            <div className="fb-num" style={{ fontSize: 25, fontWeight: 900, color: good ? FB.green : FB.red, lineHeight: 1 }}>{closure}%</div>
            <div style={{ fontSize: 11, color: FB.textDim, fontWeight: 800 }}>of need · +{result.total}</div>
          </div>
        )}
      </div>
      {live && (
        <>
          {quality && (
            <div style={{ marginBottom: 7, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', background: FB.inset, border: `1px solid ${quality.color}66`, borderRadius: 9, padding: '6px 8px' }}>
              <div style={{ fontSize: 11.5, color: quality.color, fontWeight: 900 }}>{quality.label}</div>
              <div style={{ fontSize: 11, color: FB.textDim, textAlign: 'right' }}>{quality.detail}</div>
            </div>
          )}
          {showMath ? (
            <div className="fb-num" style={{ marginBottom: 7, background: '#081018', border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '7px 8px', textAlign: 'center', color: FB.text, fontSize: 12, fontWeight: 850, position: 'relative' }}>
              {equation} <span style={{ color: FB.textDim, fontWeight: 750 }}>· drive {totalPct}%</span>
              {onToggleMath && (
                <button onClick={onToggleMath} aria-label="Hide the scoring math" style={{ position: 'absolute', top: 4, right: 5, background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Hide ▾</button>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#081018', border: `1px solid ${FB.borderSoft}`, borderRadius: 9, padding: '6px 9px' }}>
              <span style={{ fontSize: 11.5, color: FB.textDim, fontWeight: 800 }}>Drive {totalPct}% after this play</span>
              {onToggleMath && (
                <button onClick={onToggleMath} aria-label="Show the scoring math" style={{ background: 'transparent', border: 'none', color: FB.gold, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Show math ▸</button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: result.ledger.length > 2 ? 8 : 0 }}>
            <Channel label="B Base" value={`${result.base}`} color={FB.green} />
            <Channel label="+EXE" value={`+${result.execution.toFixed(2)}`} color={FB.blue} />
            <Channel label="×BP" value={`×${formatMultiplier(result.bigPlay)}`} color={FB.gold} />
          </div>
          {result.ledger.length > 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {result.ledger.filter((e) => ['execution', 'big_play', 'coordinator', 'environment', 'boss', 'spam'].includes(e.kind)).map((e) => (
                <span key={e.id} style={{ fontSize: 11, fontWeight: 800, color: e.kind === 'coordinator' ? '#b7a7ff' : e.kind === 'spam' || e.kind === 'boss' ? FB.red : e.kind === 'environment' ? '#9cc6ff' : e.kind === 'big_play' ? FB.gold : FB.blue, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 6, padding: '3px 7px' }}>{ledgerGlyph(e.kind)} {e.label}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ScoreBeats({ result, stage }: { result: FbPlayResult; stage: number }) {
  const beats = [
    { label: 'B Base', value: `${result.base}`, color: FB.green },
    { label: '+EXE', value: `+${result.execution.toFixed(2)}`, color: FB.blue },
    { label: '×BP', value: `×${formatMultiplier(result.bigPlay)}`, color: FB.gold },
    { label: 'Final', value: `+${result.total}`, color: FB.text },
  ];
  return (
    <div style={{ background: FB.panelSoft, border: `1px solid ${FB.borderSoft}`, borderRadius: 12, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 1.2, fontWeight: 900 }}>SCORING SEQUENCE</div>
        <div style={{ fontSize: 11, color: FB.textDim, fontWeight: 800 }}>{result.playName}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {beats.map((beat, i) => {
          const active = stage >= i;
          const impact = active && i === 3 && result.bigPlay > 1;
          return (
            <div key={beat.label} className={active ? 'fb-pop' : undefined} style={{ background: active ? (impact ? '#2a230c' : '#111d28') : FB.inset, border: `1px solid ${active ? (impact ? FB.gold : beat.color) : FB.borderSoft}`, borderRadius: 8, padding: '7px 4px', textAlign: 'center', opacity: active ? 1 : 0.45, boxShadow: impact ? '0 0 18px -8px rgba(240,180,41,0.9)' : undefined }}>
              <div className="fb-num" style={{ fontSize: i === 3 ? (impact ? 20 : 17) : 14, color: impact ? FB.gold : beat.color, fontWeight: 900, lineHeight: 1.05 }}>{beat.value}</div>
              <div style={{ fontSize: 11, color: FB.textFaint, fontWeight: 800, marginTop: 2 }}>{beat.label.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Channel({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 13, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: FB.textFaint, letterSpacing: 0.4, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function groupHand(hand: FbCard[]) {
  const groups: { key: FbCard['side']; label: string; color: string; cards: FbCard[] }[] = [
    { key: 'pass', label: 'QB Pass', color: SIDE.pass.text, cards: [] },
    { key: 'catch', label: 'Catch', color: SIDE.catch.text, cards: [] },
    { key: 'run', label: 'Run', color: SIDE.run.text, cards: [] },
    { key: 'defense', label: 'Defense', color: SIDE.defense.text, cards: [] },
    { key: 'kick', label: 'Kick', color: SIDE.kick.text, cards: [] },
  ];
  for (const card of hand) groups.find((g) => g.key === card.side)?.cards.push(card);
  return groups
    .map((group) => ({
      ...group,
      cards: group.cards.sort((a, b) => a.team.localeCompare(b.team) || a.position.localeCompare(b.position) || b.value - a.value),
    }))
    .filter((group) => group.cards.length > 0);
}

function coachGuidance(
  team: TeamArchetype,
  match: MatchState,
  selectedCards: FbCard[],
  preview: FbPlayResult,
  target: number,
  remaining: number,
): Coach | null {
  if (match.status !== 'playing') return null;

  const primaryConcept = TEAM_PROFILES[team].bestConcepts[0];
  const plan = coachPlanForConcept(primaryConcept, match.hand, selectedCards);
  const selectedIds = selectedCards.map((c) => c.id);

  if (match.lastPlay && selectedCards.length === 0) {
    const need = Math.max(0, remaining);
    const calls = estimateCallsLeft(match.budgetLeft, match.hand);
    return {
      title: need > 0 ? `${need} more before the budget hits 0` : 'Drive cleared — reset and do it again',
      detail: need > 0
        ? `${TEAM_PROFILES[team].shortName} wants ${FB_CONCEPT_LABEL[primaryConcept] ?? plan.label}. You have about ${calls} call${calls === 1 ? '' : 's'} left; use Audible if this hand cannot make a clean concept.`
        : `Good — keep repeating clean concepts, not just one perfect opener.`,
      action: 'select',
      highlightIds: plan.highlightIds,
    };
  }

  if (selectedCards.length > 0 && preview.valid && preview.concept !== 'busted_play') {
    return {
      title: `${preview.playName} is a clean concept`,
      detail: `${preview.total} points clears ${Math.min(100, Math.round((preview.total / Math.max(1, remaining)) * 100))}% of what you need. If the quality label looks strong, run it; otherwise add one more helpful card or Audible.`
        .replace('..', '.'),
      action: 'run',
      highlightIds: selectedIds,
    };
  }

  if (selectedCards.length > 0 && !preview.valid) {
    return {
      title: 'Make the cards agree',
      detail: `${plan.label} needs ${plan.recipe}. Mismatched cards become weak yardage and spend budget without closing the gap.`,
      action: 'select',
      highlightIds: plan.highlightIds,
    };
  }

  if (selectedCards.length > 0 && preview.valid) {
    return {
      title: 'Playable, but check the pace',
      detail: `${preview.total} points against a ${target}-point drive is only useful if it leaves enough budget for the next call.`,
      action: 'run',
      highlightIds: selectedIds,
    };
  }

  if (plan.highlightIds.length === 0) {
    const throwaways = match.hand
      .filter((c) => c.side !== 'kick')
      .sort((a, b) => a.value - b.value || b.cost - a.cost)
      .slice(0, 3);
    return {
      title: `Dig for ${plan.label}`,
      detail: `This hand does not show the pieces for ${plan.recipe}. Select loose cards and Audible to redraw without spending budget.`,
      action: 'audible',
      highlightIds: throwaways.map((c) => c.id),
    };
  }

  return {
    title: `Goal: reach ${target} before Budget hits 0`,
    detail: `${TEAM_PROFILES[team].displayName} wants ${plan.label}: ${plan.recipe}. A good first play usually clears about a third of the remaining target.`,
    action: 'select',
    highlightIds: plan.highlightIds,
  };
}

function bestCoachCard(hand: FbCard[], pred: (card: FbCard) => boolean): FbCard | undefined {
  return [...hand].filter(pred).sort((a, b) => b.value - a.value || a.cost - b.cost)[0];
}

function coachPlanForConcept(concept: FbConceptKey, hand: FbCard[], selectedCards: FbCard[]) {
  const label = FB_CONCEPT_LABEL[concept] ?? concept;
  const pass = bestCoachCard(hand, (c) => c.side === 'pass');
  const selectedPass = selectedCards.find((c) => c.side === 'pass');
  const stackPass = selectedPass ?? pass;
  const sameTeamCatch = stackPass ? bestCoachCard(hand, (c) => c.side === 'catch' && c.team === stackPass.team) : undefined;
  const secondSameTeamCatch = stackPass
    ? [...hand].filter((c) => c.side === 'catch' && c.team === stackPass.team && c.id !== sameTeamCatch?.id).sort((a, b) => b.value - a.value || a.cost - b.cost)[0]
    : undefined;

  if (concept === 'ground_pound') {
    const runs = [...hand].filter((c) => c.side === 'run').sort((a, b) => b.value - a.value || a.cost - b.cost).slice(0, 3);
    return { label, recipe: 'two or three Run cards', highlightIds: runs.map((c) => c.id) };
  }
  if (concept === 'qb_keeper' || concept === 'designed_run') {
    const qbRuns = [...hand].filter((c) => c.action === 'scramble' || c.action === 'qb_sneak').sort((a, b) => b.value - a.value || a.cost - b.cost).slice(0, 2);
    const supportRun = bestCoachCard(hand, (c) => c.side === 'run' && c.action !== 'scramble' && c.action !== 'qb_sneak');
    return { label, recipe: 'QB run cards, plus a support run if you have one', highlightIds: [...qbRuns, supportRun].filter(Boolean).slice(0, 3).map((c) => c!.id) };
  }
  if (concept === 'pick_six' || concept === 'takeaway' || concept === 'sack') {
    const preferred = concept === 'pick_six'
      ? (c: FbCard) => c.action === 'return_td'
      : concept === 'takeaway'
        ? (c: FbCard) => c.action === 'interception'
        : (c: FbCard) => c.action === 'sack';
    const defense = bestCoachCard(hand, preferred) ?? bestCoachCard(hand, (c) => c.side === 'defense');
    return { label, recipe: 'a defensive splash card', highlightIds: defense ? [defense.id] : [] };
  }
  if (concept === 'field_goal') {
    const kick = bestCoachCard(hand, (c) => c.side === 'kick');
    return { label, recipe: 'a Kicker card when the hand is messy', highlightIds: kick ? [kick.id] : [] };
  }
  if (concept === 'checkdown') {
    const checkdown = bestCoachCard(hand, (c) => c.action === 'checkdown_catch');
    return { label, recipe: 'QB Pass plus a checkdown catch', highlightIds: [pass, checkdown].filter(Boolean).map((c) => c!.id) };
  }
  if (concept === 'double_stack_bomb') {
    return { label, recipe: 'QB Pass plus two same-team Catches', highlightIds: [stackPass, sameTeamCatch, secondSameTeamCatch].filter(Boolean).map((c) => c!.id) };
  }
  if (concept === 'shootout_stack') {
    const oppCatch = stackPass ? bestCoachCard(hand, (c) => c.side === 'catch' && c.team !== stackPass.team) : undefined;
    return { label, recipe: 'a Stack TD plus an opponent catch', highlightIds: [stackPass, sameTeamCatch, oppCatch].filter(Boolean).map((c) => c!.id) };
  }
  return { label, recipe: 'QB Pass plus a same-team Catch', highlightIds: [stackPass, sameTeamCatch].filter(Boolean).map((c) => c!.id) };
}

function estimateCallsLeft(budget: number, hand: FbCard[]): number {
  const costs = hand.map((c) => cardCost(c)).sort((a, b) => a - b);
  if (costs.length === 0 || budget <= 0) return 0;
  const median = costs[Math.floor(costs.length / 2)] ?? costs[0];
  return Math.max(1, Math.floor(budget / Math.max(7, median * 3)));
}

function formatMultiplier(value: number): string {
  return value.toFixed(2);
}

function classifyPlayQuality(result: FbPlayResult, remaining: number, budgetLeft: number, overBudget: boolean) {
  if (overBudget) return { label: 'Over budget', color: FB.red, detail: `Costs $${result.cost} with $${budgetLeft} left.` };
  if (!result.valid) return { label: 'Weak', color: FB.red, detail: 'Busted plays spend budget without a clean concept.' };
  const closure = result.total / Math.max(1, remaining);
  const playPace = result.total / Math.max(1, result.cost);
  const neededPace = remaining / Math.max(1, budgetLeft);
  if (closure >= 0.95) return { label: 'Strong closer', color: FB.green, detail: `${result.total} pts for $${result.cost} clears the drive.` };
  if (closure >= 0.34 || playPace >= neededPace * 1.35) return { label: 'Strong', color: FB.green, detail: `${result.total} pts for $${result.cost} is ahead of pace.` };
  if (closure >= 0.2 || playPace >= neededPace * 0.9) return { label: 'Playable', color: FB.gold, detail: `${result.total} pts for $${result.cost}; plan another clean call.` };
  return { label: 'Weak', color: FB.red, detail: `${result.total} pts for $${result.cost} is behind the target pace.` };
}

function ledgerGlyph(kind: string): string {
  if (kind === 'big_play') return '×';
  if (kind === 'execution') return '+';
  if (kind === 'coordinator') return '★';
  if (kind === 'environment') return '◇';
  if (kind === 'boss' || kind === 'spam') return '!';
  return '•';
}

// The one moment-to-moment beat that makes a team FEEL like itself: when the
// signature concept first connects, fire a named lane callout. Presentation-only
// (reads the concept the engine already produced); capped once per game upstream.
function signatureCallout(team: TeamArchetype, concept: FbConceptKey): string | null {
  if (team === 'mobile_qb' && (concept === 'qb_keeper' || concept === 'designed_run')) {
    return '⚡ Keeper chain live — every QB run from here scales the engine.';
  }
  if (team === 'defensive_pressure' && (concept === 'pick_six' || concept === 'takeaway' || concept === 'sack')) {
    return '👻 Pressure chain live — your defense is the offense now.';
  }
  if (team === 'ground_game' && concept === 'ground_pound') {
    return '🌩️ Ground chain rolling — Bell Cow base stacks every carry.';
  }
  if (team === 'air_raid' && (concept === 'double_stack_bomb' || concept === 'shootout_stack' || concept === 'stack_td')) {
    return '🔥 Air raid humming — each stack feeds the next.';
  }
  if (team === 'balanced' && (concept === 'stack_td' || concept === 'double_stack_bomb')) {
    return '🦅 Balanced attack clicking — take what they give you.';
  }
  return null;
}

function teamWinCondition(team: TeamArchetype): string {
  const concept = TEAM_PROFILES[team].bestConcepts[0];
  if (team === 'mobile_qb') return 'win on QB keepers — chase the keeper ramp.';
  if (team === 'defensive_pressure') return 'defense is your offense — sacks and takeaways feed the chain.';
  if (team === 'ground_game') return 'stack run cards — Ground & Pound raises the floor every drive.';
  if (team === 'air_raid') return 'build passing stacks — double stacks and shootouts are the ceiling.';
  return `stay flexible — start with ${FB_CONCEPT_LABEL[concept] ?? concept}, then follow the rewards.`;
}

function ResultPanel({ won, title, detail, cta, onCta }: { won: boolean; title: string; detail: string; cta: string; onCta: () => void }) {
  return (
    <div className="fb-rise" style={{ background: won ? 'linear-gradient(180deg,#0f2a1b,#0a1610)' : 'linear-gradient(180deg,#2a1018,#160c10)', border: `1px solid ${won ? FB.green : FB.red}`, borderRadius: 16, padding: 22, textAlign: 'center', marginTop: 8 }}>
      <div style={{ fontSize: 46 }}>{won ? '🏈' : '🥶'}</div>
      <div style={{ fontSize: 23, fontWeight: 900, color: FB.text, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: FB.textDim, marginTop: 5 }}>{detail}</div>
      <button onClick={onCta} style={{ ...btnPrimary, width: '100%', marginTop: 18 }}>{cta}</button>
    </div>
  );
}
