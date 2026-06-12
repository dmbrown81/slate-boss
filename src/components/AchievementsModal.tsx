import type { UserProfile } from '../types';
import { ACHIEVEMENTS, UNLOCKS } from '../lib/achievements';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

const rarityColor = {
  bronze: '#b7794b',
  silver: '#b7c2d0',
  gold: '#f5c542',
  diamond: '#7dd3fc',
};

export default function AchievementsModal({ profile, onClose }: Props) {
  const earned = new Set(profile.achievementIds ?? []);
  const unlocked = new Set(profile.unlockIds ?? []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '88vh',
          overflow: 'auto',
          background: '#101010',
          border: '1px solid #2a2a2a',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Achievements</div>
            <div style={{ color: '#777', fontSize: 12 }}>
              {earned.size}/{ACHIEVEMENTS.length} earned · {profile.achievementPoints ?? 0} pts · {unlocked.size}/{UNLOCKS.length} unlocks
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close achievements"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid #333',
              background: '#181818',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            x
          </button>
        </div>

        <div style={{ background: '#111', border: '1px solid #242424', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Unlocks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {UNLOCKS.map((unlock) => {
              const isUnlocked = unlocked.has(unlock.id);
              return (
                <div
                  key={unlock.id}
                  style={{
                    border: `1px solid ${isUnlocked ? '#2a6ef5' : '#242424'}`,
                    background: isUnlocked ? '#0d1a2a' : '#151515',
                    borderRadius: 6,
                    padding: '7px 8px',
                    opacity: isUnlocked ? 1 : 0.62,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: isUnlocked ? '#fff' : '#777', fontSize: 12, fontWeight: 800 }}>{unlock.name}</span>
                    <span style={{ color: '#666', fontSize: 10 }}>{unlock.kind}</span>
                  </div>
                  <div style={{ color: isUnlocked ? '#9db8e8' : '#666', fontSize: 11 }}>{unlock.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ color: '#fff', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Checklist</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ACHIEVEMENTS.map((achievement) => {
            const isEarned = earned.has(achievement.id);
            return (
              <div
                key={achievement.id}
                style={{
                  background: isEarned ? '#111' : '#151515',
                  border: `1px solid ${isEarned ? rarityColor[achievement.rarity] : '#242424'}`,
                  borderRadius: 7,
                  padding: '8px 10px',
                  opacity: isEarned ? 1 : 0.58,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: isEarned ? '#fff' : '#777', fontSize: 12, fontWeight: 800 }}>{achievement.name}</span>
                  <span style={{ color: rarityColor[achievement.rarity], fontSize: 10 }}>{achievement.points} pts</span>
                </div>
                <div style={{ color: isEarned ? '#aaa' : '#666', fontSize: 11 }}>{achievement.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
