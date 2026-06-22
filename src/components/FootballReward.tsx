import { FB, card, sectionLabel, btnPrimary, btnGhost } from './footballStyles';
import {
  FB_BOSS_SCHEMES, FB_COORDINATORS, FB_CONCEPT_LABEL, FB_ENVIRONMENTS, FB_CARD_MODIFIERS,
  type FbBossSchemeKey, type FbEnvironmentKey,
} from '../lib/footballRogue';
import { buildIdentity, deckValueSummary, rewardFitLabel, rewardImpact, SEASON_GAMES, type FbRunState, type Reward } from '../lib/footballRun';
import { MAX_WAR_ROOM_PURCHASES, SKIP_REWARD, type ShopCreditInfo } from '../lib/gridironEconomy';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';

interface Props {
  run: FbRunState;
  rewards: Reward[];
  creditInfo: ShopCreditInfo | null;
  rerollCost: number;
  purchases: number;
  nextBossScheme: FbBossSchemeKey;
  nextEnvironment: FbEnvironmentKey;
  onBuy: (reward: Reward) => void;
  onReroll: () => void;
  onProceed: () => void;
}

const KIND_COLOR: Record<Reward['kind'], string> = {
  card: FB.green, coordinator: '#b7a7ff', playbook: FB.blue, trim: FB.red, upgrade: FB.gold, training: '#5fe0a0',
};

type DecisionLane = 'Engine' | 'Counter' | 'Consistency' | 'Value' | 'Risk';

const LANE_STYLE: Record<DecisionLane, { color: string; bg: string; copy: string }> = {
  Engine: { color: FB.blue, bg: '#0b1b32', copy: 'Builds your scaling plan' },
  Counter: { color: FB.red, bg: '#2a1118', copy: 'Answers the next defense' },
  Consistency: { color: FB.green, bg: FB.greenSoft, copy: 'Improves draw quality' },
  Value: { color: FB.gold, bg: FB.goldSoft, copy: 'Raises your floor now' },
  Risk: { color: '#b7a7ff', bg: '#140f24', copy: 'Adds a side lane' },
};

export default function FootballReward({ run, rewards, creditInfo, rerollCost, purchases, nextBossScheme, nextEnvironment, onBuy, onReroll, onProceed }: Props) {
  const deck = deckValueSummary(run.deck);
  const nextGame = run.gameNumber + 1;
  const identity = buildIdentity(run);
  const nextBoss = FB_BOSS_SCHEMES[nextBossScheme];
  const nextEnv = FB_ENVIRONMENTS[nextEnvironment];
  const canReroll = run.funds >= rerollCost && rewards.length > 0;
  const purchaseLimitReached = purchases >= MAX_WAR_ROOM_PURCHASES;
  const trained = run.deck.filter((c) => c.modifier);
  const coachId = TEAM_IDENTITY[run.team];
  const coachAdvice = nextBossScheme === 'balanced'
    ? `${coachId.quote} ${nextBoss.label} is next — feed your engine.`
    : `${nextBoss.label} is up next. ${nextBoss.hint} Shop the Counter lane.`;

  return (
    <div style={{ minHeight: '100svh', padding: '20px 16px 28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: FB.green, letterSpacing: 2, fontWeight: 800 }}>GAME CLEARED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: FB.text, marginTop: 2 }}>War Room</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="fb-num" style={{ fontSize: 26, fontWeight: 900, color: FB.gold, lineHeight: 1 }}>${run.funds}</div>
          <div style={{ fontSize: 9.5, color: FB.textFaint, fontWeight: 800, letterSpacing: 1 }}>FUNDS</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: FB.textDim, marginTop: 6 }}>
        Spend before {nextGame >= SEASON_GAMES ? 'the Championship' : `Game ${nextGame}`} — the target rises. Buy up to {MAX_WAR_ROOM_PURCHASES}, reroll, or bank for later.
        {creditInfo && (
          <span style={{ color: FB.green }}>{' '}+${creditInfo.purse} purse{creditInfo.interest > 0 ? ` + $${creditInfo.interest} interest` : ''}.</span>
        )}
      </div>

      <div style={{ ...card(12), padding: '12px 14px', marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', borderLeft: `4px solid ${coachId.primary}` }}>
        <CoachPortrait team={run.team} size={46} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: FB.text }}>{coachId.coachName}</div>
          <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.4, marginTop: 3 }}>{coachAdvice}</div>
        </div>
      </div>

      <div style={{ ...card(12), padding: '12px 14px', marginTop: 10, borderColor: identity.level >= 2 ? '#5a4112' : FB.border }}>
        <div style={{ ...sectionLabel, marginBottom: 5 }}>Current build</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, color: identity.level >= 2 ? FB.gold : FB.text, fontWeight: 900 }}>{identity.title}</div>
            <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.35, marginTop: 3 }}>{identity.detail}</div>
          </div>
          <span style={{ flexShrink: 0, fontSize: 10, color: identity.level >= 2 ? FB.gold : FB.green, background: identity.level >= 2 ? FB.goldSoft : FB.greenSoft, border: `1px solid ${identity.level >= 2 ? '#5a4112' : '#1f6b44'}`, borderRadius: 999, padding: '4px 8px', fontWeight: 900 }}>{identity.tag}</span>
        </div>
      </div>

      <div style={{ ...card(12), padding: '12px 14px', marginTop: 10, background: '#10131a', borderColor: nextBossScheme === 'balanced' ? FB.border : '#4a2530' }}>
        <div style={{ ...sectionLabel, marginBottom: 6, color: FB.gold }}>Next scout</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: FB.textFaint, fontWeight: 800 }}>DEFENSE</div>
            <div style={{ fontSize: 15, color: nextBossScheme === 'balanced' ? FB.text : FB.red, fontWeight: 900, marginTop: 2 }}>{nextBoss.label}</div>
            <div style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.35, marginTop: 3 }}>{nextBoss.hint}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: FB.textFaint, fontWeight: 800 }}>WEATHER</div>
            <div style={{ fontSize: 15, color: FB.text, fontWeight: 900, marginTop: 2 }}>{nextEnv.label}</div>
            <div style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.35, marginTop: 3 }}>{nextEnv.description}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 2px 8px' }}>
        <div style={sectionLabel}>On the board</div>
        <button onClick={onReroll} disabled={!canReroll} style={{ ...btnGhost, opacity: canReroll ? 1 : 0.4, color: canReroll ? FB.gold : FB.textFaint }}>
          ↻ Reroll · ${rerollCost}
        </button>
      </div>
      {purchaseLimitReached && (
        <div style={{ fontSize: 11, color: FB.gold, margin: '-2px 2px 8px' }}>
          War Room limit reached. Head to the next game or keep your remaining Funds.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rewards.length === 0 && (
          <div style={{ ...card(12), padding: '16px 14px', textAlign: 'center', color: FB.textDim, fontSize: 12.5 }}>
            Shelf cleared. Reroll for more, or head to the next game.
          </div>
        )}
        {rewards.map((rw) => {
          const affordable = run.funds >= rw.cost && !purchaseLimitReached;
          const lane = rewardDecisionLane(run, rw, nextBossScheme);
          const laneStyle = LANE_STYLE[lane];
          return (
            <button
              key={rw.id}
              onClick={() => affordable && onBuy(rw)}
              disabled={!affordable}
              style={{ ...card(14), padding: '14px 14px', cursor: affordable ? 'pointer' : 'not-allowed', textAlign: 'left', display: 'flex', gap: 13, alignItems: 'center', borderLeft: `4px solid ${laneStyle.color}`, opacity: affordable ? 1 : 0.55 }}
            >
              <span style={{ fontSize: 26 }}>{rw.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: FB.text }}>{rw.title}</div>
                  <span style={{ fontSize: 9.5, fontWeight: 900, color: laneStyle.color, background: laneStyle.bg, border: `1px solid ${laneStyle.color}66`, borderRadius: 999, padding: '2px 7px' }}>{lane}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 900, color: KIND_COLOR[rw.kind], background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 999, padding: '2px 7px' }}>{rewardFitLabel(run, rw)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: laneStyle.color, lineHeight: 1.35, marginTop: 3, fontWeight: 800 }}>{laneStyle.copy}</div>
                <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.4, marginTop: 2 }}>{rw.detail}</div>
                <div style={{ fontSize: 12.5, color: FB.gold, lineHeight: 1.35, marginTop: 7, fontWeight: 800 }}>{rewardImpact(run, rw, nextBossScheme)}</div>
              </div>
              <span className="fb-num" style={{ flexShrink: 0, fontSize: 15, fontWeight: 900, color: affordable ? FB.gold : FB.red, background: affordable ? FB.goldSoft : '#2a141a', border: `1px solid ${affordable ? '#5a4112' : '#6b3344'}`, borderRadius: 8, padding: '5px 9px' }}>${rw.cost}</span>
            </button>
          );
        })}
        {purchases === 0 && (
          <button
            onClick={onProceed}
            style={{ ...card(14), padding: '13px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: '#5a4112', background: 'linear-gradient(160deg,#17170d,#0e151d)' }}
          >
            <div>
              <div style={{ fontSize: 10, color: FB.gold, letterSpacing: 1.1, fontWeight: 900 }}>BANK VISIT</div>
              <div style={{ fontSize: 13, color: FB.text, fontWeight: 800, marginTop: 2 }}>Skip buys and save for later</div>
              <div style={{ fontSize: 11.5, color: FB.textDim, marginTop: 2 }}>Adds ${SKIP_REWARD} Funds, then advances to the next game.</div>
            </div>
            <span className="fb-num" style={{ fontSize: 17, fontWeight: 900, color: FB.gold }}>+${SKIP_REWARD}</span>
          </button>
        )}
      </div>

      {purchases > 0 && (
        <button onClick={onProceed} style={{ ...btnPrimary, width: '100%', marginTop: 18 }}>
          Next Game →
        </button>
      )}

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
        {trained.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {trained.map((c) => {
              const m = FB_CARD_MODIFIERS[c.modifier!];
              return (
                <span key={c.id} style={{ fontSize: 10, fontWeight: 800, color: m.color, background: FB.inset, border: `1px solid ${m.color}44`, borderRadius: 7, padding: '4px 8px' }}>
                  {c.label} · {m.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function rewardDecisionLane(run: FbRunState, reward: Reward, bossScheme: FbBossSchemeKey): DecisionLane {
  const fit = rewardFitLabel(run, reward);
  if (bossScheme !== 'balanced' && rewardCountersBoss(reward, bossScheme)) return 'Counter';
  if (fit === 'Starts side plan') return 'Risk';
  if (fit === 'Feeds current plan' || reward.kind === 'coordinator' || reward.kind === 'playbook') return 'Engine';
  if (reward.kind === 'trim' || reward.kind === 'training') return 'Consistency';
  return 'Value';
}

// UI-only heuristic that flags rewards which answer the next boss, so the War
// Room can surface a "Counter" lane. The engine owns scoring; this is just a
// presentation hint, so it fails safe — an unknown id simply falls through to
// another lane rather than crashing. Keep the matchup ids in this one table so
// they are auditable in a single place if reward ids ever drift.
const BOSS_COUNTER_IDS: Partial<Record<FbBossSchemeKey, readonly string[]>> = {
  no_fly_zone: ['pb-stack_td', 'pb-checkdown', 'pb-ground_pound', 'coord-west_coast', 'coord-bell_cow', 'coord-salary_wizard', 'card-bell_rb', 'card-value_slot'],
  stacked_box: ['pb-stack_td', 'pb-double_stack_bomb', 'pb-checkdown', 'coord-air_raid', 'coord-franchise_qb', 'coord-west_coast', 'card-gunslinger', 'card-deep_wr', 'card-value_slot'],
  turnover_drill: ['pb-stack_td', 'pb-ground_pound', 'pb-checkdown', 'coord-air_raid', 'coord-bell_cow', 'coord-west_coast', 'coord-salary_wizard', 'card-gunslinger', 'card-bell_rb', 'card-value_slot'],
};

function rewardCountersBoss(reward: Reward, bossScheme: FbBossSchemeKey): boolean {
  // Adaptive defenses punish a one-note deck, so any breadth (new card/trim/plan) helps.
  if (bossScheme === 'adaptive_dc') {
    return reward.kind === 'card' || reward.kind === 'trim' || reward.kind === 'playbook';
  }
  return BOSS_COUNTER_IDS[bossScheme]?.includes(reward.id) ?? false;
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 16, fontWeight: 900, color: FB.text }}>{value}</div>
      <div style={{ fontSize: 9, color: FB.textFaint, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}
