import { useMemo, useState } from 'react';
import {
  buildStarterDeck, scoreFootballPlay, shuffle,
  HAND_SIZE, DRIVES_PER_MATCH, AUDIBLES_PER_DRIVE, MAX_PLAY_CARDS, DRIVE_BUDGET,
  FB_COORDINATORS, FB_ENVIRONMENTS,
  type FbCard, type FbCoordinatorKey, type FbEnvironmentKey, type FbPlaybook, type FbPlayResult, type FbConceptKey,
} from '../lib/footballRogue';
import { FB, SIDE, btnPrimary, btnGhost } from './footballStyles';
import FootballHelpModal from './FootballHelpModal';

export interface MatchProps {
  deck: FbCard[];
  coordinators: FbCoordinatorKey[];
  playbook: FbPlaybook;
  bombGames: number;
  targets: number[];
  environment: FbEnvironmentKey;
  gameNumber: number;
  totalGames: number;
  championship: boolean;
  onWon: (summary: { bombLanded: boolean; score: number }) => void;
  onLost: (info: { drive: number }) => void;
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
  bombLanded: boolean;
  conceptCountsThisDrive: Partial<Record<FbConceptKey, number>>;
  status: 'playing' | 'won' | 'lost';
  lastPlay: FbPlayResult | null;
  popKey: number;
}

function freshDrive(deck: FbCard[], discard: FbCard[]) {
  const pool = shuffle([...deck, ...discard]);
  return { deck: pool.slice(HAND_SIZE), hand: pool.slice(0, HAND_SIZE), discard: [] as FbCard[] };
}

function drawUp(deck: FbCard[], hand: FbCard[], discard: FbCard[]) {
  let d = [...deck]; let dp = [...discard]; const h = [...hand];
  while (h.length < HAND_SIZE) {
    if (d.length === 0) { if (dp.length === 0) break; d = shuffle(dp); dp = []; }
    h.push(d.shift()!);
  }
  return { deck: d, hand: h, discard: dp };
}

export default function FootballMatch(props: MatchProps) {
  const { deck: runDeck, coordinators, playbook, bombGames, targets, environment, gameNumber, totalGames, championship } = props;

  const [match, setMatch] = useState<MatchState>(() => {
    const full = shuffle(runDeck.length ? runDeck : buildStarterDeck().cards);
    return {
      deck: full.slice(HAND_SIZE), hand: full.slice(0, HAND_SIZE), discard: [],
      driveIndex: 0, driveScore: 0, totalScore: 0,
      budgetLeft: DRIVE_BUDGET[0], audiblesLeft: AUDIBLES_PER_DRIVE,
      stacksThisMatch: 0, groundBonusThisMatch: 0, bombLanded: false,
      conceptCountsThisDrive: {}, status: 'playing', lastPlay: null, popKey: 0,
    };
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const selectedCards = useMemo(
    () => selected.map((id) => match.hand.find((c) => c.id === id)).filter(Boolean) as FbCard[],
    [selected, match.hand],
  );
  const scoreCtx = useMemo(() => ({
    coordinators, environment, playbook, bombGames,
    stacksThisMatch: match.stacksThisMatch,
    groundBonusThisMatch: match.groundBonusThisMatch,
    conceptCountsThisDrive: match.conceptCountsThisDrive,
  }), [coordinators, environment, playbook, bombGames, match.stacksThisMatch, match.groundBonusThisMatch, match.conceptCountsThisDrive]);
  const preview = useMemo(() => scoreFootballPlay(selectedCards, scoreCtx), [selectedCards, scoreCtx]);

  const env = FB_ENVIRONMENTS[environment];
  const target = targets[match.driveIndex];
  const remaining = Math.max(0, target - match.driveScore);
  const pct = Math.min(100, (match.driveScore / target) * 100);
  const selectedCost = selectedCards.reduce((s, c) => s + c.cost, 0);
  const overBudget = selectedCost > match.budgetLeft;
  const cheapest = match.hand.length ? Math.min(...match.hand.map((c) => c.cost)) : 0;
  const canAffordAnything = match.budgetLeft >= cheapest;
  const handHasPass = match.hand.some((c) => c.side === 'pass');
  const handHasRun = match.hand.some((c) => c.action === 'power_run' || c.action === 'breakaway_run');

  function toggle(id: string) {
    if (match.status !== 'playing') return;
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_PLAY_CARDS ? prev : [...prev, id]);
  }

  function runPlay() {
    if (match.status !== 'playing' || selectedCards.length === 0 || overBudget) return;
    const result = scoreFootballPlay(selectedCards, scoreCtx);
    setMatch((m) => {
      const playedIds = new Set(selected);
      const handAfter = m.hand.filter((c) => !playedIds.has(c.id));
      const discardAfter = [...m.discard, ...m.hand.filter((c) => playedIds.has(c.id))];
      const newScore = m.driveScore + result.total;
      const newBudget = m.budgetLeft - result.cost;
      const isStackCon = result.concept === 'stack_td' || result.concept === 'double_stack_bomb' || result.concept === 'shootout_stack';
      const stacks = m.stacksThisMatch + (isStackCon ? 1 : 0);
      const ground = m.groundBonusThisMatch + (result.concept === 'ground_pound' ? 6 : 0);
      const bomb = m.bombLanded || result.concept === 'double_stack_bomb';
      const counts = { ...m.conceptCountsThisDrive, [result.concept]: (m.conceptCountsThisDrive[result.concept] ?? 0) + 1 };
      const base = { ...m, stacksThisMatch: stacks, groundBonusThisMatch: ground, bombLanded: bomb, lastPlay: result, popKey: m.popKey + 1 };

      if (newScore >= target) {
        const nextIndex = m.driveIndex + 1;
        if (nextIndex >= DRIVES_PER_MATCH) {
          return { ...base, driveScore: newScore, totalScore: m.totalScore + newScore, budgetLeft: newBudget, conceptCountsThisDrive: counts, status: 'won' };
        }
        const fd = freshDrive(m.deck, discardAfter);
        return { ...base, ...fd, driveIndex: nextIndex, driveScore: 0, totalScore: m.totalScore + newScore, budgetLeft: DRIVE_BUDGET[nextIndex], audiblesLeft: AUDIBLES_PER_DRIVE, conceptCountsThisDrive: {}, status: 'playing' };
      }

      const drawn = drawUp(m.deck, handAfter, discardAfter);
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
      const drawn = drawUp(m.deck, handAfter, discardAfter);
      return { ...m, ...drawn, audiblesLeft: m.audiblesLeft - 1 };
    });
    setSelected([]);
  }

  return (
    <div style={{ minHeight: '100svh', padding: '14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={props.onHome} style={btnGhost}>←</button>
        <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.5, fontWeight: 900 }}>
          {championship ? '🏆 CHAMPIONSHIP' : `GAME ${gameNumber} / ${totalGames}`}
        </div>
        <button onClick={() => setShowHelp(true)} style={btnGhost}>?</button>
      </div>

      <div className="fb-yard" style={{ background: championship ? 'linear-gradient(180deg,#2a2410,#0b1119)' : 'linear-gradient(180deg,#11202c,#0b1119)', border: `1px solid ${championship ? '#5a4a16' : FB.border}`, borderRadius: 16, padding: 15 }}>
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
            <div style={{ fontSize: 9.5, color: FB.textFaint, letterSpacing: 1.5, fontWeight: 800 }}>DRIVE SCORE</div>
            <div key={match.popKey} className="fb-num fb-pop" style={{ fontSize: 40, fontWeight: 900, color: FB.text, lineHeight: 1 }}>{match.driveScore}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, color: FB.textFaint, letterSpacing: 1.5, fontWeight: 800 }}>TARGET</div>
            <div className="fb-num" style={{ fontSize: 22, fontWeight: 900, color: FB.gold }}>{target}</div>
            <div style={{ fontSize: 10, color: pct >= 100 ? FB.green : FB.textDim, fontWeight: 600 }}>{remaining > 0 ? `${remaining} to go` : '✓ cleared'}</div>
          </div>
        </div>
        <div style={{ height: 9, background: '#0a1016', borderRadius: 6, overflow: 'hidden', border: '1px solid #0c151d' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? `linear-gradient(90deg,#2aa85e,${FB.green})` : `linear-gradient(90deg,#c98f17,${FB.gold})`, transition: 'width .35s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
          <Stat label="Budget" value={`$${match.budgetLeft}`} accent={FB.gold} />
          <Stat label="Audibles" value={`${match.audiblesLeft}`} />
          <Stat label="Deck" value={`${match.deck.length}`} />
          <Stat label="Weather" value={env.label.split(' ')[0]} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          {coordinators.map((k) => {
            const ramp = k === 'air_raid' && match.stacksThisMatch > 0 ? `+${(0.2 * match.stacksThisMatch).toFixed(1)} EXE`
              : k === 'bell_cow' && match.groundBonusThisMatch > 0 ? `+${match.groundBonusThisMatch} BASE`
              : k === 'franchise_qb' && bombGames > 0 ? `×${(1 + 0.15 * bombGames).toFixed(2)} BP` : '';
            return (
              <span key={k} style={{ fontSize: 10, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>
                {FB_COORDINATORS[k].name}{ramp && <span style={{ color: FB.gold }}> · {ramp}</span>}
              </span>
            );
          })}
        </div>
      </div>

      {match.status === 'playing' && (
        <>
          <PlayPreview result={preview} count={selectedCards.length} budgetLeft={match.budgetLeft} overBudget={overBudget} />
          <div>
            <div style={{ fontSize: 9.5, color: FB.textFaint, letterSpacing: 1.4, fontWeight: 800, margin: '0 2px 7px' }}>YOUR HAND · TAP UP TO {MAX_PLAY_CARDS}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {match.hand.map((c) => (
                <CardView key={c.id} card={c} active={selected.includes(c.id)} affordable={c.cost <= match.budgetLeft} onClick={() => toggle(c.id)} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={audible} disabled={selectedCards.length === 0 || match.audiblesLeft <= 0}
              style={{ ...btnGhost, flex: 1, padding: '14px 0', fontSize: 14, borderRadius: 12, opacity: selectedCards.length === 0 || match.audiblesLeft <= 0 ? 0.45 : 1 }}>
              Audible · {match.audiblesLeft}
            </button>
            <button onClick={runPlay} disabled={selectedCards.length === 0 || overBudget}
              style={{ ...btnPrimary, flex: 2, ...(selectedCards.length === 0 || overBudget ? { background: '#1a2330', color: FB.textFaint, boxShadow: 'none' } : {}) }}>
              {overBudget ? `Over budget by $${selectedCost - match.budgetLeft}` : selectedCards.length ? `Run Play  ·  +${preview.total}` : 'Select cards'}
            </button>
          </div>
          {!canAffordAnything && <div style={{ fontSize: 11, color: FB.red, textAlign: 'center' }}>Out of budget — audible for cheaper cards or the drive stalls.</div>}
          {canAffordAnything && !handHasPass && !handHasRun && match.audiblesLeft > 0 && (
            <div style={{ fontSize: 11, color: FB.gold, textAlign: 'center' }}>💡 No QB pass or run in hand — select a few catches and Audible to dig for one.</div>
          )}
          {match.lastPlay && <div style={{ fontSize: 11, color: FB.textFaint, textAlign: 'center' }}>Last: {match.lastPlay.playName} · +{match.lastPlay.total}</div>}
        </>
      )}

      {match.status === 'won' && (
        <ResultPanel won title={championship ? 'Champions!' : `Game ${gameNumber} Won`}
          detail={championship ? 'You cleared the championship.' : 'All three drives cleared.'}
          cta={championship ? 'See Results →' : 'Choose Reward →'}
          onCta={() => props.onWon({ bombLanded: match.bombLanded, score: match.totalScore })} />
      )}
      {match.status === 'lost' && (
        <ResultPanel won={false} title="Drive Stalled"
          detail={`Ran out of budget on Drive ${match.driveIndex + 1} before the target. The season ends here.`}
          cta="See Results →" onCta={() => props.onLost({ drive: match.driveIndex + 1 })} />
      )}

      {showHelp && <FootballHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: '#0a1016', border: '1px solid #14202b', borderRadius: 9, padding: '7px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 15, fontWeight: 900, color: accent ?? FB.text }}>{value}</div>
      <div style={{ fontSize: 8.5, color: FB.textFaint, letterSpacing: 0.6, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function CardView({ card, active, affordable, onClick }: { card: FbCard; active: boolean; affordable: boolean; onClick: () => void }) {
  const c = SIDE[card.side];
  return (
    <button onClick={onClick} className={active ? 'fb-glow' : undefined} style={{
      background: active ? c.grad : FB.panelSoft,
      border: `1.5px solid ${active ? c.border : FB.borderSoft}`,
      borderRadius: 11, padding: '8px 6px 7px', cursor: 'pointer', textAlign: 'left',
      transform: active ? 'translateY(-5px)' : 'none', transition: 'transform .14s ease, border-color .14s',
      minHeight: 84, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      opacity: affordable || active ? 1 : 0.42,
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 900, color: c.text, background: c.chip, border: `1px solid ${c.border}55`, borderRadius: 4, padding: '1px 4px' }}>{card.position}</span>
          <span className="fb-num" style={{ fontSize: 9, fontWeight: 900, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 4, padding: '1px 5px' }}>${card.cost}</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: c.text, marginTop: 5, lineHeight: 1.05 }}>{card.label}</div>
        <div className="fb-num" style={{ fontSize: 16, fontWeight: 900, color: FB.text, marginTop: 1 }}>{card.value}</div>
      </div>
      <div style={{ fontSize: 8, color: FB.textFaint, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.playerName} · {card.team}</div>
    </button>
  );
}

function PlayPreview({ result, count, budgetLeft, overBudget }: { result: FbPlayResult; count: number; budgetLeft: number; overBudget: boolean }) {
  const live = count > 0;
  const good = result.valid && !overBudget;
  return (
    <div style={{ background: live ? (good ? FB.greenSoft : '#23121a') : FB.panelSoft, border: `1px solid ${live ? (good ? '#1f6b44' : '#6b3344') : FB.borderSoft}`, borderRadius: 13, padding: 12, transition: 'background .15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: live ? 9 : 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: FB.text }}>{result.playName}</div>
          <div style={{ fontSize: 11, color: FB.textDim }}>{live ? result.flavor : 'Tap cards to call a play.'}</div>
        </div>
        {live && <div className="fb-num" style={{ fontSize: 28, fontWeight: 900, color: good ? FB.green : FB.red, lineHeight: 1 }}>{result.total}</div>}
      </div>
      {live && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: result.ledger.length > 2 ? 8 : 0 }}>
            <Channel label="Base" value={`${result.base}`} color={FB.green} />
            <Channel label="Execution" value={`+${result.execution.toFixed(2)}`} color={FB.blue} />
            <Channel label="Big Play" value={`×${result.bigPlay}`} color={FB.gold} />
            <Channel label="Cost" value={`$${result.cost}/${budgetLeft}`} color={overBudget ? FB.red : FB.textDim} />
          </div>
          {result.ledger.length > 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {result.ledger.filter((e) => ['execution', 'big_play', 'coordinator', 'environment', 'spam'].includes(e.kind)).map((e) => (
                <span key={e.id} style={{ fontSize: 10, fontWeight: 700, color: e.kind === 'coordinator' ? '#b7a7ff' : e.kind === 'spam' ? FB.red : e.kind === 'environment' ? '#9cc6ff' : e.kind === 'big_play' ? FB.gold : FB.blue, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 6, padding: '3px 7px' }}>{e.label}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Channel({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 13, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 8, color: FB.textFaint, letterSpacing: 0.4, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
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
