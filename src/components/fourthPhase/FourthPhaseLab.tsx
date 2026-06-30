import { useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import { mulberry32, stringSeed } from '../../lib/rng';
import { FB, btnGhost, btnPrimary, card, sectionLabel } from '../footballStyles';
import { HowToPlay, SituationsPanel } from './FourthPhaseGuide';
import {
  BASE_METER,
  BASE_METER_CAP,
  FOURTH_PHASE_BOSSES,
  FOURTH_PHASE_DISCARDS,
  FOURTH_PHASE_DRIVES,
  FOURTH_PHASE_HAND_SIZE,
  FOURTH_PHASE_JOKER_LIMIT,
  FOURTH_PHASE_MAX_PLAYS_PER_DRIVE,
  FOURTH_PHASE_PLAY_LIMIT,
  FOURTH_PHASE_TEAMS,
  PHASE_COLOR,
  PHASE_LABEL,
  PHASE_SHORT,
  activeBossForDrive,
  applyFourthPhaseDrawStart,
  cardDisplayName,
  createFourthPhaseRun,
  draftFourthPhaseJokers,
  drawFourthPhaseCards,
  formatMeter,
  fourthPhaseRunCode,
  jokerDefinition,
  scoreFourthPhasePlay,
  shuffleFourthPhase,
  type FourthPhaseBossKey,
  type FourthPhaseCard,
  type FourthPhaseJokerState,
  type FourthPhaseScoreContext,
  type FourthPhaseScoreResult,
  type FourthPhaseTeamKey,
  type SituationKey,
} from '../../lib/fourthPhase';

interface Props {
  onHome?: () => void;
}

type LabPhase = 'play' | 'warRoom' | 'won' | 'lost';

interface CashInSnapshot {
  points: number;
  situation: string;
  bigPlay: number;
  meter: number;
  reason: string;
}

interface DragBind {
  draggable: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

interface LabState {
  seed: number;
  team: FourthPhaseTeamKey;
  boss: FourthPhaseBossKey;
  targets: [number, number, number];
  drawPile: FourthPhaseCard[];
  discardPile: FourthPhaseCard[];
  hand: FourthPhaseCard[];
  selectedIds: string[];
  jokers: FourthPhaseJokerState[];
  draft: FourthPhaseJokerState[];
  money: number;
  driveIndex: number;
  driveScore: number;
  discardsLeft: number;
  playsThisDrive: number;
  meter: number;
  meterCap: number;
  repeatedSituations: Partial<Record<SituationKey, number>>;
  drawNonce: number;
  phase: LabPhase;
  bestPlay: number;
  pendingDraft?: FourthPhaseJokerState;
  lastPlay?: FourthPhaseScoreResult;
  cashIn?: CashInSnapshot;
}

// Decide whether a play earns the cash-in celebration, and why. Replaces the old
// bare `points >= 120` magic number with reasons that scale to the drive and the run.
function evaluateCashIn(
  result: FourthPhaseScoreResult,
  target: number,
  prevBest: number,
): { show: boolean; reason: string } {
  if (result.situation.key === 'complementaryFootball') {
    return { show: true, reason: 'Complementary Football — all four phases' };
  }
  if (result.points >= target) {
    return { show: true, reason: 'Drive crusher — cleared the target in one play' };
  }
  if (result.points > prevBest && result.points >= 80) {
    return { show: true, reason: `New run best — ${result.points}` };
  }
  if (result.didCash && result.bigPlay >= 2.5) {
    return { show: true, reason: `Meter cash x${result.bigPlay.toFixed(2)}` };
  }
  if (result.points >= Math.max(60, Math.round(target * 0.3))) {
    return { show: true, reason: 'Big play' };
  }
  return { show: false, reason: '' };
}

const teamKeys = Object.keys(FOURTH_PHASE_TEAMS) as FourthPhaseTeamKey[];
const WAR_ROOM_COST = 4;

function scriptedOpening(deck: FourthPhaseCard[]): FourthPhaseCard[] {
  const desired = [
    'offense-2',
    'crowd-7',
    'crowd-J',
    'offense-K',
    'specialTeams-4',
    'defense-4',
    'offense-3',
    'crowd-A',
  ];
  const byId = new Map(deck.map((card) => [card.id, card]));
  const opening = desired.map((id) => byId.get(id)).filter((card): card is FourthPhaseCard => Boolean(card));
  const used = new Set(opening.map((card) => card.id));
  return [...opening, ...deck.filter((card) => !used.has(card.id))];
}

function createInitialState(team: FourthPhaseTeamKey): LabState {
  const seed = stringSeed(`fourth-phase-lab:${team}:${Date.now()}`);
  const run = createFourthPhaseRun(team, seed);
  const orderedDeck = scriptedOpening(run.deck);
  const draw = drawFourthPhaseCards(orderedDeck, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${seed}:opening`)));
  return {
    seed,
    team,
    boss: run.boss,
    targets: run.targets,
    drawPile: draw.deck,
    discardPile: draw.discard,
    hand: draw.drawn,
    selectedIds: [],
    jokers: run.jokers,
    draft: [],
    money: run.money,
    driveIndex: 0,
    driveScore: 0,
    discardsLeft: FOURTH_PHASE_DISCARDS,
    playsThisDrive: 0,
    meter: run.meter.meter,
    meterCap: run.meter.meterCap,
    repeatedSituations: {},
    drawNonce: 1,
    phase: 'play',
    bestPlay: 0,
  };
}

function dragReorder<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [...items];
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

// Single source of truth for the scoring context. Preview and execution MUST build
// the context the same way, or the previewed score can diverge from what a play
// actually scores — the worst failure for a transparent-math game.
function buildPlayContext(state: LabState): FourthPhaseScoreContext {
  const target = state.targets[state.driveIndex];
  return {
    meter: state.meter,
    meterCap: state.meterCap,
    jokers: state.jokers,
    discardsLeft: state.discardsLeft,
    cardsPlayedThisDrive: state.playsThisDrive,
    driveIndex: state.driveIndex,
    targetRemaining: Math.max(0, target - state.driveScore),
    wins: state.driveIndex,
    boss: activeBossForDrive(state, state.driveIndex),
    repeatedSituations: state.repeatedSituations,
  };
}

function meterStyle(meter: number, cap: number): CSSProperties {
  const tightness = cap <= BASE_METER ? 0 : (meter - BASE_METER) / (cap - BASE_METER);
  const glow = 0.16 + Math.max(0, Math.min(1, tightness)) * 0.58;
  return {
    boxShadow: `0 0 ${18 + tightness * 36}px rgba(169,135,255,${glow})`,
    borderColor: `rgba(169,135,255,${0.45 + glow * 0.45})`,
  };
}

export default function FourthPhaseLab({ onHome }: Props) {
  const [state, setState] = useState<LabState>(() => createInitialState('balanced'));
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [dragJoker, setDragJoker] = useState<string | null>(null);
  const [ledgerExpanded, setLedgerExpanded] = useState(false);

  const activeBoss = activeBossForDrive(state, state.driveIndex);
  const target = state.targets[state.driveIndex];
  const targetRemaining = Math.max(0, target - state.driveScore);
  const handById = useMemo(() => new Map(state.hand.map((card) => [card.id, card])), [state.hand]);
  const selectedCards = useMemo(
    () => state.selectedIds.map((id) => handById.get(id)).filter((card): card is FourthPhaseCard => Boolean(card)),
    [handById, state.selectedIds],
  );
  const preview = selectedCards.length ? scoreFourthPhasePlay(selectedCards, buildPlayContext(state)) : null;
  const progress = Math.min(1, state.driveScore / target);
  const meterFill = Math.min(1, (state.meter - BASE_METER) / Math.max(0.1, state.meterCap - BASE_METER));
  const runCode = fourthPhaseRunCode(state.seed, state.team);
  const teamProfile = FOURTH_PHASE_TEAMS[state.team];
  const playsLeft = Math.max(0, FOURTH_PHASE_MAX_PLAYS_PER_DRIVE - state.playsThisDrive);
  const firstVisit = useMemo(() => {
    try {
      if (localStorage.getItem('fp-seen-guide')) return false;
      localStorage.setItem('fp-seen-guide', '1');
      return true;
    } catch {
      return true;
    }
  }, []);

  function restart(team: FourthPhaseTeamKey) {
    setState(createInitialState(team));
  }

  function toggleCard(card: FourthPhaseCard) {
    if (state.phase !== 'play') return;
    setState((current) => {
      const exists = current.selectedIds.includes(card.id);
      if (exists) return { ...current, selectedIds: current.selectedIds.filter((id) => id !== card.id) };
      if (current.selectedIds.length >= FOURTH_PHASE_PLAY_LIMIT) return current;
      return { ...current, selectedIds: [...current.selectedIds, card.id] };
    });
  }

  function reorderSelected(targetId: string) {
    if (!dragCard || dragCard === targetId) return;
    setState((current) => {
      const from = current.selectedIds.indexOf(dragCard);
      const to = current.selectedIds.indexOf(targetId);
      return { ...current, selectedIds: dragReorder(current.selectedIds, from, to) };
    });
    setDragCard(null);
  }

  function reorderJokers(targetId: string) {
    if (!dragJoker || dragJoker === targetId) return;
    setState((current) => {
      const from = current.jokers.findIndex((joker) => joker.id === dragJoker);
      const to = current.jokers.findIndex((joker) => joker.id === targetId);
      return { ...current, jokers: dragReorder(current.jokers, from, to) };
    });
    setDragJoker(null);
  }

  // Touch- and keyboard-accessible reorder (HTML5 drag does not fire on touch devices).
  function moveSelected(id: string, dir: -1 | 1) {
    if (state.phase !== 'play') return;
    setState((current) => {
      const from = current.selectedIds.indexOf(id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= current.selectedIds.length) return current;
      return { ...current, selectedIds: dragReorder(current.selectedIds, from, to) };
    });
  }

  function moveJoker(id: string, dir: -1 | 1) {
    setState((current) => {
      const from = current.jokers.findIndex((joker) => joker.id === id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= current.jokers.length) return current;
      return { ...current, jokers: dragReorder(current.jokers, from, to) };
    });
  }

  function refillHand(current: LabState, hand: FourthPhaseCard[], discardPile: FourthPhaseCard[], drawExtra: number) {
    const count = Math.max(0, FOURTH_PHASE_HAND_SIZE - hand.length) + Math.max(0, drawExtra);
    const draw = drawFourthPhaseCards(
      current.drawPile,
      discardPile,
      count,
      mulberry32(stringSeed(`${current.seed}:draw:${current.drawNonce}`)),
    );
    return {
      hand: [...hand, ...draw.drawn].slice(0, FOURTH_PHASE_HAND_SIZE + 2),
      drawPile: draw.deck,
      discardPile: draw.discard,
      drawNonce: current.drawNonce + 1,
    };
  }

  function executePlay() {
    if (!preview || selectedCards.length === 0 || state.phase !== 'play') return;
    setState((current) => {
      const ids = new Set(current.selectedIds);
      const selected = current.selectedIds
        .map((id) => current.hand.find((card) => card.id === id))
        .filter((card): card is FourthPhaseCard => Boolean(card));
      const result = scoreFourthPhasePlay(selected, buildPlayContext(current));
      const hand = current.hand.filter((card) => !ids.has(card.id));
      const discardPile = [...current.discardPile, ...selected];
      const refill = refillHand(current, hand, discardPile, result.fuel.draw);
      const driveScore = current.driveScore + result.points;
      const repeatedSituations = {
        ...current.repeatedSituations,
        [result.situation.key]: (current.repeatedSituations[result.situation.key] ?? 0) + 1,
      };
      const cashEval = evaluateCashIn(result, current.targets[current.driveIndex], current.bestPlay);
      const cashIn = cashEval.show
        ? {
          points: result.points,
          situation: result.situation.label,
          bigPlay: result.bigPlay,
          meter: result.meterAfterCash,
          reason: cashEval.reason,
        }
        : current.cashIn;
      const baseUpdate: LabState = {
        ...current,
        ...refill,
        selectedIds: [],
        driveScore,
        playsThisDrive: current.playsThisDrive + 1,
        meter: result.meterAfter,
        meterCap: result.meterCap,
        money: Math.max(0, current.money + result.fuel.money),
        repeatedSituations,
        bestPlay: Math.max(current.bestPlay, result.points),
        lastPlay: result,
        cashIn,
      };
      if (driveScore >= current.targets[current.driveIndex]) {
        if (current.driveIndex >= FOURTH_PHASE_DRIVES - 1) {
          return { ...baseUpdate, phase: 'won', meter: BASE_METER };
        }
        return {
          ...baseUpdate,
          phase: 'warRoom',
          draft: draftFourthPhaseJokers(current.jokers, current.seed, current.driveIndex),
          money: baseUpdate.money + 5 + current.driveIndex * 2,
          meter: BASE_METER,
        };
      }
      const outOfPlayableCards =
        refill.hand.length === 0 ||
        (baseUpdate.playsThisDrive >= FOURTH_PHASE_MAX_PLAYS_PER_DRIVE && driveScore < current.targets[current.driveIndex]);
      return outOfPlayableCards ? { ...baseUpdate, phase: 'lost' } : baseUpdate;
    });
  }

  function redrawHand() {
    if (state.phase !== 'play' || state.discardsLeft <= 0) return;
    setState((current) => {
      const draw = drawFourthPhaseCards(
        current.drawPile,
        [...current.discardPile, ...current.hand],
        FOURTH_PHASE_HAND_SIZE,
        mulberry32(stringSeed(`${current.seed}:redraw:${current.drawNonce}`)),
      );
      return {
        ...current,
        hand: draw.drawn,
        drawPile: draw.deck,
        discardPile: draw.discard,
        selectedIds: [],
        discardsLeft: current.discardsLeft - 1,
        drawNonce: current.drawNonce + 1,
      };
    });
  }

  function startNextDrive(nextJokers: FourthPhaseJokerState[], money: number) {
    setState((current) => {
      const nextDrive = current.driveIndex + 1;
      const fullPile = shuffleFourthPhase(
        [...current.drawPile, ...current.hand, ...current.discardPile],
        mulberry32(stringSeed(`${current.seed}:drive:${nextDrive}`)),
      );
      const meter = applyFourthPhaseDrawStart(
        { meter: BASE_METER, meterCap: Math.max(BASE_METER_CAP, current.meterCap) },
        { jokers: nextJokers, wins: nextDrive, boss: activeBossForDrive(current, nextDrive) },
      );
      const draw = drawFourthPhaseCards(fullPile, [], FOURTH_PHASE_HAND_SIZE, mulberry32(stringSeed(`${current.seed}:drive-hand:${nextDrive}`)));
      return {
        ...current,
        driveIndex: nextDrive,
        drawPile: draw.deck,
        discardPile: draw.discard,
        hand: draw.drawn,
        selectedIds: [],
        jokers: nextJokers,
        draft: [],
        money,
        driveScore: 0,
        discardsLeft: FOURTH_PHASE_DISCARDS,
        playsThisDrive: 0,
        meter: meter.meter,
        meterCap: meter.meterCap,
        repeatedSituations: {},
        drawNonce: current.drawNonce + 1,
        phase: 'play',
        pendingDraft: undefined,
        lastPlay: undefined,
        cashIn: undefined,
      };
    });
  }

  function draftJoker(joker: FourthPhaseJokerState) {
    if (state.phase !== 'warRoom' || state.money < WAR_ROOM_COST) return;
    // At the slot cap, never silently drop a joker — joker order is mechanically
    // meaningful, so make the player choose which one to release.
    if (state.jokers.length >= FOURTH_PHASE_JOKER_LIMIT) {
      setState((current) => ({ ...current, pendingDraft: joker }));
      return;
    }
    startNextDrive([...state.jokers, joker], state.money - WAR_ROOM_COST);
  }

  function confirmReplaceJoker(index: number) {
    if (state.phase !== 'warRoom' || !state.pendingDraft || state.money < WAR_ROOM_COST) return;
    const nextJokers = state.jokers.map((joker, i) => (i === index ? state.pendingDraft! : joker));
    startNextDrive(nextJokers, state.money - WAR_ROOM_COST);
  }

  function cancelReplaceJoker() {
    setState((current) => ({ ...current, pendingDraft: undefined }));
  }

  function skipWarRoom() {
    if (state.phase !== 'warRoom') return;
    startNextDrive(state.jokers, state.money + 3);
  }

  function dragProps(id: string, setter: (id: string | null) => void, onDropId: (id: string) => void) {
    return {
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.dataTransfer.setData('text/plain', id);
        setter(id);
      },
      onDragOver: (event: DragEvent) => event.preventDefault(),
      onDrop: () => onDropId(id),
      onDragEnd: () => setter(null),
    };
  }

  return (
    <div style={{ minHeight: '100svh', padding: '10px 12px 18px', background: '#090c11' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        {onHome ? (
          <button onClick={onHome} style={{ ...btnGhost, minWidth: 74 }}>Home</button>
        ) : (
          <div style={{ minWidth: 74 }} />
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900, letterSpacing: 1.5 }}>FOURTH PHASE LAB</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{runCode}</div>
        </div>
        <button onClick={() => restart(state.team)} style={{ ...btnGhost, minWidth: 74 }}>Reset</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
        {teamKeys.map((team) => (
          <button
            key={team}
            onClick={() => restart(team)}
            style={{
              minHeight: 44,
              borderRadius: 8,
              border: `1px solid ${state.team === team ? FB.gold : FB.border}`,
              background: state.team === team ? '#2a230f' : '#101722',
              color: state.team === team ? FB.gold : FB.textDim,
              fontSize: 11,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {FOURTH_PHASE_TEAMS[team].shortName}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: FB.textDim, margin: '0 2px 10px', lineHeight: 1.4 }}>
        <span style={{ color: FB.text, fontWeight: 900 }}>{teamProfile.name}</span> · {teamProfile.identity}
      </div>

      <HowToPlay defaultOpen={firstVisit} />

      <section style={{ ...card(8), ...meterStyle(state.meter, state.meterCap), padding: 14, overflow: 'hidden', position: 'relative', background: 'linear-gradient(180deg,#101622,#080b11)' }}>
        <div className="fb-yard" style={{ position: 'absolute', inset: 0, opacity: 0.38 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ ...sectionLabel, color: '#cbbdff' }}>Crowd Meter</div>
            <div className="fb-num" style={{ fontSize: 34, color: '#efe9ff', fontWeight: 950, lineHeight: 1 }}>
              {formatMeter(state.meter)}
            </div>
          </div>
          <div style={{ height: 18, borderRadius: 8, background: '#111827', border: '1px solid #2a2441', overflow: 'hidden', marginTop: 10 }}>
            <div style={{ width: `${meterFill * 100}%`, height: '100%', background: 'linear-gradient(90deg,#4f9cff,#a987ff,#f4c24f)', transition: 'width 180ms ease-out' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, color: FB.textDim, fontSize: 11, fontWeight: 800 }}>
            <span>cap {formatMeter(state.meterCap)}</span>
            <span>Crowd charges it · scoring plays cash it</span>
          </div>
        </div>
      </section>

      <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={sectionLabel}>Drive {state.driveIndex + 1} of {FOURTH_PHASE_DRIVES}</div>
            <div style={{ fontSize: 20, fontWeight: 950, color: FB.text, lineHeight: 1.1 }}>{state.driveScore} / {target}</div>
            <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 2 }}>{targetRemaining} to go · {playsLeft} plays left</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={sectionLabel}>{FOURTH_PHASE_BOSSES[activeBoss].name}</div>
            <div style={{ fontSize: 11, color: activeBoss === 'none' ? FB.textFaint : FB.red, maxWidth: 210 }}>
              {FOURTH_PHASE_BOSSES[activeBoss].effect}
            </div>
          </div>
        </div>
        <div style={{ height: 9, borderRadius: 6, background: FB.inset, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg,#34c771,#f0b429)' }} />
        </div>
      </section>

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Jokers</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>◀ ▶ or drag to reorder</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
          {Array.from({ length: FOURTH_PHASE_JOKER_LIMIT }).map((_, index) => {
            const joker = state.jokers[index];
            if (!joker) return <div key={index} style={{ ...emptySlot }}>Slot {index + 1}</div>;
            const def = jokerDefinition(joker);
            return (
              <div key={joker.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  {...dragProps(joker.id, setDragJoker, reorderJokers)}
                  title={def.effect}
                  style={{
                    ...card(8),
                    minHeight: 58,
                    padding: '7px 6px',
                    borderColor: def.rarity === 'legendary' ? '#f4c24f' : def.rarity === 'rare' ? '#a987ff' : FB.border,
                    color: FB.text,
                    cursor: 'grab',
                  }}
                >
                  <div style={{ fontSize: 10, color: def.rarity === 'legendary' ? FB.gold : '#aeb7c6', fontWeight: 950, lineHeight: 1.05 }}>{def.name}</div>
                  <div style={{ fontSize: 9, color: FB.textFaint, marginTop: 3 }}>{def.rarity}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    aria-label={`Move ${def.name} earlier`}
                    disabled={index === 0}
                    onClick={() => moveJoker(joker.id, -1)}
                    style={{ ...reorderBtn, opacity: index === 0 ? 0.35 : 1 }}
                  >
                    ◀
                  </button>
                  <button
                    aria-label={`Move ${def.name} later`}
                    disabled={index === state.jokers.length - 1}
                    onClick={() => moveJoker(joker.id, 1)}
                    style={{ ...reorderBtn, opacity: index === state.jokers.length - 1 ? 0.35 : 1 }}
                  >
                    ▶
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {state.cashIn && (
        <section style={{ ...card(8), padding: 13, marginTop: 10, borderColor: '#f4c24f', background: 'linear-gradient(135deg,#2a1d08,#12151d)' }}>
          <div style={{ ...sectionLabel, color: FB.gold }}>{state.cashIn.reason}</div>
          <div className="fb-num" style={{ fontSize: 44, color: FB.gold, fontWeight: 950, lineHeight: 0.95, marginTop: 4 }}>{state.cashIn.points}</div>
          <div style={{ fontSize: 12, color: FB.text, fontWeight: 800, marginTop: 5 }}>
            {state.cashIn.situation} · BigPlay x{state.cashIn.bigPlay.toFixed(2)} · meter {formatMeter(state.cashIn.meter)}
          </div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 4 }}>{state.jokers.map((joker) => jokerDefinition(joker).name).join(' / ')}</div>
        </section>
      )}

      {state.phase === 'warRoom' && (
        <WarRoom
          money={state.money}
          draft={state.draft}
          jokers={state.jokers}
          pendingDraft={state.pendingDraft}
          onDraft={draftJoker}
          onReplace={confirmReplaceJoker}
          onCancelReplace={cancelReplaceJoker}
          onSkip={skipWarRoom}
        />
      )}

      {(state.phase === 'won' || state.phase === 'lost') && (
        <section style={{ ...card(8), padding: 16, marginTop: 10, textAlign: 'center', borderColor: state.phase === 'won' ? FB.gold : FB.red }}>
          <div style={{ fontSize: 13, color: state.phase === 'won' ? FB.gold : FB.red, fontWeight: 950, letterSpacing: 1.2 }}>
            {state.phase === 'won' ? 'LAB CLEAR' : 'DRIVE FAILED'}
          </div>
          <div style={{ fontSize: 12, color: FB.textDim, marginTop: 6 }}>
            {state.phase === 'won' ? 'Fourth Phase loop cleared the abstract target set.' : 'The prototype ran out of playable pressure.'}
          </div>
          <button onClick={() => restart(state.team)} style={{ ...btnPrimary, width: '100%', marginTop: 12 }}>Run it back</button>
        </section>
      )}

      <SituationsPanel activeKey={preview?.situation.key} defaultOpen={firstVisit} />

      <section style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Selected Play</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>{state.selectedIds.length}/{FOURTH_PHASE_PLAY_LIMIT} · left scores first</div>
        </div>
        <div style={{ display: 'flex', gap: 6, minHeight: 100, overflowX: 'auto', paddingBottom: 2 }}>
          {selectedCards.length === 0 ? (
            <div style={{ ...emptyWide }}>Select up to five cards</div>
          ) : selectedCards.map((card, index) => (
            <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ position: 'relative' }}>
                <span style={orderBadge}>{index + 1}</span>
                {preview?.cashesAtCardIndex === index && <span style={cashBadge}>CASHES</span>}
                <MiniCard
                  card={card}
                  selected
                  dragProps={dragProps(card.id, setDragCard, reorderSelected)}
                  onClick={() => toggleCard(card)}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  aria-label={`Move ${cardDisplayName(card)} earlier`}
                  disabled={index === 0}
                  onClick={() => moveSelected(card.id, -1)}
                  style={{ ...reorderBtn, opacity: index === 0 ? 0.35 : 1 }}
                >
                  ◀
                </button>
                <button
                  aria-label={`Move ${cardDisplayName(card)} later`}
                  disabled={index === selectedCards.length - 1}
                  onClick={() => moveSelected(card.id, 1)}
                  style={{ ...reorderBtn, opacity: index === selectedCards.length - 1 ? 0.35 : 1 }}
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div>
            <div style={sectionLabel}>Preview</div>
            <div style={{ fontSize: 17, color: FB.text, fontWeight: 950 }}>{preview ? preview.situation.label : 'No play selected'}</div>
          </div>
          <div className="fb-num" style={{ fontSize: 30, color: preview?.didCash ? FB.gold : FB.text, fontWeight: 950 }}>
            {preview ? preview.points : 0}
          </div>
        </div>
        {preview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
            <Metric label="Yards" value={`${preview.yards}`} color="#5fb4ff" />
            <Metric label="Exec" value={`+${preview.execution.toFixed(2)}`} color="#ff7c93" />
            <Metric label="BigPlay" value={`x${preview.bigPlay.toFixed(2)}`} color="#f4c24f" />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <button onClick={executePlay} disabled={!preview || state.phase !== 'play'} style={{ ...btnPrimary, opacity: preview && state.phase === 'play' ? 1 : 0.45 }}>
            Run Play
          </button>
          <button onClick={redrawHand} disabled={state.discardsLeft <= 0 || state.phase !== 'play'} style={{ ...btnGhost, minHeight: 48, opacity: state.discardsLeft > 0 && state.phase === 'play' ? 1 : 0.45 }}>
            Redraw ({state.discardsLeft})
          </button>
        </div>
      </section>

      {state.lastPlay && (
        <section style={{ ...card(8), padding: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={sectionLabel}>Live Ledger</div>
            {state.lastPlay.ledger.length > 7 && (
              <button
                onClick={() => setLedgerExpanded((value) => !value)}
                style={{ ...btnGhost, minHeight: 0, padding: '4px 10px', fontSize: 10.5 }}
              >
                {ledgerExpanded ? 'Show less' : `Show full math (${state.lastPlay.ledger.length})`}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {(ledgerExpanded ? state.lastPlay.ledger : state.lastPlay.ledger.slice(0, 7)).map((entry, index) => (
              <div key={`${entry.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: '92px 76px 1fr', gap: 6, fontSize: 11, color: FB.textDim }}>
                <span style={{ color: entry.channel === 'joker' ? '#cbbdff' : entry.channel === 'boss' ? FB.red : FB.textFaint, fontWeight: 900 }}>{entry.label}</span>
                <span className="fb-num" style={{ color: FB.text, fontWeight: 900 }}>{entry.value}</span>
                <span>{entry.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 10, paddingBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={sectionLabel}>Hand</div>
          <div style={{ fontSize: 11, color: FB.textFaint }}>${state.money}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {state.hand.map((card) => (
            <HandCard key={card.id} card={card} selected={state.selectedIds.includes(card.id)} onClick={() => toggleCard(card)} />
          ))}
        </div>
      </section>
    </div>
  );
}

const emptySlot: CSSProperties = {
  minHeight: 58,
  border: `1px dashed ${FB.border}`,
  borderRadius: 8,
  display: 'grid',
  placeItems: 'center',
  color: FB.textFaint,
  fontSize: 10,
  fontWeight: 800,
};

const orderBadge: CSSProperties = {
  position: 'absolute',
  top: -6,
  left: -6,
  zIndex: 2,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  background: FB.gold,
  color: '#1a1206',
  fontSize: 11,
  fontWeight: 950,
  display: 'grid',
  placeItems: 'center',
  padding: '0 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const cashBadge: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -4,
  zIndex: 2,
  borderRadius: 5,
  background: '#34c771',
  color: '#04130c',
  fontSize: 8.5,
  fontWeight: 950,
  letterSpacing: 0.5,
  padding: '2px 4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
};

const reorderBtn: CSSProperties = {
  flex: 1,
  minHeight: 30,
  borderRadius: 6,
  border: `1px solid ${FB.border}`,
  background: '#16202c',
  color: FB.textDim,
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  lineHeight: 1,
};

const emptyWide: CSSProperties = {
  minHeight: 72,
  minWidth: '100%',
  border: `1px dashed ${FB.border}`,
  borderRadius: 8,
  display: 'grid',
  placeItems: 'center',
  color: FB.textFaint,
  fontSize: 12,
};

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: FB.inset, border: `1px solid ${FB.border}`, borderRadius: 8, padding: '7px 8px' }}>
      <div style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900 }}>{label}</div>
      <div className="fb-num" style={{ fontSize: 16, color, fontWeight: 950 }}>{value}</div>
    </div>
  );
}

function HandCard({ card, selected, onClick }: { card: FourthPhaseCard; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={cardDisplayName(card)}
      style={{
        minHeight: 104,
        borderRadius: 8,
        border: `1px solid ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        background: selected ? '#2a230f' : '#101722',
        color: FB.text,
        padding: 8,
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 950, color: PHASE_COLOR[card.phase] }}>{card.rank}</span>
        <span style={{ fontSize: 9, color: FB.textFaint, fontWeight: 950 }}>{PHASE_SHORT[card.phase]}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: FB.text, fontWeight: 900, lineHeight: 1.05 }}>{card.roleName}</div>
        <div style={{ fontSize: 10, color: FB.textFaint, marginTop: 4 }}>{PHASE_LABEL[card.phase]}</div>
      </div>
      <div className="fb-num" style={{ fontSize: 11, color: FB.gold, fontWeight: 900 }}>value {card.value}</div>
    </button>
  );
}

function MiniCard({
  card,
  selected,
  dragProps,
  onClick,
}: {
  card: FourthPhaseCard;
  selected: boolean;
  dragProps: DragBind;
  onClick: () => void;
}) {
  return (
    <button
      {...dragProps}
      onClick={onClick}
      title={cardDisplayName(card)}
      style={{
        minWidth: 86,
        minHeight: 72,
        borderRadius: 8,
        border: `1px solid ${selected ? FB.gold : PHASE_COLOR[card.phase]}`,
        background: '#101722',
        color: FB.text,
        padding: 7,
        textAlign: 'left',
        cursor: 'grab',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 950, color: PHASE_COLOR[card.phase] }}>{card.rank}</div>
      <div style={{ fontSize: 10, color: FB.text, fontWeight: 900, lineHeight: 1.05 }}>{card.roleName}</div>
    </button>
  );
}

function WarRoom({
  money,
  draft,
  jokers,
  pendingDraft,
  onDraft,
  onReplace,
  onCancelReplace,
  onSkip,
}: {
  money: number;
  draft: FourthPhaseJokerState[];
  jokers: FourthPhaseJokerState[];
  pendingDraft?: FourthPhaseJokerState;
  onDraft: (joker: FourthPhaseJokerState) => void;
  onReplace: (index: number) => void;
  onCancelReplace: () => void;
  onSkip: () => void;
}) {
  if (pendingDraft) {
    const incoming = jokerDefinition(pendingDraft);
    return (
      <section style={{ ...card(8), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#15160d,#0d1118)' }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Sideline is full — release one for {incoming.name}</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>Order matters: the new joker takes the slot you pick.</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {jokers.map((joker, index) => {
            const def = jokerDefinition(joker);
            return (
              <button
                key={joker.id}
                onClick={() => onReplace(index)}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${FB.red}`,
                  background: '#101722',
                  color: FB.text,
                  padding: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 950 }}>Slot {index + 1} · {def.name}</span>
                  <span style={{ fontSize: 11, color: FB.red, fontWeight: 950 }}>release</span>
                </div>
                <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3 }}>{def.effect}</div>
              </button>
            );
          })}
        </div>
        <button onClick={onCancelReplace} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>Keep my lineup (cancel)</button>
      </section>
    );
  }
  return (
    <section style={{ ...card(8), padding: 12, marginTop: 10, borderColor: FB.gold, background: 'linear-gradient(180deg,#15160d,#0d1118)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Mini War Room</div>
        <div style={{ color: FB.text, fontSize: 12, fontWeight: 900 }}>${money}</div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {draft.map((joker) => {
          const def = jokerDefinition(joker);
          return (
            <button
              key={joker.id}
              onClick={() => onDraft(joker)}
              disabled={money < WAR_ROOM_COST}
              style={{
                borderRadius: 8,
                border: `1px solid ${def.rarity === 'legendary' ? FB.gold : '#36445a'}`,
                background: '#101722',
                color: money >= WAR_ROOM_COST ? FB.text : FB.textFaint,
                padding: 10,
                textAlign: 'left',
                cursor: money >= WAR_ROOM_COST ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 950 }}>{def.name}</span>
                <span style={{ fontSize: 11, color: FB.gold, fontWeight: 950 }}>${WAR_ROOM_COST}</span>
              </div>
              <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3 }}>{def.effect}</div>
            </button>
          );
        })}
      </div>
      <button onClick={onSkip} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>Skip for $3</button>
    </section>
  );
}
