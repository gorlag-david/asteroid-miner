import Phaser from 'phaser';

const TRAY_LEFT = 200;
const TRAY_RIGHT = 600;
const TRAY_TOP = 80;
const TRAY_BOTTOM = 560;
const TRAY_WIDTH = TRAY_RIGHT - TRAY_LEFT;
const WIN_ZONE_Y = TRAY_BOTTOM - 10;

function lerpColor(colorA, colorB, t) {
  const rA = (colorA >> 16) & 0xff;
  const gA = (colorA >> 8) & 0xff;
  const bA = colorA & 0xff;
  const rB = (colorB >> 16) & 0xff;
  const gB = (colorB >> 8) & 0xff;
  const bB = colorB & 0xff;
  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);
  return (r << 16) | (g << 8) | b;
}

export function drawTray(scene) {
  const g = scene.add.graphics();

  // Floor: depth gradient
  const floorHeight = TRAY_BOTTOM - TRAY_TOP;
  const stripCount = 24;
  const stripH = floorHeight / stripCount;
  const colorBack = 0x1a1a33;
  const colorFront = 0x2a2a55;

  for (let i = 0; i < stripCount; i++) {
    const t = i / (stripCount - 1);
    const color = lerpColor(colorBack, colorFront, t);
    g.fillStyle(color, 1);
    g.fillRect(TRAY_LEFT, TRAY_TOP + i * stripH, TRAY_WIDTH, stripH + 1);
  }

  // Felt-like dot texture
  const dotColors = [0x333355, 0x3a3a5a, 0x404060, 0x444466];
  for (let i = 0; i < 200; i++) {
    const px = TRAY_LEFT + ((i * 137 + 53) % TRAY_WIDTH);
    const py = TRAY_TOP + ((i * 211 + 97) % floorHeight);
    const colorIdx = i % dotColors.length;
    const alpha = 0.2 + (i % 5) * 0.05;
    g.fillStyle(dotColors[colorIdx], alpha);
    g.fillCircle(px, py, 1);
  }

  // Left rail
  const railW = 12;
  const railH = TRAY_BOTTOM - TRAY_TOP;
  g.fillStyle(0x333355, 1);
  g.fillRect(TRAY_LEFT - railW, TRAY_TOP, railW, railH);
  g.fillStyle(0x222233, 1);
  g.fillRect(TRAY_LEFT - railW, TRAY_TOP, 1, railH);
  g.fillStyle(0x666688, 1);
  g.fillRect(TRAY_LEFT - 1, TRAY_TOP, 1, railH);

  // Right rail
  g.fillStyle(0x333355, 1);
  g.fillRect(TRAY_RIGHT, TRAY_TOP, railW, railH);
  g.fillStyle(0x666688, 1);
  g.fillRect(TRAY_RIGHT, TRAY_TOP, 1, railH);
  g.fillStyle(0x222233, 1);
  g.fillRect(TRAY_RIGHT + railW - 1, TRAY_TOP, 1, railH);

  // Back wall gradient
  const backWallH = 14;
  const backWallTop = TRAY_TOP - backWallH;
  for (let row = 0; row < backWallH; row++) {
    const t = row / (backWallH - 1);
    const color = lerpColor(0x555577, 0x333355, t);
    g.fillStyle(color, 1);
    g.fillRect(TRAY_LEFT - railW, backWallTop + row, TRAY_WIDTH + railW * 2, 1);
  }
  g.fillStyle(0x777799, 1);
  g.fillRect(TRAY_LEFT - railW, backWallTop, TRAY_WIDTH + railW * 2, 1);

  // Win zone
  g.fillStyle(0x00ff88, 0.08);
  g.fillRect(TRAY_LEFT, TRAY_BOTTOM - 30, TRAY_WIDTH, 30);

  const neonLine = scene.add.graphics();
  neonLine.fillStyle(0x00ff88, 0.5);
  neonLine.fillRect(TRAY_LEFT, TRAY_BOTTOM - 2, TRAY_WIDTH, 2);
  neonLine.setDepth(-1);

  scene.tweens.add({
    targets: neonLine,
    alpha: { from: 0.3, to: 0.7 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
  });

  scene.add.text(TRAY_LEFT + TRAY_WIDTH / 2, TRAY_BOTTOM - 15, 'WIN ZONE', {
    fontSize: '10px', fontFamily: 'monospace', color: '#00ff88',
  }).setOrigin(0.5).setAlpha(0.4).setDepth(-1);

  // Drop zone coin slot
  const slotW = 60;
  const slotH = 8;
  const slotX = TRAY_LEFT + TRAY_WIDTH / 2 - slotW / 2;
  const slotY = TRAY_TOP;
  g.fillStyle(0x111122, 1);
  g.fillRect(slotX, slotY, slotW, slotH);
  g.lineStyle(1, 0x666688, 1);
  g.strokeRect(slotX, slotY, slotW, slotH);

  scene.add.text(TRAY_LEFT + TRAY_WIDTH / 2, TRAY_TOP - 20, 'DROP ZONE', {
    fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00',
  }).setOrigin(0.5).setAlpha(0.4).setDepth(-1);

  g.setDepth(-1);
  return g;
}

export function createWalls(scene, coins, prizes) {
  const leftWall = scene.physics.add.staticBody(TRAY_LEFT - 5, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);
  const rightWall = scene.physics.add.staticBody(TRAY_RIGHT - 5, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);
  const backWall = scene.physics.add.staticBody(TRAY_LEFT, TRAY_TOP - 5, TRAY_WIDTH, 10);

  scene.physics.add.collider(coins, leftWall);
  scene.physics.add.collider(coins, rightWall);
  scene.physics.add.collider(coins, backWall);
  scene.physics.add.collider(prizes, leftWall);
  scene.physics.add.collider(prizes, rightWall);
  scene.physics.add.collider(prizes, backWall);

  return { leftWall, rightWall, backWall };
}
