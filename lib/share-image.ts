// Canvas-rendered share image. Colors mirror the CSS tokens in
// app/globals.css — hardcoded here since a canvas can't read CSS custom
// properties, so keep these in sync if the theme palette ever changes.
const COLORS = {
  background: "#17111b",
  card: "#241b2b",
  foreground: "#f3ecef",
  muted: "#9a8aa2",
  correct: "#7fb069",
  present: "#e8c468",
  absent: "#4a3f52",
  accent: "#f2a05c",
};

const LOGO_TILES: { char: string; bg: string; fg: string }[] = [
  { char: "W", bg: COLORS.accent, fg: COLORS.background },
  { char: "O", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "R", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "D", bg: COLORS.correct, fg: COLORS.background },
  { char: "L", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "Y", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
];

const MAX_ATTEMPTS = 6;

export type ImageFormat = "square" | "story";

export const IMAGE_DIMENSIONS: Record<ImageFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

export interface ShareImageData {
  rows: number[][];
  wordNumber: number;
  dateShort: string;
  attempts: number;
  username: string;
  streak: number;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Always draws MAX_ATTEMPTS rows, not just the guesses actually made — rows
// past the last guess render as empty/pending cells (outline only), matching
// the live board instead of cropping the grid down to just the used rows.
function drawGrid(ctx: CanvasRenderingContext2D, rows: number[][], x: number, y: number, tile: number, gap: number) {
  const radius = tile * 0.22;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const row = rows[i];
    for (let j = 0; j < 5; j++) {
      const cellX = x + j * (tile + gap);
      const cellY = y + i * (tile + gap);
      const value = row?.[j];

      if (value === undefined) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        roundRect(ctx, cellX, cellY, tile, tile, radius);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 2;
        roundRect(ctx, cellX + 1, cellY + 1, tile - 2, tile - 2, radius);
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = value === 1 ? COLORS.correct : value === -1 ? COLORS.present : COLORS.absent;
      roundRect(ctx, cellX, cellY, tile, tile, radius);
      ctx.fill();
    }
  }
}

function gridSize(tile: number, gap: number) {
  return { width: 5 * tile + 4 * gap, height: MAX_ATTEMPTS * tile + (MAX_ATTEMPTS - 1) * gap };
}

export function renderShareImage(canvas: HTMLCanvasElement, data: ShareImageData, format: ImageFormat) {
  const { width, height } = IMAGE_DIMENSIONS[format];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  const pad = format === "square" ? 80 : 96;
  const cardX = pad;
  const cardW = width - pad * 2;
  const innerPad = format === "square" ? 56 : 72;

  // Logo row + puzzle meta
  const logoTile = format === "square" ? 40 : 48;
  const logoGap = 6;
  const logoToGridGap = format === "square" ? 64 : 96;
  const tile = format === "square" ? 44 : 56;
  const gridGap = 12;
  const grid = gridSize(tile, gridGap);

  // Card height fits the actual content (logo row + the full 6-row grid,
  // padding included) instead of a fixed near-full-canvas height that left a
  // lot of empty space below the grid. The story format stacks stats below
  // the grid, so its content also includes that block's height.
  const statsBlockH = format === "square" ? 0 : 90 + 64 + 46 + 34;
  const contentH = logoTile + logoToGridGap + grid.height + statsBlockH;
  const cardH = innerPad * 2 + contentH;
  const cardY = Math.max(pad, (height - cardH) / 2);

  ctx.fillStyle = COLORS.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, 48);
  ctx.fill();

  let cursorY = cardY + innerPad;
  let logoX = cardX + innerPad;
  ctx.font = `700 ${logoTile * 0.5}px Sora, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const tile of LOGO_TILES) {
    ctx.fillStyle = tile.bg.startsWith("rgba") ? "rgba(255,255,255,0.08)" : tile.bg;
    roundRect(ctx, logoX, cursorY, logoTile, logoTile, logoTile * 0.28);
    ctx.fill();
    ctx.fillStyle = tile.fg;
    ctx.fillText(tile.char, logoX + logoTile / 2, cursorY + logoTile / 2 + 1);
    logoX += logoTile + logoGap;
  }

  ctx.font = `500 ${format === "square" ? 24 : 28}px Sora, sans-serif`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "right";
  ctx.fillText(`No. ${data.wordNumber} · ${data.dateShort}`, cardX + cardW - innerPad, cursorY + logoTile / 2 + 1);

  cursorY += logoTile + logoToGridGap;

  // Grid + stats
  if (format === "square") {
    const statsX = cardX + innerPad + grid.width + 52;
    drawGrid(ctx, data.rows, cardX + innerPad, cursorY, tile, gridGap);

    let statsY = cursorY + grid.height / 2 - 70;
    ctx.textAlign = "left";
    ctx.font = "700 60px Sora, sans-serif";
    ctx.fillStyle = COLORS.foreground;
    ctx.fillText(`${data.attempts} / 6`, statsX, statsY);
    statsY += 52;
    ctx.font = "500 26px Sora, sans-serif";
    ctx.fillStyle = "#c9bfcc";
    ctx.fillText(`${data.username} · ${data.streak} day streak`, statsX, statsY);
    statsY += 36;
    ctx.font = "500 24px Sora, sans-serif";
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("wordly.app", statsX, statsY);
  } else {
    const gridX = cardX + (cardW - grid.width) / 2;
    drawGrid(ctx, data.rows, gridX, cursorY, tile, gridGap);

    let statsY = cursorY + grid.height + 90;
    ctx.textAlign = "center";
    ctx.font = "700 84px Sora, sans-serif";
    ctx.fillStyle = COLORS.foreground;
    ctx.fillText(`${data.attempts} / 6`, cardX + cardW / 2, statsY);
    statsY += 64;
    ctx.font = "500 32px Sora, sans-serif";
    ctx.fillStyle = "#c9bfcc";
    ctx.fillText(`${data.username} · ${data.streak} day streak`, cardX + cardW / 2, statsY);
    statsY += 46;
    ctx.font = "500 28px Sora, sans-serif";
    ctx.fillStyle = COLORS.muted;
    ctx.fillText("wordly.app", cardX + cardW / 2, statsY);
  }
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
