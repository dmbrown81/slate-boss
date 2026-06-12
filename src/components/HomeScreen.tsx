import { useState } from 'react';
import type { UserProfile } from '../types';
import { APP_NAME } from '../config';
import { currentTitle } from '../lib/progression';
import { hasPlayedToday, todayDateStr } from '../lib/storage';
import { slateNumber } from '../lib/rng';
import { generateSlate } from '../lib/slateGenerator';
import HelpModal from './HelpModal';
import AchievementsModal from './AchievementsModal';
import { ACHIEVEMENTS, UNLOCKS } from '../lib/achievements';

interface Props {
  profile: UserProfile;
  onPlayDaily: () => void;
  onCareer: () => void;
}

export default function HomeScreen({ profile, onPlayDaily, onCareer }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const today = todayDateStr();
  const slateNum = slateNumber(today);
  const played = hasPlayedToday(profile);
  const title = currentTitle(profile);

  // Generate slate just to read today's modifier — cheap, deterministic
  const todaySlate = generateSlate(today);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* App header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{APP_NAME}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Daily Lineup Strategy Game</div>
      </div>

      <div style={{
        background: '#0d1a2a',
        border: '1px solid #2a6ef555',
        borderRadius: 10,
        padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>What am I trying to do?</div>
            <div style={{ fontSize: 11, color: '#9db8e8' }}>
              Build a lineup under the salary cap, then beat the field in a contest.
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              background: '#2a6ef5',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '7px 9px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Help
          </button>
        </div>
      </div>

      {/* Profile pill */}
      <div style={{
        background: '#111', border: '1px solid #1e1e1e', borderRadius: 10,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: '#555' }}>Lv {profile.level} · {profile.xp} XP</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>
            {profile.dailyStreak > 0 ? `🔥 ${profile.dailyStreak}` : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>streak</div>
        </div>
      </div>

      {/* Daily slate card */}
      <div style={{
        background: '#111',
        border: `1px solid ${played ? '#27ae6044' : '#2a6ef544'}`,
        borderRadius: 12, padding: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#555', letterSpacing: 1 }}>TODAY'S SLATE</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>#{slateNum}</div>
          </div>
          <div style={{
            background: played ? '#0d2a1a' : '#0d1a2a',
            border: `1px solid ${played ? '#27ae60' : '#2a6ef5'}`,
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, color: played ? '#27ae60' : '#4fc3f7',
          }}>
            {played ? '✓ Played' : 'New'}
          </div>
        </div>

        {/* Today's modifier — key context before they enter */}
        <div style={{
          background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8,
          padding: '8px 10px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ fontSize: 16 }}>{todaySlate.modifier.label.split(' ')[0]}</div>
          <div>
            <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>
              {todaySlate.modifier.label.split(' ').slice(1).join(' ')}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>{todaySlate.modifier.description}</div>
          </div>
        </div>

        {played && profile.lastDailyResult && (
          <div style={{
            background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8,
            padding: '8px 10px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>LATEST RESULT</div>
            <div style={{ fontSize: 13, color: '#ccc' }}>
              {profile.lastDailyResult.userScore.toFixed(1)} pts
              <span style={{ color: '#555' }}> · </span>
              Rank {profile.lastDailyResult.userRank}/{profile.lastDailyResult.totalEntrants}
              <span style={{ color: '#555' }}> · </span>
              <span style={{ color: profile.lastDailyResult.payout > 0 ? '#27ae60' : '#555' }}>
                {profile.lastDailyResult.payout > 0 ? `+$${profile.lastDailyResult.payout.toFixed(2)}` : 'No cash'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onPlayDaily}
          style={{
            width: '100%', padding: '12px 0',
            background: '#2a6ef5', border: 'none', color: '#fff',
            borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {played ? 'Play Again' : 'Play Daily Slate'}
        </button>
      </div>

      {/* Career card */}
      <div style={{
        background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16,
      }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 8 }}>CAREER MODE</div>
        {profile.run.isActive ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>${profile.run.bankroll.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: '#555' }}>Bankroll · Run #{profile.run.runNumber}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {profile.run.slatesRemaining} <span style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>left</span>
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>Week {profile.run.currentWeek}</div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: '#ccc' }}>Start a new run</div>
            <div style={{ fontSize: 11, color: '#666' }}>
              Best: <span style={{ color: '#f59e0b' }}>${profile.run.bestRunScore.toFixed(2)}</span>
              {profile.careerRunHistory.length > 0 && ` · ${profile.careerRunHistory.length} runs`}
            </div>
          </div>
        )}
        <button
          onClick={onCareer}
          style={{
            width: '100%', padding: '10px 0',
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
            borderRadius: 8, fontSize: 14, cursor: 'pointer',
          }}
        >
          {profile.run.isActive ? 'Continue Run →' : 'Career Mode →'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Contests', value: profile.totalContestsPlayed },
          { label: 'Cashed', value: profile.totalCashed },
          { label: 'Winnings', value: `$${profile.totalWinnings.toFixed(0)}` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
            padding: '10px 0', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAchievements(true)}
        style={{
          background: '#111',
          border: '1px solid #2a2a2a',
          borderRadius: 10,
          padding: '11px 12px',
          color: '#ccc',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>Achievements & Unlocks</div>
            <div style={{ fontSize: 11, color: '#666' }}>
              {profile.achievementIds?.length ?? 0}/{ACHIEVEMENTS.length} achievements · {profile.unlockIds?.length ?? 0}/{UNLOCKS.length} unlocks
            </div>
          </div>
          <div style={{ color: '#f59e0b', fontSize: 16, fontWeight: 800 }}>{profile.achievementPoints ?? 0}</div>
        </div>
      </button>

      <div style={{
        fontSize: 10, color: '#2a2a2a', textAlign: 'center', lineHeight: 1.5,
        marginTop: 'auto', paddingTop: 4,
      }}>
        Fictional fantasy sports strategy game. No real money. No prizes. No deposits. No withdrawals.
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showAchievements && <AchievementsModal profile={profile} onClose={() => setShowAchievements(false)} />}
    </div>
  );
}
