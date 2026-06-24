import { useState } from 'react';
import { FB, btnPrimary, card } from './footballStyles';
import FootballHelpModal from './FootballHelpModal';
import { bestGridironHistoryRun, bestGridironOvertimeRun, clearGridironRun, loadGridironDaily, loadGridironHistory, loadGridironRun } from '../lib/gridironStorage';
import { FB_ENVIRONMENTS, randomEnvironment, TEAM_PROFILES, type TeamArchetype } from '../lib/footballRogue';
import { dailyTeamForSeed, runRng, SEASON_GAMES } from '../lib/footballRun';
import { parseRunCode } from '../lib/gridironTaxonomy';
import { stringSeed } from '../lib/rng';

interface Props {
  onPlay: (seed?: number, team?: TeamArchetype) => void;
}

export default function FootballHome({ onPlay }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const codeParsed = parseRunCode(codeInput);
  const [activeRun, setActiveRun] = useState(() => loadGridironRun());
  const [history] = useState(() => loadGridironHistory());
  const activeTeam = activeRun ? TEAM_PROFILES[activeRun.run.team] : null;
  const bestRun = bestGridironHistoryRun(history);
  const bestTeam = bestRun ? TEAM_PROFILES[bestRun.team] : null;
  const bestOvertime = bestGridironOvertimeRun(history);
  const daily = dailyChallengeSeed();
  const dailyRecord = loadGridironDaily();
  const todayDaily = dailyRecord?.date === daily.label ? dailyRecord : null;
  // Today's fixed assignment — same team + weather for everyone playing the daily.
  const assignTeamKey = dailyTeamForSeed(daily.seed);
  const assignTeam = TEAM_PROFILES[assignTeamKey];
  const assignWeather = FB_ENVIRONMENTS[randomEnvironment(runRng({ seed: daily.seed, team: assignTeamKey, gameNumber: 1 }, 'environment'))];

  function copyDaily() {
    if (!todayDaily || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const recap = `Gridiron Daily ${todayDaily.date} · ${TEAM_PROFILES[todayDaily.team].shortName} · ${todayDaily.won ? 'Champions 5/5' : `${todayDaily.gamesWon}/${SEASON_GAMES}`} · ${todayDaily.score} · streak ${todayDaily.streak} 🔥`;
    navigator.clipboard.writeText(recap).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    }).catch(() => undefined);
  }

  function startFresh() {
    clearGridironRun();
    setActiveRun(null);
    onPlay();
  }

  function startDaily() {
    clearGridironRun();
    setActiveRun(null);
    onPlay(daily.seed);
  }

  function startCode() {
    if (!codeParsed) return;
    clearGridironRun();
    setActiveRun(null);
    onPlay(codeParsed.seed, codeParsed.team);
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', padding: '0 16px 24px' }}>
      {/* Hero */}
      <div
        className="fb-yard"
        style={{
          marginTop: 8,
          borderRadius: 18,
          padding: '40px 20px 34px',
          textAlign: 'center',
          background: 'radial-gradient(120% 90% at 50% 0%, #16324a 0%, rgba(22,50,74,0) 60%), linear-gradient(180deg,#0e1923,#0a0f16)',
          border: `1px solid ${FB.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: FB.gold, fontWeight: 800 }}>SLATE BOSS PRESENTS</div>
        <div className="fb-pop" style={{ fontSize: 54, fontWeight: 900, color: FB.text, lineHeight: 0.95, marginTop: 8, letterSpacing: -1.5, textShadow: '0 2px 24px rgba(240,180,41,0.18)' }}>
          GRIDIRON
        </div>
        <div style={{ fontSize: 13, color: FB.textDim, marginTop: 10, fontWeight: 600 }}>A football card roguelike</div>
        <div style={{ fontSize: 12.5, color: FB.gold, marginTop: 18, fontWeight: 700, letterSpacing: 0.3 }}>
          Build the deck. Call the play. Beat the defense.
        </div>
      </div>

      {/* What it is */}
      <div style={{ ...card(), padding: '14px 14px', marginTop: 14 }}>
        <div style={{ fontSize: 13, color: FB.textDim, lineHeight: 1.55 }}>
          Your cards are football plays. Each drive, assemble the best play you can afford — stack your QB with
          his receivers, pound the rock, or take it away on defense — and watch it score
          {' '}<span style={{ color: FB.green, fontWeight: 700 }}>B Base</span> ×
          {' '}<span style={{ color: FB.blue, fontWeight: 700 }}>+EXE</span> ×
          {' '}<span style={{ color: FB.gold, fontWeight: 700 }}>×BP</span>. Clear three rising targets to win.
        </div>
      </div>

      {/* Feature chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <Feature icon="🧠" label="Strategic" sub="A salary cap on every play" />
        <Feature icon="⚡" label="Fast" sub="A full match in minutes" />
        <Feature icon="🎲" label="Roguelike" sub="Skill beats luck" />
        <Feature icon="📈" label="Engine builder" sub="Coordinators that scale" />
      </div>

      {bestRun && bestTeam && (
        <div style={{ ...card(12), padding: '12px 14px', marginTop: 12, background: 'linear-gradient(160deg,#111a24,#0c1118)' }}>
          <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.2, fontWeight: 900 }}>BEST LOCAL RUN</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginTop: 4 }}>
            <div style={{ fontSize: 14, color: FB.text, fontWeight: 900 }}>{bestTeam.displayName}</div>
            <div className="fb-num" style={{ fontSize: 12, color: bestRun.won ? FB.gold : FB.textDim, fontWeight: 900 }}>
              {bestRun.won ? 'Champions' : `${bestRun.gamesWon}/${SEASON_GAMES}`}
            </div>
          </div>
          <div style={{ fontSize: 11, color: FB.textDim, marginTop: 4 }}>
            {bestRun.identityTitle} · Score {bestRun.score}
          </div>
          {bestOvertime && (bestOvertime.overtimeRound ?? 0) > 0 && (
            <div style={{ fontSize: 11, color: FB.gold, marginTop: 6, fontWeight: 800 }}>
              🔥 Deepest Overtime: Round {bestOvertime.overtimeRound} · {bestOvertime.overtimeScore} pts
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {activeRun && activeTeam && (
          <div style={{ ...card(12), padding: '12px 14px', borderColor: '#5a4112', background: 'linear-gradient(160deg,#17170d,#0e151d)' }}>
            <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.3, fontWeight: 900 }}>ACTIVE SEASON</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginTop: 4 }}>
              <div style={{ fontSize: 15, color: FB.text, fontWeight: 900 }}>{activeTeam.displayName}</div>
              <div className="fb-num" style={{ fontSize: 12, color: FB.textDim, fontWeight: 800 }}>Game {activeRun.run.gameNumber}/{SEASON_GAMES}</div>
            </div>
            <div style={{ fontSize: 11, color: FB.textFaint, marginTop: 4 }}>
              {activeRun.phase === 'reward' ? 'Front Office reward waiting.' : 'Current game ready to continue.'}
            </div>
          </div>
        )}

        <button onClick={() => onPlay()} style={{ ...btnPrimary, width: '100%', fontSize: 17, padding: '16px 0' }}>
          {activeRun ? `🏈 Resume Season (Game ${activeRun.run.gameNumber}/${SEASON_GAMES})` : '🏈 Kickoff'}
        </button>
        <div style={{ ...card(12), padding: '12px 14px', borderColor: `${FB.blue}66`, background: 'linear-gradient(160deg,#0e1722,#0b0f16)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#9cc6ff', letterSpacing: 1.3, fontWeight: 900 }}>DAILY SCRIMMAGE · {daily.label}</div>
            {todayDaily && <span style={{ fontSize: 11, color: FB.gold, fontWeight: 900 }}>🔥 streak {todayDaily.streak}</span>}
          </div>
          <div style={{ fontSize: 13, color: FB.text, fontWeight: 800, marginTop: 5 }}>
            Today: <span style={{ color: FB.text }}>{assignTeam.displayName}</span>
            <span style={{ color: FB.textDim, fontWeight: 700 }}> · {assignWeather.label} · {assignTeam.difficulty}</span>
          </div>
          {todayDaily ? (
            <>
              <div style={{ fontSize: 11.5, color: FB.textDim, marginTop: 4 }}>
                Official attempt locked — {todayDaily.won ? 'Champions' : `${todayDaily.gamesWon}/${SEASON_GAMES}`} · score {todayDaily.score}.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                <button onClick={copyDaily} style={{ flex: 1, padding: '10px 0', background: FB.inset, border: `1px solid ${FB.borderSoft}`, color: copied ? FB.green : FB.gold, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  {copied ? 'Copied recap' : '📋 Copy recap'}
                </button>
                <button onClick={startDaily} style={{ flex: 1, padding: '10px 0', background: '#101926', border: `1px solid ${FB.blue}66`, color: '#9cc6ff', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  Replay (practice)
                </button>
              </div>
            </>
          ) : (
            <button onClick={startDaily} style={{ width: '100%', marginTop: 9, padding: '12px 0', background: '#101926', border: `1px solid ${FB.blue}`, color: '#9cc6ff', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Play today’s assignment →
            </button>
          )}
        </div>
        {activeRun && (
          <button
            onClick={startFresh}
            style={{ width: '100%', padding: '13px 0', background: '#21131a', border: `1px solid #4a2530`, color: FB.red, borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Abandon & New Season
          </button>
        )}
        <button
          onClick={() => setShowHelp(true)}
          style={{ width: '100%', padding: '13px 0', background: '#141b24', border: `1px solid ${FB.border}`, color: FB.text, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          How to Play
        </button>
        {showCode ? (
          <div style={{ ...card(12), padding: '12px 14px', borderColor: `${FB.gold}55` }}>
            <div style={{ fontSize: 11, color: FB.gold, letterSpacing: 1.2, fontWeight: 900 }}>PLAY A CODE</div>
            <div style={{ fontSize: 11.5, color: FB.textDim, marginTop: 3, lineHeight: 1.4 }}>
              Paste a run code to replay the same team, weather, bosses, and shelves. e.g. <span style={{ color: FB.text, fontWeight: 800 }}>VLT-2K9F4P</span>
            </div>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="TEAM-CODE"
              autoCapitalize="characters"
              spellCheck={false}
              style={{ width: '100%', marginTop: 9, padding: '11px 12px', background: FB.inset, border: `1px solid ${codeInput && !codeParsed ? FB.red : FB.border}`, borderRadius: 10, color: FB.text, fontSize: 15, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', boxSizing: 'border-box' }}
            />
            {codeParsed && (
              <div style={{ fontSize: 11.5, color: FB.green, marginTop: 6, fontWeight: 800 }}>
                {TEAM_PROFILES[codeParsed.team].displayName} · ready to kick off
              </div>
            )}
            {codeInput && !codeParsed && (
              <div style={{ fontSize: 11.5, color: FB.red, marginTop: 6 }}>Not a valid code.</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => { setShowCode(false); setCodeInput(''); }} style={{ flex: 1, padding: '11px 0', background: FB.inset, border: `1px solid ${FB.borderSoft}`, color: FB.textDim, borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
              <button onClick={startCode} disabled={!codeParsed} style={{ flex: 2, padding: '11px 0', background: codeParsed ? 'linear-gradient(180deg,#f7c544,#e6a519)' : '#1a2330', color: codeParsed ? '#1a1206' : FB.textFaint, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: codeParsed ? 'pointer' : 'not-allowed' }}>Play code →</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCode(true)}
            style={{ width: '100%', padding: '13px 0', background: '#141b24', border: `1px solid ${FB.border}`, color: FB.textDim, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            🔑 Play a Code
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: '#425066', textAlign: 'center', lineHeight: 1.5, marginTop: 12 }}>
        Fictional football strategy game. No real teams or players. No real money. No prizes.
      </div>

      {showHelp && <FootballHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function dailyChallengeSeed() {
  const label = new Date().toISOString().slice(0, 10);
  return { label, seed: stringSeed(`gridiron-daily:${label}`) };
}

function Feature({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{ ...card(12), padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 19 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: FB.text }}>{label}</div>
        <div style={{ fontSize: 11, color: FB.textFaint }}>{sub}</div>
      </div>
    </div>
  );
}
