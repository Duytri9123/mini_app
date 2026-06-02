/**
 * RlsMapCanvasService — vẽ marker MapLibre bằng Canvas API.
 *
 * Hai loại marker:
 *  - `drawUserMarker`  — avatar tròn với ring gradient + pulse (vị trí người dùng / bạn bè)
 *  - `drawPlaceMarker` — icon category + label + badge count (địa điểm)
 *
 * Trả về HTMLCanvasElement đã vẽ sẵn, dùng làm `element` cho `maplibregl.Marker`.
 * Canvas được vẽ ở độ phân giải 2× (devicePixelRatio) để sắc nét trên màn hình Retina.
 */
import { Injectable } from '@angular/core';

/** Màu ring theo loại địa điểm. */
const PLACE_COLORS: Record<string, [string, string]> = {
  food:      ['#fb923c', '#fbbf24'],
  cafe:      ['#f472b6', '#e879f9'],
  event:     ['#a78bfa', '#818cf8'],
  nightlife: ['#f43f5e', '#fb7185'],
  campus:    ['#34d399', '#6ee7b7'],
  hot_area:  ['#ef4444', '#f97316'],
  default:   ['#00fbfb', '#7c5fff'],
};

/** Emoji icon theo loại địa điểm. */
const PLACE_ICONS: Record<string, string> = {
  food:      '🍜',
  cafe:      '☕',
  event:     '🎉',
  nightlife: '🎵',
  campus:    '🏫',
  hot_area:  '🔥',
  default:   '📍',
};

@Injectable({ providedIn: 'root' })
export class RlsMapCanvasService {

  // ─────────────────────────────── User marker ────────────────────────────────

  /**
   * Vẽ marker người dùng / bạn bè.
   * @param avatarUrl  URL ảnh avatar (null → vẽ placeholder)
   * @param isLive     Có đang online/active không (thêm ring pulse + badge LIVE)
   * @param size       Đường kính vùng avatar (px, mặc định 48)
   */
  drawUserMarker(
    avatarUrl: string | null | undefined,
    _isLive = false,
    size = 36,
  ): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const ringW = 2.5;         // độ dày ring
    const pad   = ringW + 2;   // padding đủ để ring không bị cắt
    const totalW = size + pad * 2;
    const totalH = totalW;

    const canvas = document.createElement('canvas');
    canvas.width  = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width  = `${totalW}px`;
    canvas.style.height = `${totalH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const cx = totalW / 2;
    const cy = totalW / 2;
    const r  = size / 2;

    // ── Gradient ring ──────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0,   '#00fbfb');
    grad.addColorStop(0.5, '#7c5fff');
    grad.addColorStop(1,   '#ff59be');

    ctx.beginPath();
    ctx.arc(cx, cy, r + ringW, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringW * 2;
    ctx.stroke();

    // ── Clip vòng tròn cho avatar ──────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.clip();

    if (avatarUrl) {
      this.drawImageInContext(ctx, avatarUrl, cx - r + 1, cy - r + 1, (r - 1) * 2, (r - 1) * 2);
    } else {
      // Placeholder gradient
      const bg = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r);
      bg.addColorStop(0, '#1e2a4a');
      bg.addColorStop(1, '#0d1228');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Silhouette người
      ctx.fillStyle = 'rgba(0,251,251,0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.18, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.38, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return canvas;
  }

  // ─────────────────────────────── Place marker ───────────────────────────────

  /**
   * Vẽ marker địa điểm.
   * @param type         Loại địa điểm (food/cafe/event/...)
   * @param label        Tên địa điểm (hiện bên dưới)
   * @param count        Số người đang ở đây (0 = ẩn badge)
   * @param thumbnailUrl Ảnh thumbnail (null → dùng emoji icon)
   */
  drawPlaceMarker(
    type: string,
    label?: string | null,
    count = 0,
    thumbnailUrl?: string | null,
  ): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const iconSize = 32;
    const ringW = 1.5;
    const labelPad = 4;
    const labelFontSize = 9;
    const labelLineH = labelFontSize + 4;
    const hasLabel = !!label;
    const hasCount = count > 1;

    // Tính chiều cao canvas
    const totalW = iconSize + ringW * 2 + 8;
    const labelW = hasLabel ? Math.min(label!.length * 6.5 + labelPad * 2, 90) : 0;
    const canvasW = Math.max(totalW, labelW);
    const canvasH = totalW + (hasLabel ? labelLineH + 4 : 0);

    const canvas = document.createElement('canvas');
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const cx = canvasW / 2;
    const cy = totalW / 2;
    const r  = iconSize / 2;

    const [c1, c2] = PLACE_COLORS[type] ?? PLACE_COLORS['default'];

    // ── Shadow + Ring gradient (isolated) ─────────────────────────────────
    ctx.save();
    ctx.shadowColor = c1 + '88';
    ctx.shadowBlur  = 10;

    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    ctx.beginPath();
    ctx.arc(cx, cy, r + ringW, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringW * 2;
    ctx.stroke();
    ctx.restore(); // ← shadow bị xoá hoàn toàn sau đây

    // ── Nền tròn ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.clip();

    if (thumbnailUrl) {
      this.drawImageInContext(ctx, thumbnailUrl, cx - r + 1, cy - r + 1, (r - 1) * 2, (r - 1) * 2);
    } else {
      // Nền tối gradient
      const bg = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
      bg.addColorStop(0, '#1a2040');
      bg.addColorStop(1, '#0d1228');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Emoji icon
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.clip();
      const icon = PLACE_ICONS[type] ?? PLACE_ICONS['default'];
      ctx.font = `${iconSize * 0.46}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, cx, cy + 1);
    }
    ctx.restore();

    // ── Badge count (top-right) ────────────────────────────────────────────
    if (hasCount) {
      const countStr = count > 99 ? '99+' : String(count);
      const bw = Math.max(14, countStr.length * 5.5 + 5);
      const bh = 13;
      const bx = cx + r - 2;
      const by = cy - r - bh / 2 + 4;

      ctx.fillStyle = c1;
      this.roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();

      ctx.strokeStyle = '#0d1228';
      ctx.lineWidth = 1;
      this.roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold 7.5px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countStr, bx + bw / 2, by + bh / 2);
    }

    // ── Label bên dưới ────────────────────────────────────────────────────
    if (hasLabel) {
      const ly = totalW + 2;
      const lw = Math.min(label!.length * 6.5 + labelPad * 2, 90);
      const lh = labelLineH;
      const lx = cx - lw / 2;

      // Nền pill
      ctx.fillStyle = 'rgba(10, 14, 33, 0.88)';
      ctx.strokeStyle = c1 + '55';
      ctx.lineWidth = 1;
      this.roundRect(ctx, lx, ly, lw, lh, 5);
      ctx.fill();
      this.roundRect(ctx, lx, ly, lw, lh, 5);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${labelFontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate nếu quá dài
      let displayLabel = label!;
      const maxW = lw - labelPad * 2;
      while (ctx.measureText(displayLabel).width > maxW && displayLabel.length > 3) {
        displayLabel = displayLabel.slice(0, -1);
      }
      if (displayLabel !== label) displayLabel += '…';

      ctx.fillText(displayLabel, cx, ly + lh / 2);
    }

    return canvas;
  }

  // ─────────────────────────────── Helpers ────────────────────────────────────

  /**
   * Vẽ ảnh từ URL vào context (async — ảnh load xong mới vẽ, canvas đã mount rồi).
   * Dùng Image() để load, sau đó drawImage vào canvas đã có.
   */
  private drawImageInContext(
    ctx: CanvasRenderingContext2D,
    url: string,
    x: number, y: number, w: number, h: number,
  ): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Vẽ lại sau khi ảnh load — canvas vẫn còn trong DOM marker
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    };
    img.src = url;
  }

  /** Vẽ hình chữ nhật bo góc (polyfill cho ctx.roundRect). */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
