import { useMemo, useState } from 'react';
import {
  buildStarterDeck, scoreFootballPlay, shuffle, randomEnvironment, driveTargets,
  HAND_SIZE, DRIVES_PER_MATCH, AUDIBLES_PER_DRIVE, MAX_PLAY_CARDS, DRIVE_BUDGET,
  FB_COORDINATORS, FB_ENVIRONMENTS, STARTER_COORDINATORS,
  type FbCard, type FbSide, type FbEnvironmentKey, type FbPlayResult, type FbConceptKey,
} from '../lib/footballRogue';

interface Props { onHome: () => void; }

const SIDE_COLOR: Record<FbSide, { border: string; chip: string; text: string }> = {
  pass: { border: '#2a6ef5', chip: '#0d1a2a', text: '#6fb0ff' },
  catch: { border: '#27ae60', chip: '#0d2218', text: '#5fd99a' },
  run: { border: '#f59e0b', chip: '#241803', text: '#ffc457' },
  kick: { border: '#8a8a8a', chip: '#1a1a1a', text: '#cfcfcf' },
  defense: { border: '#b8556b', chip: '#241016', text: '#ff8fa6' },
};

interface MatchState {
  deck: FbCard[];
  hand: FbCard[];
  discard: FbCard[];
  driveIndex: number;
  targets: number[];
  driveScore: number;
  budgetLeft: number;
  audiblesLeft: number;
  environment: FbEnvironmentKey;
  // scaling counters
  stacksThisMatch: number;
  groundBonusThisMatch: number;
  conceptCountsThisDrive: Partial<Record<FbConceptKey, number>>;
  status: 'playing' | 'won' | 'lost';
  lastPlay: { result: FbPlayResult; drive: number } | null;
}

function freshDrive(deck: FbCard[], discard: FbCard[]): { deck: FbCard[]; hand: FbCard[]; discard: FbCard[] } {
  const pool = shuffle([...deck, ...discard]);
  const hand = pool.slice(0, HAND_SIZE);
  return { deck: pool.slice(HAND_SIZE), hand, discard: [] };
}

function deal(): MatchState {
  const env = randomEnvironment();
  const full = shuffle(buildStarterDeck().cards);
  const hand = full.slice(0, HAND_SIZE);
  return {
    deck: full.slice(HAND_SIZE), hand, discard: [],
    driveIndex: 0, targets: driveTargets(env), driveScore: 0,
    budgetLeft: DRIVE_BUDGET[0], audiblesLeft: AUDIBLES_PER_DRIVE,
    environment: env, stacksThisMatch: 0, groundBonusThisMatch: 0,
    conceptCountsThisDrive: {}, status: 'playing', lastPlay: null,
  };
}

function drawUp(deck: FbCard[], hand: FbCard[], discard: FbCard[]) {
  let d = [...deck]; let dp = [...discard]; const h = [...hand];
  while (h.length < HAND_SIZE) {
    if (d.length === 0) { if (dp.length === 0) break; d = shuffle(dp); dp = []; }
    h.push(d.shift()!);
  }
  return { deck: d, hand: h, discard: dp };
}

export default function FootballRogueScreen({ onHome }: Props) {
  const [match, setMatch] = useState<MatchState>(() => deal());
  const [selected, setSelected] = useState<string[]>([]);

  const selectedCards = useMemo(
    () => selected.map((id) => match.hand.find((c) => c.id === id)).filter(Boolean) as FbCard[],
    [selected, match.hand],
  );

  const scoreCtx = useMemo(() => ({
    coordinators: STARTER_COORDINATORS,
    environment: match.environment,
    stacksThisMatch: match.stacksThisMatch,
    groundBonusThisMatch: match.groundBonusThisMatch,
    conceptCountsThisDrive: match.conceptCountsThisDrive,
  }), [match.environment, match.stacksThisMatch, match.groundBonusThisMatch, match.conceptCountsThisDrive]);

  const preview = useMemo(() => scoreFootballPlay(selectedCards, scoreCtx), [selectedCards, scoreCtx]);

  const env = FB_ENVIRONMENTS[match.environment];
  const target = match.targets[match.driveIndex];
  const remaining = Math.max(0, target - match.driveScore);
  const pct = Math.min(100, (match.driveScore / target) * 100);
  const selectedCost = selectedCards.reduce((s, c) => s + c.cost, 0);
  const overBudget = selectedCost > match.budgetLeft;
  const cheapestCost = Math.min(...match.hand.map((c) => c.cost));
  const canAffordAnything = match.budgetLeft >= cheapestCost;

  function toggle(id: string) {
    if (match.status !== 'playing') return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PLAY_CARDS) return prev;
      return [...prev, id];
    });
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
      const stacks = m.stacksThisMatch + (result.concept === 'stack_td' || result.concept === 'double_stack_bomb' || result.concept === 'shootout_stack' ? 1 : 0);
      const ground = m.groundBonusThisMatch + (result.concept === 'ground_pound' ? 6 : 0);
      const counts = { ...m.conceptCountsThisDrive, [result.concept]: (m.conceptCountsThisDrive[result.concept] ?? 0) + 1 };

      const driveCleared = newScore >= target;
      if (driveCleared) {
        const nextIndex = m.driveIndex + 1;
        if (nextIndex >= DRIVES_PER_MATCH) {
          const drawn = drawUp(m.deck, handAfter, discardAfter);
          return { ...m, ...drawn, driveScore: newScore, budgetLeft: newBudget, stacksThisMatch: stacks, groundBonusThisMatch: ground, conceptCountsThisDrive: counts, status: 'won', lastPlay: { result, drive: m.driveIndex } };
        }
        // advance to next drive: fresh hand, fresh budget/audibles, reset drive score + spam
        const fd = freshDrive(m.deck, discardAfter);
        return {
          ...m, ...fd, driveIndex: nextIndex, driveScore: 0,
          budgetLeft: DRIVE_BUDGET[nextIndex], audiblesLeft: AUDIBLES_PER_DRIVE,
          stacksThisMatch: stacks, groundBonusThisMatch: ground, conceptCountsThisDrive: {},
          status: 'playing', lastPlay: { result, drive: m.driveIndex },
        };
      }

      // drive not cleared — did we just run out of money?
      const drawn = drawUp(m.deck, handAfter, discardAfter);
      const broke = (newBudget < Math.min(...drawn.hand.map((c) => c.cost), Infinity));
      return {
        ...m, ...drawn, driveScore: newScore, budgetLeft: newBudget,
        stacksThisMatch: stacks, groundBonusThisMatch: ground, conceptCountsThisDrive: counts,
        status: broke ? 'lost' : 'playing', lastPlay: { result, drive: m.driveIndex },
      };
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

  function newGame() { setMatch(deal()); setSelected([]); }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '16px 14px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onHome} style={ghostBtn}>← Home</button>
        <div style={{ fontSize: 11, color: '#777', letterSpacing: 1, fontWeight: 800 }}>FOOTBALL ROGUE · PROTOTYPE</div>
        <button onClick={newGame} style={ghostBtn}>↻ New</button>
      </div>

      {/* Scoreboard */}
      <div style={{ background: '#101826', border: '1px solid #1f3350', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {match.targets.map((_, i) => (
              <div key={i} style={{
                width: 22, height: 6, borderRadius: 3,
                background: i < match.driveIndex ? '#27ae60' : i === match.driveIndex ? '#2a6ef5' : '#1f3350',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#6b86b8', fontWeight: 700 }}>
            Drive {Math.min(match.driveIndex + 1, DRIVES_PER_MATCH)}/{DRIVES_PER_MATCH}{match.driveIndex === DRIVES_PER_MATCH - 1 ? ' · BOSS' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#6b86b8', letterSpacing: 1 }}>DRIVE SCORE</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{match.driveScore}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b86b8', letterSpacing: 1 }}>TARGET</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{target}</div>
            <div style={{ fontSize: 10, color: '#6b86b8' }}>{remaining > 0 ? `${remaining} to go` : 'cleared!'}</div>
          </div>
        </div>
        <div style={{ height: 8, background: '#0a0f18', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#27ae60' : '#2a6ef5', transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          <Pill label="Play Budget" value={`${match.budgetLeft}`} accent="#f59e0b" />
          <Pill label="Audibles" value={`${match.audiblesLeft}`} />
          <Pill label="Deck" value={`${match.deck.length}`} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#0a0f18', border: '1px solid #1f3350', borderRadius: 8, padding: '7px 10px' }}>
            <div style={{ fontSize: 12, color: '#cfe0ff', fontWeight: 700 }}>{env.label}</div>
            <div style={{ fontSize: 11, color: '#6b86b8' }}>{env.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
          {STARTER_COORDINATORS.map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 700, color: '#b7a7ff', background: '#0a0a0a', border: '1px solid #2a2440', borderRadius: 6, padding: '3px 7px' }}>
              {FB_COORDINATORS[k].name}{k === 'air_raid' && match.stacksThisMatch > 0 ? ` ·+${(0.2 * match.stacksThisMatch).toFixed(1)}` : ''}{k === 'bell_cow' && match.groundBonusThisMatch > 0 ? ` ·+${match.groundBonusThisMatch}` : ''}
            </span>
          ))}
        </div>
      </div>

      {match.status === 'playing' && (
        <>
          <PlayPreview result={preview} count={selectedCards.length} budgetLeft={match.budgetLeft} overBudget={overBudget} />

          <div>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, margin: '2px 2px 6px' }}>
              YOUR HAND · tap up to {MAX_PLAY_CARDS} cards · number = cap cost
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {match.hand.map((card) => (
                <CardView key={card.id} card={card} active={selected.includes(card.id)} affordable={card.cost <= match.budgetLeft} onClick={() => toggle(card.id)} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button onClick={audible} disabled={selectedCards.length === 0 || match.audiblesLeft <= 0}
              style={{ ...actionBtn, background: '#1a1a1a', border: '1px solid #333', color: match.audiblesLeft > 0 ? '#ccc' : '#555', flex: 1, opacity: selectedCards.length === 0 || match.audiblesLeft <= 0 ? 0.5 : 1 }}>
              Audible ({match.audiblesLeft})
            </button>
            <button onClick={runPlay} disabled={selectedCards.length === 0 || overBudget}
              style={{ ...actionBtn, background: selectedCards.length === 0 || overBudget ? '#1a2436' : '#2a6ef5', color: '#fff', flex: 2, opacity: selectedCards.length === 0 || overBudget ? 0.6 : 1 }}>
              {overBudget ? `Over budget by ${selectedCost - match.budgetLeft}` : selectedCards.length ? `Run Play · +${preview.total}` : 'Run Play'}
            </button>
          </div>

          {!canAffordAnything && (
            <div style={{ fontSize: 11, color: '#ff8fa6', textAlign: 'center' }}>Out of budget — audible for cheaper cards or this drive stalls.</div>
          )}
          {match.lastPlay && (
            <div style={{ fontSize: 11, color: '#6b86b8', textAlign: 'center' }}>
              Last: {match.lastPlay.result.playName} for {match.lastPlay.result.total}
            </div>
          )}
        </>
      )}

      {match.status !== 'playing' && (
        <EndPanel won={match.status === 'won'} drive={match.driveIndex + 1} onReplay={newGame} onHome={onHome} />
      )}
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ flex: 1, background: '#0a0f18', border: '1px solid #1f3350', borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: accent ?? '#fff' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#6b86b8', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function CardView({ card, active, affordable, onClick }: { card: FbCard; active: boolean; affordable: boolean; onClick: () => void }) {
  const c = SIDE_COLOR[card.side];
  return (
    <button onClick={onClick} style={{
      background: active ? c.chip : '#111',
      border: `1.5px solid ${active ? c.border : '#242424'}`,
      borderRadius: 9, padding: '7px 5px 6px', cursor: 'pointer', textAlign: 'left',
      transform: active ? 'translateY(-4px)' : 'none', transition: 'transform .12s, border-color .12s',
      minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      opacity: affordable || active ? 1 : 0.5,
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontWeight: 900, color: c.text, background: c.chip, border: `1px solid ${c.border}55`, borderRadius: 4, padding: '1px 4px' }}>{card.position}</span>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#f59e0b', background: '#241803', border: '1px solid #5a4112', borderRadius: 4, padding: '1px 5px' }}>${card.cost}</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: c.text, marginTop: 4, lineHeight: 1.1 }}>{card.label}</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 1 }}>{card.value}</div>
      </div>
      <div style={{ fontSize: 8.5, color: '#777', lineHeight: 1.1 }}>{card.playerName} · {card.team}</div>
    </button>
  );
}

function PlayPreview({ result, count, budgetLeft, overBudget }: { result: FbPlayResult; count: number; budgetLeft: number; overBudget: boolean }) {
  const live = count > 0;
  const good = result.valid && !overBudget;
  return (
    <div style={{
      background: live ? (good ? '#0d1f14' : '#1f1410') : '#0d0d0d',
      border: `1px solid ${live ? (good ? '#27ae6066' : '#b8556b66') : '#1e1e1e'}`,
      borderRadius: 12, padding: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: live ? 8 : 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{result.playName}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{result.flavor}</div>
        </div>
        {live && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: good ? '#5fd99a' : '#ff8fa6', lineHeight: 1 }}>{result.total}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{result.base} × {(1 + result.execution).toFixed(2)} × {result.bigPlay}</div>
          </div>
        )}
      </div>
      {live && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Channel label="BASE" value={`${result.base}`} color="#9bf0c0" />
            <Channel label="EXECUTION" value={`+${result.execution.toFixed(2)}`} color="#6fb0ff" />
            <Channel label="BIG PLAY" value={`×${result.bigPlay}`} color="#ffc457" />
            <Channel label="COST" value={`$${result.cost}/${budgetLeft}`} color={overBudget ? '#ff8fa6' : '#cfcfcf'} />
          </div>
          {result.ledger.length > 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {result.ledger.filter((e) => e.kind === 'execution' || e.kind === 'big_play' || e.kind === 'coordinator' || e.kind === 'environment' || e.kind === 'spam').map((e) => (
                <span key={e.id} style={{
                  fontSize: 10, fontWeight: 700,
                  color: e.kind === 'coordinator' ? '#b7a7ff' : e.kind === 'spam' ? '#ff8fa6' : e.kind === 'environment' ? '#cfe0ff' : e.kind === 'big_play' ? '#ffc457' : '#6fb0ff',
                  background: '#0a0a0a', border: '1px solid #242424', borderRadius: 6, padding: '3px 7px',
                }}>{e.label}</span>
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
    <div style={{ flex: 1, background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 7, padding: '5px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 8, color: '#666', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function EndPanel({ won, drive, onReplay, onHome }: { won: boolean; drive: number; onReplay: () => void; onHome: () => void }) {
  return (
    <div style={{ background: won ? '#0d2216' : '#1f0d10', border: `1px solid ${won ? '#27ae60' : '#b8556b'}`, borderRadius: 14, padding: 20, textAlign: 'center', marginTop: 8 }}>
      <div style={{ fontSize: 40 }}>{won ? '🏆' : '😖'}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>{won ? 'Match Won!' : 'Drive Stalled'}</div>
      <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
        {won ? 'You cleared all three drives.' : `Ran out of budget on Drive ${drive} before reaching the target.`}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={onHome} style={{ ...actionBtn, background: '#1a1a1a', border: '1px solid #333', color: '#ccc', flex: 1 }}>Home</button>
        <button onClick={onReplay} style={{ ...actionBtn, background: won ? '#27ae60' : '#2a6ef5', color: '#fff', flex: 2 }}>Play Again</button>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = { background: '#141414', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const actionBtn: React.CSSProperties = { padding: '13px 0', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer' };
