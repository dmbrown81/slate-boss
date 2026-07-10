import {
  FP as FB,
  FP_RADIUS,
  FP_STOCK,
  FP_WOOD,
  btnGhost,
  btnPrimary,
  card,
  sectionLabel,
  stockFace,
  tapeLabel,
  TEAM_ACCENT,
} from './fourthPhaseStyles';
import { HowToPlay } from './FourthPhaseGuide';
import { FootballGlyph, Metric, PatchEmblem, StakeBadge } from './fpShared';
import { StadiumHero } from './fpCardArt';
import { teamKeys } from './fpPersistence';
import {
  FOURTH_PHASE_STAKES,
  FOURTH_PHASE_TEAMS,
  fourthPhaseMaxStake,
  fourthPhaseStake,
  fourthPhaseTeamUnlocks,
  jokerDefinition,
  type FourthPhaseBossProfile,
  type FourthPhaseProgress,
  type FourthPhaseTeamKey,
} from '../../lib/fourthPhase';

// ---------------------------------------------------------------------------
// App-flow screens. The game state machine (LabState.phase) is untouched by
// these: they only stage what the player sees, Balatro-style — title, then
// team/stake select, then a drive intro beat before every kickoff.
// ---------------------------------------------------------------------------

// "Next daily in 5h 12m" — the same countdown Wordle players check. Computed
// per render; the label is coarse enough that live ticking would be noise.
function nextDailyCountdown(): string {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const msLeft = next - now.getTime();
  const hours = Math.floor(msLeft / 3600000);
  const minutes = Math.floor((msLeft % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function TitleScreen({
  canContinue,
  onContinue,
  onPlay,
  onDaily,
  dailyLabel,
  todayDailyDone,
  dailyStreak,
  localBest,
  wins,
  onShareDaily,
  dailyShareCopied,
  soundOn,
  hapticsOn,
  onToggleSound,
  onToggleHaptics,
  onExit,
}: {
  canContinue: boolean;
  onContinue: () => void;
  onPlay: () => void;
  onDaily: () => void;
  dailyLabel: string;
  todayDailyDone: boolean;
  dailyStreak: number;
  localBest: number | null;
  wins: number;
  /** Present only when today's daily is done and a share grid exists. */
  onShareDaily?: () => void;
  dailyShareCopied?: boolean;
  soundOn: boolean;
  hapticsOn: boolean;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onExit?: () => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10, minHeight: 'calc(100svh - 140px)', alignContent: 'center' }}>
      {/* Binder cover: worn leather, stitched border, card-set logo */}
      <div
        className="fp-grain"
        style={{
          background: FP_WOOD.leather,
          border: `1px solid ${FP_WOOD.edge}`,
          borderRadius: 14,
          padding: 10,
          marginBottom: 8,
          boxShadow: 'inset 0 1px 0 rgba(255,226,166,0.08), 0 14px 30px -18px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ border: `1px dashed ${FP_WOOD.stitch}`, borderRadius: 9, padding: '10px 10px 18px', textAlign: 'center' }}>
          {/* Night-game hero scene; the team patch sits over the field like a
              foil stamp pressed into the cover. */}
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(84,64,31,0.55)' }}>
            <StadiumHero />
            <div style={{ position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))' }}>
              <PatchEmblem accent={FB.gold} initials="FP" size={52} />
            </div>
          </div>
          <div className="fp-head" style={{ fontSize: 40, fontWeight: 900, color: FB.gold, letterSpacing: 5, marginTop: 14, lineHeight: 1, textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>
            Fourth Phase
          </div>
          <div className="fp-head" style={{ fontSize: 11, color: FB.textDim, fontWeight: 800, letterSpacing: 3, marginTop: 7 }}>
            A football playbook roguelike
          </div>
          <div style={{ fontSize: 12, color: FB.textDim, fontWeight: 800, marginTop: 12 }}>
            <span style={{ color: '#5fb4ff' }}>Offense</span> · <span style={{ color: '#ff7c93' }}>Defense</span> · <span style={{ color: FB.gold }}>Special Teams</span> · <span style={{ color: '#a987ff' }}>Crowd</span>
          </div>
          <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 4 }}>Clear three drives. Beat the boss defense.</div>
        </div>
      </div>
      {canContinue && (
        <button onClick={onContinue} style={{ ...btnPrimary, minHeight: 52 }}>Continue run</button>
      )}
      <button onClick={onPlay} style={canContinue ? { ...btnGhost, minHeight: 52, fontSize: 14, color: FB.text } : { ...btnPrimary, minHeight: 52 }}>
        {canContinue ? 'New run' : 'Play'}
      </button>
      <button onClick={onDaily} style={{ ...btnGhost, minHeight: 48, borderColor: '#5b4a86', color: '#cbbdff', fontSize: 13 }}>
        {todayDailyDone ? `Daily ${dailyLabel} | practice (streak ${dailyStreak})` : `Daily Challenge | ${dailyLabel}`}
      </button>
      {todayDailyDone && (
        <div style={{ display: 'grid', gap: 6, marginTop: -4 }}>
          {onShareDaily && (
            <button onClick={onShareDaily} style={{ ...btnGhost, minHeight: 44, borderColor: '#5b4a86', color: '#cbbdff', fontSize: 12 }}>
              {dailyShareCopied ? 'Copied — paste it anywhere' : "Share today's result"}
            </button>
          )}
          <div style={{ fontSize: 10.5, color: FB.textFaint, textAlign: 'center' }}>Next daily in {nextDailyCountdown()}</div>
        </div>
      )}
      <div style={{ ...sectionLabel, marginTop: 4 }}>Collection</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: -4 }}>
        <Metric label="Career wins" value={`${wins}`} color={FB.green} />
        <Metric label="Local best" value={localBest != null ? `${localBest}` : '—'} color={FB.gold} />
        <Metric label="Daily streak" value={`${dailyStreak}`} color="#cbbdff" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={onToggleSound} aria-pressed={soundOn} style={{ ...btnGhost, color: soundOn ? FB.gold : FB.textFaint }}>
          {soundOn ? '\u{1F50A}' : '\u{1F507}'} Sound {soundOn ? 'on' : 'off'}
        </button>
        <button onClick={onToggleHaptics} aria-pressed={hapticsOn} style={{ ...btnGhost, color: hapticsOn ? FB.gold : FB.textFaint }}>
          {'\u{1F4F3}'} Haptics {hapticsOn ? 'on' : 'off'}
        </button>
      </div>
      <HowToPlay defaultOpen={false} />
      {onExit && (
        <button onClick={onExit} style={{ background: 'transparent', border: 'none', color: FB.textFaint, fontSize: 11, fontWeight: 800, cursor: 'pointer', marginTop: 2 }}>
          Exit
        </button>
      )}
    </div>
  );
}

export function TeamSelectScreen({
  progress,
  pickTeam,
  pickStake,
  onPickTeam,
  onPickStake,
  onStart,
  onBack,
  importCode,
  importError,
  onImportCode,
  onImport,
}: {
  progress: FourthPhaseProgress;
  pickTeam: FourthPhaseTeamKey;
  pickStake: number;
  onPickTeam: (team: FourthPhaseTeamKey) => void;
  onPickStake: (level: number) => void;
  onStart: () => void;
  onBack: () => void;
  importCode: string;
  importError: string;
  onImportCode: (value: string) => void;
  onImport: () => void;
}) {
  const unlocks = fourthPhaseTeamUnlocks(progress);
  const maxStake = fourthPhaseMaxStake(progress, pickTeam);
  const stake = fourthPhaseStake(pickStake);
  const team = FOURTH_PHASE_TEAMS[pickTeam];
  // The stake ladder is a ceremony a first-time player hasn't earned: before any
  // career win every team is capped at Rookie anyway, so the picker is pure
  // friction. It appears once there's a win to build a ladder on.
  const stakesUnlocked = progress.wins > 0;
  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <button onClick={onBack} style={{ ...btnGhost, minWidth: 74 }}>Back</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: FB.gold, fontWeight: 900 }}>CHOOSE YOUR PLAYBOOK</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint }}>then pick a stake</div>
        </div>
        <div style={{ minWidth: 74 }} />
      </header>

      <div style={{ display: 'grid', gap: 8 }}>
        {teamKeys.map((key) => {
          const profile = FOURTH_PHASE_TEAMS[key];
          const unlock = unlocks[key];
          const selected = key === pickTeam;
          const bestStake = progress.stakeWins[key] ?? 0;
          const signature = jokerDefinition({ id: profile.signatureJoker });
          const accent = TEAM_ACCENT[key];
          const initials = profile.shortName.split(/[\s&]+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
          if (!unlock.unlocked) {
            // Locked playbooks read as empty binder slots waiting for the insert.
            return (
              <div key={key} className="fp-sleeve" style={{ display: 'block', padding: '11px 12px', minHeight: 68 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <span className="fp-head" style={{ fontSize: 13, color: FB.textFaint, fontWeight: 900, letterSpacing: 1 }}>{profile.shortName}</span>
                  <span className="fp-head" style={{ fontSize: 9.5, color: FB.textFaint, fontWeight: 900, letterSpacing: 1 }}>Empty slot</span>
                </div>
                <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 5, lineHeight: 1.35 }}>
                  {unlock.requirement}
                  {unlock.progressLabel ? <span style={{ color: FB.textDim, fontWeight: 850 }}> ({unlock.progressLabel})</span> : null}
                </div>
              </div>
            );
          }
          // Unlocked playbooks are premium insert cards: patch, scheme title,
          // playbook nickname, identity line, and the signature joker sticker.
          return (
            <button
              key={key}
              onClick={() => onPickTeam(key)}
              style={{
                ...stockFace(12),
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                overflow: 'hidden',
                borderColor: selected ? FB.gold : FP_STOCK.line,
                boxShadow: selected
                  ? `inset 4px 0 0 ${accent}, 0 0 0 2px rgba(217,164,65,0.5), 0 10px 20px -14px rgba(0,0,0,0.7)`
                  : `inset 4px 0 0 ${accent}, 0 3px 10px -6px rgba(0,0,0,0.6)`,
              }}
            >
              <div className="fp-grain" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 10, padding: '11px 12px', alignItems: 'start' }}>
                <PatchEmblem accent={accent} initials={initials} size={44} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span className="fp-head" style={{ fontSize: 16, fontWeight: 900, color: FP_STOCK.ink, letterSpacing: 1 }}>{profile.shortName}</span>
                    {bestStake > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 950, color: '#1e6b40', whiteSpace: 'nowrap' }}>
                        ✓ {fourthPhaseStake(bestStake).shortName.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="fp-head" style={{ fontSize: 10, color: FP_STOCK.inkSoft, fontWeight: 900, letterSpacing: 1.6, marginTop: 1 }}>
                    {profile.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#45413a', marginTop: 4, lineHeight: 1.35 }}>{profile.identity}</div>
                  <div className="fp-sticker" style={{ fontSize: 9, marginTop: 7, lineHeight: 1.3 }}>
                    SIGNATURE INSERT: {signature.name} — {signature.effect}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {stakesUnlocked && <section style={{ ...card(), padding: 11, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={sectionLabel}>Stake</div>
          <div style={{ fontSize: 10.5, color: FB.textFaint }}>win a stake to unlock the next</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FOURTH_PHASE_STAKES.length}, 1fr)`, gap: 6, marginTop: 8 }}>
          {FOURTH_PHASE_STAKES.map((option) => {
            const locked = option.level > maxStake;
            const selected = option.level === pickStake;
            return (
              <button
                key={option.level}
                onClick={() => !locked && onPickStake(option.level)}
                disabled={locked}
                style={{
                  minHeight: 44,
                  borderRadius: FP_RADIUS.control,
                  border: `1px solid ${selected ? option.color : FB.border}`,
                  background: selected ? 'rgba(242,189,61,0.08)' : FB.panelRaised,
                  color: locked ? FB.textFaint : option.color,
                  fontSize: 11,
                  fontWeight: 950,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.45 : 1,
                }}
              >
                {locked ? '🔒 ' : ''}{option.shortName}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: stake.color, fontWeight: 900, marginTop: 9 }}>{stake.name} — {stake.tagline}</div>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 2 }}>
          {stake.modifiers.map((modifier) => (
            <li key={modifier} style={{ fontSize: 11, color: FB.textDim, lineHeight: 1.35 }}>{modifier}</li>
          ))}
        </ul>
      </section>}

      <button onClick={onStart} className="fp-pressable" style={{ ...btnPrimary, width: '100%', minHeight: 52, marginTop: 12 }}>
        {stakesUnlocked ? `Kickoff — ${team.shortName} · ${stake.shortName} Stake` : `Kickoff — ${team.shortName}`}
      </button>

      <section style={{ ...card(), padding: 10, marginTop: 12 }}>
        <div style={sectionLabel}>Import a run code</div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3 }}>Replays any shared run exactly — team, boss, and stake included.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 8 }}>
          <input
            value={importCode}
            onChange={(event) => onImportCode(event.target.value)}
            placeholder="FP-BAL-1A2B3-S2"
            aria-label="Run code"
            style={{
              minHeight: 38,
              borderRadius: FP_RADIUS.control,
              border: `1px solid ${importError ? FB.red : FB.border}`,
              background: FB.inset,
              color: FB.text,
              padding: '0 10px',
              fontSize: 12,
              fontWeight: 800,
            }}
          />
          <button onClick={onImport} style={{ ...btnGhost, minHeight: 38, padding: '0 12px' }}>Import</button>
        </div>
        {importError && <div style={{ fontSize: 10.5, color: FB.red, marginTop: 5 }}>{importError}</div>}
      </section>
    </div>
  );
}

export function DriveIntroScreen({
  driveNumber,
  drives,
  target,
  teamName,
  teamIdentity,
  stakeLevel,
  boss,
  upcomingBoss,
  bossArrivesDrive,
  plays,
  redraws,
  money,
  jokers,
  dailyLabel,
  onKickoff,
}: {
  driveNumber: number;
  drives: number;
  target: number;
  teamName: string;
  teamIdentity: string;
  stakeLevel: number;
  boss: FourthPhaseBossProfile | null;
  upcomingBoss: FourthPhaseBossProfile | null;
  bossArrivesDrive: number;
  plays: number;
  redraws: number;
  money: number;
  jokers: string[];
  dailyLabel?: string;
  onKickoff: () => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10, minHeight: 'calc(100svh - 190px)', alignContent: 'center' }}>
      <section style={{ ...card(), padding: 16, textAlign: 'center', borderColor: boss ? FB.red : FB.gold, background: 'linear-gradient(180deg,#1a1f2a,#10141c)' }}>
        {dailyLabel && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ ...tapeLabel, fontSize: 9.5 }}>DAILY CHALLENGE {dailyLabel}</span>
          </div>
        )}
        <div style={{ ...sectionLabel, color: FB.textFaint }}>Drive</div>
        <div className="fb-num" style={{ fontSize: 56, color: FB.text, fontWeight: 950, lineHeight: 0.95 }}>
          {driveNumber}<span style={{ fontSize: 22, color: FB.textFaint }}> / {drives}</span>
        </div>
        <div style={{ fontSize: 12, color: FB.textDim, fontWeight: 850, marginTop: 10 }}>
          Score <span className="fb-num" style={{ color: FB.gold, fontSize: 15 }}>{target}</span> in {plays} calls
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: FB.text, fontWeight: 950 }}>{teamName}</span>
          <StakeBadge level={stakeLevel} />
        </div>
        <div style={{ fontSize: 10.5, color: FB.textFaint, marginTop: 3, lineHeight: 1.3 }}>{teamIdentity}</div>

        {boss ? (
          <div style={{ border: `1px solid rgba(240,117,138,0.6)`, borderRadius: FP_RADIUS.card, background: 'rgba(240,117,138,0.09)', padding: '10px 11px', marginTop: 12 }}>
            <div style={{ ...sectionLabel, color: FB.red }}>Boss defense on the field</div>
            <div style={{ fontSize: 13, color: '#ff9aac', fontWeight: 950, marginTop: 3 }}>{boss.name}</div>
            <div style={{ fontSize: 11, color: FB.textDim, marginTop: 2, lineHeight: 1.35 }}>{boss.effect}</div>
          </div>
        ) : upcomingBoss ? (
          <div style={{ border: `1px solid rgba(242,189,61,0.42)`, borderRadius: FP_RADIUS.card, background: 'rgba(242,189,61,0.06)', padding: '9px 11px', marginTop: 12 }}>
            <div style={{ ...sectionLabel, color: FB.gold }}>Scouting report</div>
            <div style={{ fontSize: 11, color: FB.textDim, marginTop: 3, lineHeight: 1.35 }}>
              <span style={{ color: FB.gold, fontWeight: 950 }}>{upcomingBoss.name}</span> takes the field on Drive {bossArrivesDrive}. {upcomingBoss.effect}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
          <Metric label="Calls" value={`${plays}`} color={FB.green} />
          <Metric label="Redraws" value={`${redraws}`} color="#5fb4ff" />
          <Metric label="Cash" value={`$${money}`} color={FB.gold} />
        </div>
        {jokers.length > 0 && (
          <div style={{ fontSize: 10.5, color: '#cbbdff', fontWeight: 850, marginTop: 10, lineHeight: 1.35 }}>
            Sideline: {jokers.join(' / ')}
          </div>
        )}
        <button onClick={onKickoff} className="fp-pressable" style={{ ...btnPrimary, width: '100%', minHeight: 52, marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FootballGlyph size={16} />
          {driveNumber === 1 ? 'Kickoff' : `Start Drive ${driveNumber}`}
        </button>
      </section>
    </div>
  );
}
