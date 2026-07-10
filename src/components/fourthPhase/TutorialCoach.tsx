import { FP as FB, btnGhost, btnPrimary, card, sectionLabel } from './fourthPhaseStyles';
import { TUTORIAL_STEPS } from './fpLabLogic';

// The coach's step card that runs the first-ever run. Pure presentation: the
// step index, nudges, and gating live in the Lab's play handlers, and the
// script itself (TUTORIAL_STEPS) lives in fpLabLogic.
export function TutorialPanel({
  step,
  coachNudge,
  canCoachOrder,
  highlightCoachOrder,
  onCoachOrder,
  onFinish,
}: {
  step: number;
  coachNudge: string;
  canCoachOrder: boolean;
  highlightCoachOrder: boolean;
  onCoachOrder: () => void;
  onFinish: () => void;
}) {
  if (step < 0 || step >= TUTORIAL_STEPS.length) return null;
  return (
    <section style={{ ...card(), padding: 13, marginBottom: 10, borderColor: FB.gold, background: 'linear-gradient(135deg,#232a15,#151922)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ ...sectionLabel, color: FB.gold }}>Coach step {step + 1}/{TUTORIAL_STEPS.length}</div>
        <button onClick={onFinish} style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
          Skip tutorial
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 950, color: FB.text, marginTop: 4 }}>{TUTORIAL_STEPS[step].title}</div>
      <div style={{ fontSize: 12, color: FB.textDim, lineHeight: 1.45, marginTop: 4 }}>{TUTORIAL_STEPS[step].body}</div>
      {coachNudge && (
        <div style={{ border: `1px solid ${FB.gold}`, borderRadius: 8, color: FB.gold, background: 'rgba(240,180,41,0.08)', padding: '8px 9px', marginTop: 9, fontSize: 11.5, fontWeight: 850 }}>
          {coachNudge}
        </div>
      )}
      {canCoachOrder && (
        <button
          onClick={onCoachOrder}
          style={{ ...btnGhost, width: '100%', marginTop: 9, borderColor: highlightCoachOrder ? FB.gold : FB.border, color: highlightCoachOrder ? FB.gold : FB.textDim }}
        >
          Coach Order: Crowd first
        </button>
      )}
      {TUTORIAL_STEPS[step].cta && (
        <button onClick={onFinish} style={{ ...btnPrimary, width: '100%', marginTop: 10 }}>{TUTORIAL_STEPS[step].cta}</button>
      )}
    </section>
  );
}
