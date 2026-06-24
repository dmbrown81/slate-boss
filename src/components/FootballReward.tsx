import { useState } from 'react';
import { FB, SIDE, card, sectionLabel, btnPrimary, btnGhost } from './footballStyles';
import {
  FB_BOSS_SCHEMES, FB_COORDINATORS, FB_CONCEPT_LABEL, FB_ENVIRONMENTS, FB_CARD_MODIFIERS,
  type FbBossSchemeKey, type FbEnvironmentKey,
} from '../lib/footballRogue';
import { buildIdentity, deckValueSummary, filmToolTargets, rewardFitLabel, rewardImpact, FRONT_OFFICE, SEASON_GAMES, type FbRunState, type Reward, type FilmTool, type FrontOfficeUpgrade } from '../lib/footballRun';
import { MAX_WAR_ROOM_PURCHASES, SKIP_REWARD, type ShopCreditInfo } from '../lib/gridironEconomy';
import { rewardTaxonomy, filmToolRarity, frontOfficeRarity, RARITY_META, type FbRarity } from '../lib/gridironTaxonomy';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';

interface Props {
  run: FbRunState;
  rewards: Reward[];
  filmRoom: FilmTool[];
  frontOfficeOffer: FrontOfficeUpgrade | null;
  creditInfo: ShopCreditInfo | null;
  rerollCost: number;
  purchases: number;
  nextBossScheme: FbBossSchemeKey;
  nextEnvironment: FbEnvironmentKey;
  onBuy: (reward: Reward) => void;
  onBuyFilm: (tool: FilmTool, targetId?: string) => void;
  onBuyFrontOffice: (up: FrontOfficeUpgrade) => void;
  onReroll: () => void;
  onProceed: () => void;
}

const KIND_COLOR: Record<Reward['kind'], string> = {
  card: FB.green, coordinator: '#b7a7ff', playbook: FB.blue, trim: FB.red, upgrade: FB.gold, training: '#5fe0a0',
};

type DecisionLane = 'Engine' | 'Counter' | 'Consistency' | 'Value' | 'Risk';

const LANE_STYLE: Record<DecisionLane, { color: string; bg: string; copy: string; glyph: string }> = {
  Engine: { color: FB.blue, bg: '#0b1b32', copy: 'Builds your scaling plan', glyph: 'ENG' },
  Counter: { color: FB.red, bg: '#2a1118', copy: 'Answers the next defense', glyph: 'CNT' },
  Consistency: { color: FB.green, bg: FB.greenSoft, copy: 'Improves draw quality', glyph: 'CON' },
  Value: { color: FB.gold, bg: FB.goldSoft, copy: 'Raises your floor now', glyph: '$' },
  Risk: { color: '#b7a7ff', bg: '#140f24', copy: 'Adds a side lane', glyph: '?' },
};

export default function FootballReward({ run, rewards, filmRoom, frontOfficeOffer, creditInfo, rerollCost, purchases, nextBossScheme, nextEnvironment, onBuy, onBuyFilm, onBuyFrontOffice, onReroll, onProceed }: Props) {
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
  const [detail, setDetail] = useState<Reward | null>(null);
  const [filmDetail, setFilmDetail] = useState<FilmTool | null>(null);
  const detailAffordable = detail ? run.funds >= detail.cost && !purchaseLimitReached : false;

  function buyFromSheet(reward: Reward) {
    onBuy(reward);
    setDetail(null);
  }

  return (
    <div style={{ minHeight: '100svh', padding: '20px 16px 28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: FB.green, letterSpacing: 2, fontWeight: 800 }}>GAME CLEARED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: FB.text, marginTop: 2 }}>War Room</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="fb-num" style={{ fontSize: 26, fontWeight: 900, color: FB.gold, lineHeight: 1 }}>${run.funds}</div>
          <div style={{ fontSize: 11, color: FB.textFaint, fontWeight: 800, letterSpacing: 1 }}>FUNDS</div>
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
          <span style={{ flexShrink: 0, fontSize: 11, color: identity.level >= 2 ? FB.gold : FB.green, background: identity.level >= 2 ? FB.goldSoft : FB.greenSoft, border: `1px solid ${identity.level >= 2 ? '#5a4112' : '#1f6b44'}`, borderRadius: 999, padding: '4px 8px', fontWeight: 900 }}>{identity.tag}</span>
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

      {rewards.length === 0 ? (
        <div style={{ ...card(12), padding: '16px 14px', textAlign: 'center', color: FB.textDim, fontSize: 12.5 }}>
          Shelf cleared. Reroll for more, or head to the next game.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {rewards.map((rw) => (
            <RewardCard
              key={rw.id}
              reward={rw}
              run={run}
              nextBossScheme={nextBossScheme}
              affordable={run.funds >= rw.cost && !purchaseLimitReached}
              onPick={() => setDetail(rw)}
            />
          ))}
        </div>
      )}

      {/* Film Room — one-use deck mutations (Tarot analog), own budget. */}
      {filmRoom.length > 0 && (
        <>
          <div style={{ ...sectionLabel, margin: '16px 2px 8px', color: '#5fe0a0' }}>🎞️ Film Room · develop your deck</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {filmRoom.map((tool) => (
              <FilmToolCard key={tool.key} tool={tool} affordable={run.funds >= tool.cost} onPick={() => setFilmDetail(tool)} />
            ))}
          </div>
        </>
      )}

      {/* Front Office — a rare run-persistent rule upgrade (Voucher analog). */}
      {frontOfficeOffer && (
        <FrontOfficeCard
          offer={frontOfficeOffer}
          affordable={run.funds >= frontOfficeOffer.cost}
          onBuy={() => onBuyFrontOffice(frontOfficeOffer)}
        />
      )}

      {purchases === 0 && (
        <button
          onClick={onProceed}
          style={{ ...card(14), padding: '13px 14px', marginTop: 10, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: '#5a4112', background: 'linear-gradient(160deg,#17170d,#0e151d)' }}
        >
          <div>
            <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.1, fontWeight: 900 }}>BANK VISIT</div>
            <div style={{ fontSize: 13, color: FB.text, fontWeight: 800, marginTop: 2 }}>Skip buys and save for later</div>
            <div style={{ fontSize: 11.5, color: FB.textDim, marginTop: 2 }}>Adds ${SKIP_REWARD} Funds, then advances to the next game.</div>
          </div>
          <span className="fb-num" style={{ fontSize: 17, fontWeight: 900, color: FB.gold }}>+${SKIP_REWARD}</span>
        </button>
      )}

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
            <span key={k} style={{ fontSize: 11, fontWeight: 800, color: '#b7a7ff', background: '#140f24', border: '1px solid #2a2440', borderRadius: 7, padding: '4px 8px' }}>{FB_COORDINATORS[k].name}</span>
          ))}
          {(Object.entries(run.playbook) as [string, number][]).filter(([, l]) => l > 0).map(([c, l]) => (
            <span key={c} style={{ fontSize: 11, fontWeight: 800, color: '#5fe0a0', background: '#0c2419', border: '1px solid #1f6b44', borderRadius: 7, padding: '4px 8px' }}>
              {FB_CONCEPT_LABEL[c as keyof typeof FB_CONCEPT_LABEL] ?? c} <span style={{ color: FB.gold }}>Lv{l}</span>
            </span>
          ))}
        </div>
        {trained.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {trained.map((c) => {
              const m = FB_CARD_MODIFIERS[c.modifier!];
              return (
                <span key={c.id} style={{ fontSize: 11, fontWeight: 800, color: m.color, background: FB.inset, border: `1px solid ${m.color}44`, borderRadius: 7, padding: '4px 8px' }}>
                  {c.label} · {m.label}
                </span>
              );
            })}
          </div>
        )}
        {run.upgrades.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {run.upgrades.map((k) => (
              <span key={k} style={{ fontSize: 11, fontWeight: 800, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 7, padding: '4px 8px' }}>
                {FRONT_OFFICE[k].emoji} {FRONT_OFFICE[k].name}
              </span>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <RewardSheet
          reward={detail}
          run={run}
          nextBossScheme={nextBossScheme}
          affordable={detailAffordable}
          purchaseLimitReached={purchaseLimitReached}
          onBuy={buyFromSheet}
          onClose={() => setDetail(null)}
        />
      )}

      {filmDetail && (
        <FilmSheet
          tool={filmDetail}
          run={run}
          affordable={run.funds >= filmDetail.cost}
          onBuy={(targetId) => { onBuyFilm(filmDetail, targetId); setFilmDetail(null); }}
          onClose={() => setFilmDetail(null)}
        />
      )}
    </div>
  );
}

// A draft card: emoji hero, lane-glow tier badge, name, fat price strip.
// Tapping inspects (opens the sheet); buying is the second, deliberate tap.
function RewardCard({ reward, run, nextBossScheme, affordable, onPick }: {
  reward: Reward; run: FbRunState; nextBossScheme: FbBossSchemeKey; affordable: boolean; onPick: () => void;
}) {
  const lane = rewardDecisionLane(run, reward, nextBossScheme);
  const laneStyle = LANE_STYLE[lane];
  const fit = rewardFitLabel(run, reward);
  const tax = rewardTaxonomy(reward);
  const glow = lane === 'Counter' || fit === 'Feeds current plan';
  const callout = lane === 'Counter' ? 'Counters next defense' : fit === 'Feeds current plan' ? 'Best fit' : '';
  return (
    <button
      onClick={onPick}
      aria-label={`Inspect ${lane} reward, ${reward.title}, cost ${reward.cost}${affordable ? '' : ', unaffordable'}`}
      style={{
        ...card(12), position: 'relative', padding: '11px 8px 0', cursor: 'pointer', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minHeight: 152, overflow: 'hidden',
        borderTop: `3px solid ${laneStyle.color}`, opacity: affordable ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }}>{reward.emoji}</span>
      <span style={{
        fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: laneStyle.color, background: laneStyle.bg,
        border: `1px solid ${laneStyle.color}66`, borderRadius: 999, padding: '2px 7px',
        boxShadow: glow ? `0 0 10px -2px ${laneStyle.color}` : undefined,
      }}>{laneStyle.glyph} · {lane.toUpperCase()}</span>
      <RarityChip rarity={tax.rarity} compact />
      {callout && (
        <span style={{ fontSize: 11, fontWeight: 900, color: FB.text, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 999, padding: '2px 7px' }}>
          {callout}
        </span>
      )}
      <div style={{ fontSize: 11, fontWeight: 800, color: FB.text, lineHeight: 1.2 }}>{reward.title}</div>
      <div style={{ flex: 1 }} />
      <div className="fb-num" style={{
        width: '100%', margin: '0 -8px', padding: '7px 0', fontSize: 13, fontWeight: 900,
        color: affordable ? '#1a1206' : FB.red, background: affordable ? 'linear-gradient(180deg,#f7c544,#e6a519)' : '#2a141a',
      }}>{affordable ? '$' : '🔒 $'}{reward.cost}</div>
    </button>
  );
}

// Two-tap commit: the inspected card opens here; Buy lives inside the sheet.
function RewardSheet({ reward, run, nextBossScheme, affordable, purchaseLimitReached, onBuy, onClose }: {
  reward: Reward; run: FbRunState; nextBossScheme: FbBossSchemeKey; affordable: boolean; purchaseLimitReached: boolean;
  onBuy: (reward: Reward) => void; onClose: () => void;
}) {
  const lane = rewardDecisionLane(run, reward, nextBossScheme);
  const laneStyle = LANE_STYLE[lane];
  const tax = rewardTaxonomy(reward);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(6,9,13,0.66)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="fb-rise" style={{ width: '100%', maxWidth: 480, background: FB.panel, borderTop: `3px solid ${laneStyle.color}`, borderRadius: '16px 16px 0 0', padding: '16px 16px 22px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 30 }}>{reward.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: FB.text }}>{reward.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <RarityChip rarity={tax.rarity} category={tax.category} />
              <span style={{ fontSize: 11, fontWeight: 900, color: laneStyle.color, background: laneStyle.bg, border: `1px solid ${laneStyle.color}66`, borderRadius: 999, padding: '2px 7px' }}>{laneStyle.glyph} · {lane}</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: KIND_COLOR[reward.kind], background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 999, padding: '2px 7px' }}>{rewardFitLabel(run, reward)}</span>
            </div>
          </div>
          <span className="fb-num" style={{ flexShrink: 0, fontSize: 16, fontWeight: 900, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 8, padding: '6px 10px' }}>${reward.cost}</span>
        </div>
        <div style={{ fontSize: 11.5, color: laneStyle.color, fontWeight: 800, marginTop: 12 }}>{laneStyle.glyph} · {laneStyle.copy}</div>
        <div style={{ fontSize: 12.5, color: FB.textDim, lineHeight: 1.45, marginTop: 4 }}>{reward.detail}</div>
        <div style={{ fontSize: 12.5, color: FB.gold, lineHeight: 1.4, marginTop: 8, fontWeight: 800 }}>{rewardImpact(run, reward, nextBossScheme)}</div>
        <button
          onClick={() => affordable && onBuy(reward)}
          disabled={!affordable}
          style={{ ...btnPrimary, width: '100%', marginTop: 16, ...(affordable ? {} : { background: '#1a2330', color: FB.textFaint, boxShadow: 'none', cursor: 'not-allowed' }) }}
        >
          {affordable ? `Buy · $${reward.cost}` : purchaseLimitReached ? 'War Room limit reached' : 'Not enough Funds'}
        </button>
        <button onClick={onClose} style={{ ...btnGhost, width: '100%', marginTop: 8, padding: '11px 0' }}>Keep looking</button>
      </div>
    </div>
  );
}

// A compact Film Tool card (2-up). Green accent = the "develop your deck" lane.
function FilmToolCard({ tool, affordable, onPick }: { tool: FilmTool; affordable: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      aria-label={`Inspect Film Tool ${tool.name}, cost ${tool.cost}${affordable ? '' : ', unaffordable'}`}
      style={{
        ...card(12), position: 'relative', padding: '11px 10px 0', cursor: 'pointer', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minHeight: 150, overflow: 'hidden',
        borderTop: '3px solid #5fe0a0', opacity: affordable ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{tool.emoji}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <RarityChip rarity={filmToolRarity(tool.key)} compact />
        {tool.risky && <span style={{ fontSize: 11, fontWeight: 900, color: FB.red, background: '#2a1118', border: `1px solid ${FB.red}66`, borderRadius: 999, padding: '1px 6px' }}>TRICK PLAY</span>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, color: FB.text, lineHeight: 1.2 }}>{tool.name}</div>
      <div style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.3 }}>{tool.detail}</div>
      <div style={{ flex: 1 }} />
      <div className="fb-num" style={{
        width: '100%', margin: '0 -10px', padding: '7px 0', fontSize: 13, fontWeight: 900,
        color: affordable ? '#08130d' : FB.red, background: affordable ? 'linear-gradient(180deg,#52d48f,#2aa85e)' : '#15231b',
      }}>{affordable ? '$' : '🔒 $'}{tool.cost}</div>
    </button>
  );
}

// The Front Office offer — a rare, run-persistent rule upgrade. Full-width + gold
// so it reads as special (it isn't a per-game buy; it changes the run).
function FrontOfficeCard({ offer, affordable, onBuy }: { offer: FrontOfficeUpgrade; affordable: boolean; onBuy: () => void }) {
  return (
    <div style={{ ...card(14), padding: '12px 14px', marginTop: 10, borderColor: '#5a4112', background: 'linear-gradient(160deg,#1b160a,#0e151d)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.1, fontWeight: 900 }}>🏢 FRONT OFFICE · run upgrade</div>
        <span className="fb-num" style={{ fontSize: 14, fontWeight: 900, color: FB.gold }}>${offer.cost}</span>
      </div>
      <div style={{ marginTop: 6 }}><RarityChip rarity={frontOfficeRarity(offer.key)} category="Front Office" /></div>
      <div style={{ fontSize: 14, fontWeight: 900, color: FB.text, marginTop: 4 }}>{offer.emoji} {offer.name}</div>
      <div style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.4, marginTop: 2 }}>{offer.detail}</div>
      <button
        onClick={onBuy}
        disabled={!affordable}
        style={{ ...btnPrimary, width: '100%', marginTop: 10, ...(affordable ? {} : { background: '#1a2330', color: FB.textFaint, boxShadow: 'none', cursor: 'not-allowed' }) }}
      >
        {affordable ? `Install · $${offer.cost}` : 'Not enough Funds'}
      </button>
    </div>
  );
}

// Bottom sheet to inspect + (optionally) target a Film Tool, then commit.
function FilmSheet({ tool, run, affordable, onBuy, onClose }: {
  tool: FilmTool; run: FbRunState; affordable: boolean; onBuy: (targetId?: string) => void; onClose: () => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const targets = filmToolTargets(run, tool);
  const needsTarget = tool.targeted;
  const ready = affordable && (!needsTarget || Boolean(targetId));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(6,9,13,0.66)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="fb-rise" style={{ width: '100%', maxWidth: 480, background: FB.panel, borderTop: '3px solid #5fe0a0', borderRadius: '16px 16px 0 0', padding: '16px 16px 22px', maxHeight: '82vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 30 }}>{tool.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: FB.text }}>{tool.name}</div>
            <div style={{ fontSize: 11.5, color: '#5fe0a0', fontWeight: 800, marginTop: 2 }}>Film Tool · one use</div>
          </div>
          <span className="fb-num" style={{ flexShrink: 0, fontSize: 16, fontWeight: 900, color: FB.gold, background: FB.goldSoft, border: '1px solid #5a4112', borderRadius: 8, padding: '6px 10px' }}>${tool.cost}</span>
        </div>
        <div style={{ fontSize: 12.5, color: FB.textDim, lineHeight: 1.45, marginTop: 10 }}>{tool.detail}</div>
        {needsTarget && (
          <>
            <div style={{ ...sectionLabel, margin: '13px 0 7px' }}>{targets.length ? 'Choose a card to develop' : 'No eligible card in your deck'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {targets.map((c) => {
                const sel = c.id === targetId;
                const s = SIDE[c.side];
                return (
                  <button key={c.id} onClick={() => setTargetId(c.id)} aria-label={`Target ${c.label}, ${c.position}, ${c.value} value`} style={{ background: sel ? s.grad : FB.panelSoft, border: `1.5px solid ${sel ? s.border : FB.borderSoft}`, borderRadius: 9, padding: '7px 6px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: s.text }}>{c.position}</span>
                      <span className="fb-num" style={{ fontSize: 11, fontWeight: 900, color: FB.gold }}>${c.cost}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: s.text, marginTop: 3, lineHeight: 1.05 }}>{c.label}</div>
                    <div className="fb-num" style={{ fontSize: 14, fontWeight: 900, color: FB.text }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: FB.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.modifier ? FB_CARD_MODIFIERS[c.modifier].label : c.playerName}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button
          onClick={() => ready && onBuy(needsTarget ? targetId ?? undefined : undefined)}
          disabled={!ready}
          style={{ ...btnPrimary, width: '100%', marginTop: 14, ...(ready ? {} : { background: '#1a2330', color: FB.textFaint, boxShadow: 'none', cursor: 'not-allowed' }) }}
        >
          {!affordable ? 'Not enough Funds' : needsTarget && !targetId ? 'Pick a card first' : `Use · $${tool.cost}`}
        </button>
        <button onClick={onClose} style={{ ...btnGhost, width: '100%', marginTop: 8, padding: '11px 0' }}>Keep looking</button>
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

// Rarity-as-label chip (Common/Uncommon/Rare/Legendary). Descriptive only — it
// reflects current strength, it does not grant power. `category` rides along so a
// cold player can name what kind of thing this reward is.
function RarityChip({ rarity, category, compact }: { rarity: FbRarity; category?: string; compact?: boolean }) {
  const m = RARITY_META[rarity];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 900, letterSpacing: 0.4, color: m.color, background: m.bg, border: `1px solid ${m.border}`, borderRadius: 999, padding: compact ? '1px 6px' : '2px 7px' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.color }} />
      {m.label.toUpperCase()}{category ? ` · ${category}` : ''}
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: FB.inset, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '6px 0', textAlign: 'center' }}>
      <div className="fb-num" style={{ fontSize: 16, fontWeight: 900, color: FB.text }}>{value}</div>
      <div style={{ fontSize: 11, color: FB.textFaint, fontWeight: 700 }}>{label.toUpperCase()}</div>
    </div>
  );
}
