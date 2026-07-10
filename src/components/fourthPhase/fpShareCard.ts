import type { RunShareCardData } from '../../lib/fourthPhase';

// Canvas-rendered 1080x1350 share card for a finished run. Kept out of the Lab
// so the art pass can restyle it alongside the on-screen cards.
export function renderShareCard(data: RunShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));

  ctx.fillStyle = '#141821';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#102a1b';
  for (let x = 0; x < canvas.width; x += 96) {
    ctx.fillRect(x, 0, 48, canvas.height);
  }
  ctx.fillStyle = 'rgba(217,164,65,0.16)';
  ctx.fillRect(0, 0, canvas.width, 190);
  ctx.fillRect(0, 1160, canvas.width, 190);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d9a441';
  ctx.font = '900 44px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('FOURTH PHASE', 540, 96);

  ctx.fillStyle = data.outcome === 'W' ? '#34c771' : '#e26d83';
  ctx.font = '950 96px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(data.outcome === 'W' ? 'RUN WON' : 'RUN OVER', 540, 230);

  ctx.fillStyle = '#e8edf4';
  ctx.font = '950 170px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillText(String(data.score), 540, 430);
  ctx.fillStyle = '#aeb7c6';
  ctx.font = '800 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Drive Score', 540, 485);

  const rows = [
    ['Team', data.team],
    ['Boss', data.boss],
    ['Best Play', `${data.bestPlay}`],
    ['Run Code', data.runCode],
  ];
  ctx.textAlign = 'left';
  let y = 590;
  for (const [label, value] of rows) {
    ctx.fillStyle = '#7f8a99';
    ctx.font = '900 28px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(label.toUpperCase(), 130, y);
    ctx.fillStyle = '#e8edf4';
    ctx.font = '900 38px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(value, 340, y);
    y += 80;
  }

  ctx.fillStyle = '#d9a441';
  ctx.font = '900 34px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(data.cashIn || 'No signature cash-in', 130, 940);
  ctx.fillStyle = '#e8edf4';
  ctx.font = '800 32px system-ui, -apple-system, Segoe UI, sans-serif';
  wrapCanvasText(ctx, data.story, 130, 1010, 820, 42);

  ctx.fillStyle = '#a987ff';
  ctx.font = '900 28px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`Sideline: ${data.jokers.join(' / ') || 'none'}`, 130, 1210);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not render share card'));
    }, 'image/png');
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}
