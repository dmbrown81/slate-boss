import { FB, btnPrimary, sectionLabel, SIDE } from './footballStyles';
import {
  FB_BOSS_SCHEMES, FB_COORDINATORS, FB_ENVIRONMENTS, FB_CARD_MODIFIERS, STARTER_COORDINATORS,
  DRIVES_PER_MATCH, AUDIBLES_PER_DRIVE, MAX_PLAY_CARDS,
  type FbBossSchemeKey,
  type FbCardModifier,
  type FbEnvironmentKey,
} from '../lib/footballRogue';
import { STARTING_FUNDS } from '../lib/gridironEconomy';

interface Props { onClose: () => void; }

const CONCEPTS: { name: string; how: string; tier: 'big' | 'mid' | 'safe' }[] = [
  { name: 'Double-Stack Bomb', how: 'QB pass + two same-team catches', tier: 'big' },
  { name: 'Shootout Stack', how: 'A stack + an opponent catch (bring-back)', tier: 'big' },
  { name: 'Pick Six', how: 'A defensive Return TD card', tier: 'big' },
  { name: 'Stack TD', how: 'QB pass + one same-team catch', tier: 'mid' },
  { name: 'Ground & Pound', how: 'Two or more run cards', tier: 'mid' },
  { name: 'Takeaway', how: 'A defensive Interception card', tier: 'mid' },
  { name: 'Checkdown', how: 'QB pass + a checkdown catch', tier: 'safe' },
  { name: 'Field Goal', how: 'A kicker card — reliable points', tier: 'safe' },
];

const TIER_COLOR = { big: FB.gold, mid: FB.green, safe: FB.textDim } as const;

export default function FootballHelpModal({ onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,9,0.72)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fb-rise"
        style={{ width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', background: FB.bg, borderTop: `1px solid ${FB.border}`, borderRadius: '18px 18px 0 0', padding: '18px 16px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: FB.text }}>How to Play</div>
          <button onClick={onClose} style={{ background: '#141b24', border: `1px solid ${FB.border}`, color: FB.textDim, borderRadius: 8, width: 30, height: 30, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <Block title="The goal">
          A match is <b>{DRIVES_PER_MATCH} drives</b>. Each drive has a points target that <b>rises</b> drive to
          drive. Clear every drive's target to win. If you run out of <b>Play Budget</b> before reaching a
          target, the drive stalls and the run is over.
        </Block>

        <Block title="Calling a play">
          Tap up to <b>{MAX_PLAY_CARDS}</b> cards from your hand to assemble a football play. The preview shows
          the play's name and score <i>before</i> you commit. Scoring is fully transparent:
          <Formula />
          <ul style={ul}>
            <li><Dot c={FB.green} /><b>Base</b> — raw yards from your cards (the fuel).</li>
            <li><Dot c={FB.blue} /><b>Execution</b> — a flat bonus from clean concepts (reliable).</li>
            <li><Dot c={FB.gold} /><b>Big Play</b> — a multiplier from elite synergies (explosive).</li>
          </ul>
          A great build feeds all three. Pump only one and you stall.
        </Block>

        <Block title="First drive grammar">
          The cleanest first play is usually <b>QB Pass + same-team Catch</b>. That makes a Stack TD. Add a
          second same-team catch and it becomes a Double-Stack Bomb. If your hand is all catches, select a few
          loose cards and use <b>Audible</b> to dig for the QB pass.
        </Block>

        <Block title="Play Budget (the cap)">
          Every card has a <b>cap cost</b> (the <span style={{ color: FB.gold }}>$</span> number). Each drive
          gives you a budget; a play can't cost more than you have left. Cheap value cards let you call more
          plays; expensive studs hit harder but drain the cap. That trade-off is the game.
        </Block>

        <Block title="Audibles">
          {AUDIBLES_PER_DRIVE} per drive. Select the cards you don't want and audible to throw them back and
          redraw — no budget spent. Use them to dig for the pieces of a stack.
        </Block>

        <Block title="Play concepts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CONCEPTS.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, background: FB.panelSoft, border: `1px solid ${FB.borderSoft}`, borderRadius: 8, padding: '7px 10px' }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: TIER_COLOR[c.tier], flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: FB.text, minWidth: 130 }}>{c.name}</span>
                <span style={{ fontSize: 11.5, color: FB.textDim }}>{c.how}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 8 }}>
            Repeating the same concept in a drive lets the defense adjust (lower Big Play) — mix it up.
          </div>
        </Block>

        <Block title="Card types">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(SIDE) as (keyof typeof SIDE)[]).map((side) => (
              <span key={side} style={{ fontSize: 11, fontWeight: 800, color: SIDE[side].text, background: SIDE[side].chip, border: `1px solid ${SIDE[side].border}55`, borderRadius: 6, padding: '4px 9px', textTransform: 'capitalize' }}>{side}</span>
            ))}
          </div>
        </Block>

        <Block title="Your coordinators">
          Coordinators are persistent buffs that <b>scale</b> as you play — the engine that lets you out-score
          rising targets.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {STARTER_COORDINATORS.map((k) => (
              <div key={k} style={{ background: '#140f24', border: '1px solid #2a2440', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#b7a7ff' }}>{FB_COORDINATORS[k].name}</div>
                <div style={{ fontSize: 11.5, color: FB.textDim }}>{FB_COORDINATORS[k].description}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Game Plan — commit & scale">
          After each win you can <b>level a Game Plan</b> (a play concept like Stack TD or Ground & Pound).
          Each level scores more every time you call that play — and once it's your core play, it adds a
          <b> growing Big Play multiplier</b>. Targets rise <i>geometrically</i> across the season, so flat
          value alone plateaus: <b>pick a strategy early and stack its Game Plan</b> to build the
          multiplicative engine that beats the late games. Riding one plan beats spreading thin.
        </Block>

        <Block title="The War Room (between games)">
          Win a game and you visit the <b>War Room</b> with <b>Funds</b> (you start with
          <b> ${STARTING_FUNDS}</b>). Each win pays a purse, and banked Funds earn a little
          <b> interest</b> — so every shop is a real choice: <b>buy power now</b>, <b>reroll</b> the board
          for a better fit, or <b>bank</b> toward a keystone coordinator later. Skipping the shop banks a
          small bonus. Funds are separate from in-match Play Budget.
        </Block>

        <Block title="Player Traits">
          Some War Room rewards develop one of your cards, giving it a permanent <b>trait</b> shown as a badge
          on the card face. One trait per card.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {(Object.keys(FB_CARD_MODIFIERS) as FbCardModifier[]).map((k) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: FB_CARD_MODIFIERS[k].color, minWidth: 78 }}>{FB_CARD_MODIFIERS[k].label}</span>
                <span style={{ fontSize: 11.5, color: FB.textDim }}>{FB_CARD_MODIFIERS[k].description}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Boss defenses">
          Later games add an opposing scheme that counters a style of play. You can see it on the scoreboard
          before calling a play. Bosses do not make a build useless, but they force a supporting plan.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {(Object.keys(FB_BOSS_SCHEMES) as FbBossSchemeKey[]).map((k) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: k === 'balanced' ? FB.text : FB.red, minWidth: 92 }}>{FB_BOSS_SCHEMES[k].label}</span>
                <span style={{ fontSize: 11.5, color: FB.textDim }}>{FB_BOSS_SCHEMES[k].description}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Weather">
          Each match has a condition that shifts the math.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
            {(Object.keys(FB_ENVIRONMENTS) as FbEnvironmentKey[]).map((k) => (
              <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: FB.text, minWidth: 116 }}>{FB_ENVIRONMENTS[k].label}</span>
                <span style={{ fontSize: 11.5, color: FB.textDim }}>{FB_ENVIRONMENTS[k].description}</span>
              </div>
            ))}
          </div>
        </Block>

        <button onClick={onClose} style={{ ...btnPrimary, width: '100%', marginTop: 18 }}>Got it</button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ ...sectionLabel, marginBottom: 8, color: FB.gold }}>{title}</div>
      <div style={{ fontSize: 13, color: FB.textDim, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function Formula() {
  return (
    <div className="fb-num" style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: FB.text, background: FB.inset, border: `1px solid ${FB.border}`, borderRadius: 10, padding: '10px 8px', margin: '10px 0' }}>
      <span style={{ color: FB.green }}>Base</span> × (1 + <span style={{ color: FB.blue }}>Execution</span>) × <span style={{ color: FB.gold }}>Big Play</span>
    </div>
  );
}

const ul: React.CSSProperties = { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 };
function Dot({ c }: { c: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: c, marginRight: 8 }} />;
}
