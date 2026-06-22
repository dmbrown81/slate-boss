import { useState } from 'react';
import {
  TEAM_ARCHETYPES, TEAM_PROFILES, FB_COORDINATORS, FB_CONCEPT_LABEL,
  type TeamArchetype,
} from '../lib/footballRogue';
import { FB, btnPrimary, card, sectionLabel } from './footballStyles';
import { CoachPortrait } from './coachIdentity';
import { TEAM_IDENTITY } from './teamIdentity';

const DIFF_COLOR: Record<'Easy' | 'Medium' | 'Hard', string> = {
  Easy: FB.green,
  Medium: FB.gold,
  Hard: FB.red,
};

export default function FootballTeamSelect({ onStart, onHome }: { onStart: (team: TeamArchetype) => void; onHome: () => void }) {
  const [picked, setPicked] = useState<TeamArchetype>('balanced');
  const p = TEAM_PROFILES[picked];

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '14px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', color: FB.textFaint, fontSize: 12, cursor: 'pointer' }}>← Back</button>
        <div style={sectionLabel}>Choose your franchise</div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ fontSize: 22, fontWeight: 900, color: FB.text, marginTop: 8, letterSpacing: -0.4 }}>
        Pick a team to build around
      </div>
      <div style={{ fontSize: 12.5, color: FB.textDim, marginTop: 4, lineHeight: 1.5 }}>
        Each team is a different starting deck, coordinator pair, and cost identity — not a skin. Your team decides which plays come cheap and which scoring engine you want to chase.
      </div>

      {/* Team chooser — grid ritual */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 }}>
        {TEAM_ARCHETYPES.map((id) => (
          <TeamGridCard key={id} id={id} active={id === picked} onPick={() => setPicked(id)} />
        ))}
      </div>

      {/* Detail of picked team */}
      <div style={{ ...card(), padding: '14px 14px', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: FB.text }}>{p.displayName}</span>
          <span style={{ fontSize: 11, color: FB.textFaint, fontWeight: 700 }}>{p.shortName}</span>
        </div>
        <div style={{ fontSize: 12.5, color: FB.gold, marginTop: 6, fontWeight: 600, fontStyle: 'italic' }}>{p.tagline}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <Bullets label="Strengths" color={FB.green} items={p.strengths} />
          <Bullets label="Watch out for" color={FB.red} items={p.weaknesses} />
        </div>

        <Row label="Cost perk" value={p.perkLabel} valueColor={FB.gold} />
        <Row label="Best concepts" value={p.bestConcepts.map((c) => FB_CONCEPT_LABEL[c] ?? c).join(' · ')} />
        <Row label="Coordinators" value={p.startingCoordinators.map((k) => FB_COORDINATORS[k].name).join(' · ')} />
      </div>

      <div style={{ flex: 1, minHeight: 14 }} />

      <button onClick={() => onStart(picked)} style={{ ...btnPrimary, width: '100%', fontSize: 16, padding: '15px 0', marginTop: 14 }}>
        🏈 Start the season with {p.displayName}
      </button>
    </div>
  );
}

// 3:4 team card: coach portrait over a team-colour band, name + difficulty,
// and a one-line play-style tag. Tap selects; the Start button is the commit.
function TeamGridCard({ id, active, onPick }: { id: TeamArchetype; active: boolean; onPick: () => void }) {
  const t = TEAM_PROFILES[id];
  const ident = TEAM_IDENTITY[id];
  return (
    <button
      onClick={onPick}
      style={{
        ...card(14), width: 'calc(50% - 5px)', maxWidth: 200, cursor: 'pointer', textAlign: 'center',
        padding: 0, overflow: 'hidden', position: 'relative',
        border: `1.5px solid ${active ? ident.primary : FB.border}`,
        boxShadow: active ? `0 0 0 1px ${ident.primary}, 0 8px 22px -12px ${ident.primary}` : 'none',
      }}
    >
      <div style={{ background: `linear-gradient(160deg, ${ident.primary}33, #0a0f16)`, padding: '14px 0 10px', display: 'flex', justifyContent: 'center' }}>
        <CoachPortrait team={id} size={56} />
      </div>
      <div style={{ padding: '9px 10px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: FB.text }}>{t.displayName}</div>
        <div style={{ fontSize: 10.5, color: ident.primary, fontWeight: 800, marginTop: 2 }}>{ident.playStyle}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.4, color: DIFF_COLOR[t.difficulty], border: `1px solid ${DIFF_COLOR[t.difficulty]}`, borderRadius: 6, padding: '2px 7px' }}>
            {t.difficulty}
          </span>
          {t.firstRunRecommended && (
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.4, color: FB.green, background: FB.greenSoft, border: `1px solid ${FB.green}`, borderRadius: 6, padding: '2px 7px' }}>
              START HERE
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Bullets({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div>
      <div style={{ ...sectionLabel, color }}>{label}</div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 16 }}>
        {items.map((it) => (
          <li key={it} style={{ fontSize: 11.5, color: FB.textDim, lineHeight: 1.5 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ marginTop: 11, borderTop: `1px solid ${FB.borderSoft}`, paddingTop: 9 }}>
      <div style={sectionLabel}>{label}</div>
      <div style={{ fontSize: 12, color: valueColor ?? FB.text, marginTop: 3, lineHeight: 1.45, fontWeight: valueColor ? 600 : 400 }}>{value}</div>
    </div>
  );
}
