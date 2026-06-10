import { useEffect, useState } from 'react';
import type { NewsEvent } from '../types';

interface Props {
  event: NewsEvent;
  onDismiss: () => void;
}

export default function NewsToast({ event, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 400); }, 7000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isPositive = event.projectionDelta > 0;

  return (
    <div
      style={{
        position: 'fixed', top: 70, left: '50%', transform: `translateX(-50%) translateY(${visible ? 0 : -20}px)`,
        opacity: visible ? 1 : 0, transition: 'all 0.3s ease',
        background: '#1a1a1a', border: `1px solid ${isPositive ? '#27ae60' : '#e74c3c'}`,
        borderRadius: 10, padding: '10px 16px', maxWidth: 340, width: '90vw',
        zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: isPositive ? '#27ae60' : '#e74c3c', marginBottom: 4, fontWeight: 700 }}>
            ⚡ BREAKING NEWS
          </div>
          <div style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 600, marginBottom: 4 }}>{event.headline}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{event.detail}</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, marginLeft: 8 }}>×</button>
      </div>
    </div>
  );
}
