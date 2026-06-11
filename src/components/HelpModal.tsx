interface Props {
  onClose: () => void;
}

const terms = [
  { term: 'Goal', definition: 'Build an 8-player lineup that stays under the $50,000 salary cap, then enter a contest and try to outscore the field.' },
  { term: 'QB', definition: 'Quarterback. Usually best when paired with one of his WR or TE teammates.' },
  { term: 'RB', definition: 'Running back. Often safer when they get lots of touches.' },
  { term: 'WR', definition: 'Wide receiver. More up and down, but big ceiling games win tournaments.' },
  { term: 'TE', definition: 'Tight end. Similar to WR, usually cheaper and more touchdown-dependent.' },
  { term: 'FLEX', definition: 'A bonus roster spot where you can use one RB, WR, or TE.' },
  { term: 'DST', definition: 'Defense/special teams. Scores from sacks, turnovers, and defensive touchdowns.' },
  { term: 'Projection', definition: 'Estimated fantasy points. Higher is better, but not guaranteed.' },
  { term: 'Floor / Ceiling', definition: 'Floor is a safer low-end outcome. Ceiling is the big-game upside.' },
  { term: 'Ownership', definition: 'How popular a player is expected to be. Lower ownership can help you pass more people if that player hits.' },
  { term: 'Boom', definition: 'Chance the player has a big score compared with his normal projection.' },
  { term: 'Stack', definition: 'Pairing players whose success is connected, like QB plus WR or TE.' },
  { term: 'Bring-back', definition: 'A player from the opposing team added to a QB stack, hoping the game turns into a shootout.' },
  { term: 'GPP', definition: 'Tournament format. Harder to win, bigger prizes, ceiling matters.' },
  { term: 'Double-Up', definition: 'Safer format. Finish in the top half to cash, so steady projection matters more.' },
];

export default function HelpModal({ onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0, 0, 0, 0.72)',
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
          maxHeight: '86vh',
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
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>How to Play</div>
            <div style={{ color: '#777', fontSize: 12 }}>A quick glossary for the lineup screen.</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help"
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

        <div style={{
          background: '#0d1a2a',
          border: '1px solid #2a6ef555',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12,
          color: '#cfe0ff',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          Pick players you think will score well, stay under the cap, and use the contest type as your strategy clue:
          safer lineups for Double-Up, bigger upside and stacks for GPPs.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {terms.map(({ term, definition }) => (
            <div
              key={term}
              style={{
                background: '#171717',
                border: '1px solid #242424',
                borderRadius: 7,
                padding: '8px 10px',
              }}
            >
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 800, marginBottom: 2 }}>{term}</div>
              <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.35 }}>{definition}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
