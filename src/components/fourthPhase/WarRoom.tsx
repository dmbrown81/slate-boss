import {
  FP as FB,
  FP_RADIUS,
  FP_STOCK,
  FP_WOOD,
  btnGhost,
  card,
  foilFace,
  sectionLabel,
  statTile,
  stockFace,
} from './fourthPhaseStyles';
import { Metric } from './fpShared';
import {
  FOURTH_PHASE_WAR_ROOM_BUY_LIMIT,
  FOURTH_PHASE_WAR_ROOM_REROLL_COST,
  FOURTH_PHASE_DRIVE_ACT_LABEL,
  PHASE_COLOR,
  PHASE_SHORT,
  cardContributionLabel,
  discountedOfferCost,
  fourthPhaseDeckPhaseCounts,
  jokerDefinition,
  type CoachPick,
  type FourthPhaseBossProfile,
  type FourthPhaseCard,
  type FourthPhaseJokerState,
  type FourthPhaseWarRoomOffer,
} from '../../lib/fourthPhase';

// The between-drives draft table. Pure presentation: money math, offer
// generation, and the buy/replace/reroll/skip flows live in the Lab handlers.
export function WarRoom({
  money,
  discounts,
  draft,
  jokers,
  deck,
  pendingDraft,
  buysThisWarRoom,
  nextDriveNumber,
  nextTarget,
  nextBoss,
  coachLine,
  onDraft,
  onReplace,
  onReplaceCard,
  onCancelReplace,
  onReroll,
  onSkip,
  coachPick,
}: {
  money: number;
  discounts: number;
  draft: FourthPhaseWarRoomOffer[];
  jokers: FourthPhaseJokerState[];
  deck: FourthPhaseCard[];
  pendingDraft?: FourthPhaseWarRoomOffer;
  buysThisWarRoom: number;
  nextDriveNumber: number;
  nextTarget: number;
  nextBoss: FourthPhaseBossProfile | null;
  /** The coach naming the next drive's problem before the offers appear. */
  coachLine: string;
  onDraft: (offer: FourthPhaseWarRoomOffer) => void;
  onReplace: (index: number) => void;
  onReplaceCard: (cardId: string) => void;
  onCancelReplace: () => void;
  onReroll: () => void;
  onSkip: () => void;
  coachPick: CoachPick | null;
}) {
  const deckCounts = fourthPhaseDeckPhaseCounts(deck);
  if (pendingDraft) {
    if (pendingDraft.card) {
      const incoming = pendingDraft.card;
      return (
        <section className="fp-grain" style={{ ...card(), padding: 12, marginTop: 10, borderColor: FP_WOOD.edge, background: FP_WOOD.table }}>
          <div style={{ ...sectionLabel, color: FB.gold }}>Game plan full</div>
          <div style={{ fontSize: 15, color: FB.text, fontWeight: 950, marginTop: 3 }}>Cut one for {incoming.roleName}</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>
            Keep the active deck at 30. The reserve insert takes the slot you choose.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
            {deck.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => onReplaceCard(candidate.id)}
                style={{
                  borderRadius: FP_RADIUS.card,
                  border: `1px solid ${PHASE_COLOR[candidate.phase]}`,
                  background: FB.panelRaised,
                  color: FB.text,
                  padding: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 950 }}>{candidate.roleName}</span>
                  <span style={{ fontSize: 9, color: PHASE_COLOR[candidate.phase], fontWeight: 950 }}>{PHASE_SHORT[candidate.phase]}</span>
                </div>
                <div style={{ fontSize: 9.5, color: FB.textFaint, marginTop: 3 }}>{cardContributionLabel(candidate)} · cut</div>
              </button>
            ))}
          </div>
          <button onClick={onCancelReplace} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>Keep my game plan (cancel)</button>
        </section>
      );
    }
    const incoming = pendingDraft.joker ? jokerDefinition(pendingDraft.joker) : null;
    if (!incoming) return null;
    return (
      <section className="fp-grain" style={{ ...card(), padding: 12, marginTop: 10, borderColor: FP_WOOD.edge, background: FP_WOOD.table }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Sideline full</div>
        <div style={{ fontSize: 15, color: FB.text, fontWeight: 950, marginTop: 3 }}>Release one for {incoming.name}</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>The new joker takes the slot you pick.</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {jokers.map((joker, index) => {
            const def = jokerDefinition(joker);
            return (
              <button
                key={joker.id}
                onClick={() => onReplace(index)}
                style={{
                  borderRadius: FP_RADIUS.card,
                  border: `1px solid ${FB.red}`,
                  background: FB.panelRaised,
                  color: FB.text,
                  padding: 10,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 950 }}>Slot {index + 1}: {def.name}</span>
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
  const orderedDraft = coachPick
    ? [...draft].sort((a, b) => Number(b.id === coachPick.id) - Number(a.id === coachPick.id))
    : draft;
  return (
    <section className="fp-grain" style={{ ...card(), padding: 12, marginTop: 10, borderColor: FP_WOOD.edge, background: FP_WOOD.table, boxShadow: 'inset 0 1px 0 rgba(255,226,166,0.07)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
        <div>
          <div style={{ ...sectionLabel, color: FB.gold }}>War Room</div>
          <div style={{ fontSize: 14, color: FB.text, fontWeight: 950, marginTop: 2 }}>
            Drive {nextDriveNumber - 1} cleared. Adjustments for Drive {nextDriveNumber}.
          </div>
          <div style={{ fontSize: 11, color: FB.textDim, fontWeight: 800, marginTop: 3 }}>
            Install up to {FOURTH_PHASE_WAR_ROOM_BUY_LIMIT} adjustments, or save the cap.
          </div>
        </div>
        <div style={{ ...statTile, textAlign: 'right', minWidth: 84 }}>
          <div style={{ ...sectionLabel, fontSize: 9.5 }}>Cash</div>
          <div className="fb-led" style={{ color: FB.gold, fontSize: 22, fontWeight: 950, lineHeight: 1 }}>${money}</div>
        </div>
      </div>

      {/* The coach speaks first: the next drive's problem, in his voice. The
          offers below are answers to this line, not shelf items. */}
      <div style={{ borderLeft: `3px solid ${FB.gold}`, background: 'rgba(242,189,61,0.06)', borderRadius: '0 8px 8px 0', padding: '9px 11px', marginTop: 10 }}>
        <div style={{ fontSize: 12, color: FB.text, fontWeight: 850, lineHeight: 1.45, fontStyle: 'italic' }}>
          {'“'}{coachLine}{'”'}
        </div>
        <div style={{ fontSize: 10, color: FB.textFaint, fontWeight: 900, marginTop: 4, letterSpacing: 1 }}>— COACH</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
        <Metric label="Next goal" value={`${nextTarget}`} color={FB.text} />
        <Metric label="Installs" value={`${buysThisWarRoom}/${FOURTH_PHASE_WAR_ROOM_BUY_LIMIT}`} color={FB.gold} />
        <Metric label="Game plan" value={`${deck.length}/30`} color="#5fb4ff" />
      </div>
      <details style={{ border: `1px solid ${FB.border}`, borderRadius: FP_RADIUS.card, background: FB.panelRaised, marginTop: 8, textAlign: 'left' }}>
        <summary style={{ cursor: 'pointer', padding: '8px 9px', color: FB.textDim, fontSize: 10.5, fontWeight: 900 }}>
          Review game plan · OFF {deckCounts.offense} · DEF {deckCounts.defense} · ST {deckCounts.specialTeams} · CRD {deckCounts.crowd}
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, maxHeight: 230, overflowY: 'auto', padding: '0 8px 8px' }}>
          {[...deck].sort((a, b) => a.phase.localeCompare(b.phase) || b.value - a.value).map((gamePlanCard) => (
            <div key={gamePlanCard.id} style={{ borderLeft: `2px solid ${PHASE_COLOR[gamePlanCard.phase]}`, background: FB.panel, borderRadius: 5, padding: '5px 6px', minWidth: 0 }}>
              <div style={{ fontSize: 9.5, color: FB.text, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gamePlanCard.roleName}{gamePlanCard.installed ? ' ★' : ''}
              </div>
              <div style={{ fontSize: 7.5, color: FB.textFaint, fontWeight: 850, marginTop: 2 }}>
                {PHASE_SHORT[gamePlanCard.phase]} · {FOURTH_PHASE_DRIVE_ACT_LABEL[gamePlanCard.driveAct].toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </details>
      {nextBoss && (
        <div style={{ border: `1px solid rgba(240,117,138,0.55)`, borderRadius: FP_RADIUS.card, background: 'rgba(240,117,138,0.08)', padding: '8px 9px', marginTop: 8 }}>
          <div style={{ ...sectionLabel, color: FB.red }}>Next boss</div>
          <div style={{ color: '#ff9aac', fontSize: 11.5, fontWeight: 900, marginTop: 2 }}>{nextBoss.name}: {nextBoss.effect}</div>
        </div>
      )}
      {discounts > 0 && (
        <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: FP_RADIUS.card, color: FB.gold, background: 'rgba(242,189,61,0.07)', padding: '7px 9px', fontSize: 10.5, fontWeight: 850, marginTop: 8 }}>
          Special Teams discount: -$1 per token on an offer ({discounts} banked, max -$2 each)
        </div>
      )}
      <div style={{ display: 'grid', gap: 9, marginTop: 10 }}>
        {orderedDraft.map((offer, offerIndex) => {
          const def = offer.joker ? jokerDefinition(offer.joker) : null;
          const { cost: effectiveCost, used } = discountedOfferCost(offer.cost, discounts);
          const affordable = money >= effectiveCost;
          const isCoachPick = coachPick?.id === offer.id;
          const isPractice = offer.kind === 'practice';
          const isCard = offer.kind === 'card';
          // Jokers are premium inserts on card stock; practice drills are the
          // coach's note cards. Rarity shows as the left accent stripe.
          const stripe = def?.rarity === 'legendary'
            ? FB.gold
            : def?.rarity === 'rare'
              ? '#7a5fc0'
              : isPractice
                ? '#8a8156'
                : offer.card
                  ? PHASE_COLOR[offer.card.phase]
                  : FP_STOCK.line;
          return (
            <button
              key={offer.id}
              onClick={() => onDraft(offer)}
              disabled={!affordable}
              className="fp-grain"
              style={{
                ...(def?.rarity === 'legendary' ? foilFace() : stockFace()),
                ...(isPractice ? { background: '#efe4b8' } : null),
                borderColor: def?.rarity === 'legendary' ? 'transparent' : isCoachPick ? FB.gold : isPractice ? '#cfc08a' : FP_STOCK.line,
                padding: 10,
                textAlign: 'left',
                cursor: affordable ? 'pointer' : 'not-allowed',
                opacity: affordable ? 1 : 0.55,
                transform: isPractice ? `rotate(${offerIndex % 2 === 0 ? -0.4 : 0.4}deg)` : undefined,
                boxShadow: isCoachPick
                  ? `inset 3px 0 0 ${stripe}, 0 0 0 2px rgba(217,164,65,0.5), 0 4px 10px -6px rgba(0,0,0,0.6)`
                  : `inset 3px 0 0 ${stripe}, 0 4px 10px -6px rgba(0,0,0,0.6)`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                <span className="fp-head" style={{ fontSize: 13.5, fontWeight: 900, color: FP_STOCK.ink, letterSpacing: 0.5 }}>{offer.label}</span>
                <span className="fb-num" style={{ fontSize: 10.5, color: '#8a6a1e', fontWeight: 950, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
                  {isPractice ? 'DRILL' : isCard ? 'ADD CARD' : 'INSTALL'}{' · '}
                  {used > 0 && <s style={{ color: FP_STOCK.inkSoft, marginRight: 3 }}>${offer.cost}</s>}
                  ${effectiveCost}
                </span>
              </div>
              {isCoachPick && (
                <div className="fp-sticker" style={{ fontSize: 9.5, marginTop: 6 }}>
                  COACH'S CALL: {coachPick.reason}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#45413a', marginTop: 4, lineHeight: 1.35 }}>{offer.detail}</div>
              {offer.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                  {offer.tags.map((tag) => (
                    // SCOUTED = the guaranteed response lane to the named boss:
                    // the scouting report's promise, kept by the shop.
                    tag === 'SCOUTED' ? (
                      <span key={tag} style={{ border: '1px solid #8a2f3e', borderRadius: 5, color: '#f6f2e8', fontSize: 9.5, fontWeight: 950, letterSpacing: 0.6, padding: '2px 5px', background: '#8a2f3e' }}>
                        SCOUTED
                      </span>
                    ) : (
                      <span key={tag} style={{ border: `1px solid ${FP_STOCK.line}`, borderRadius: 5, color: FP_STOCK.inkSoft, fontSize: 9.5, fontWeight: 900, padding: '2px 5px', background: 'rgba(255,255,255,0.35)' }}>
                        {tag}
                      </span>
                    )
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <button
          onClick={onReroll}
          disabled={money < FOURTH_PHASE_WAR_ROOM_REROLL_COST}
          style={{ ...btnGhost, opacity: money >= FOURTH_PHASE_WAR_ROOM_REROLL_COST ? 1 : 0.45 }}
        >
          New looks ${FOURTH_PHASE_WAR_ROOM_REROLL_COST}
        </button>
        <button onClick={onSkip} style={btnGhost}>
          {buysThisWarRoom > 0 ? 'Take the field' : 'Save the cap +$3'}
        </button>
      </div>
    </section>
  );
}
