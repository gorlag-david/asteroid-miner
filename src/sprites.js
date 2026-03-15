/**
 * Procedural sprite generator — creates all game textures via Phaser Graphics.
 * Call generateAllTextures(scene) once during boot.
 */

export function generateAllTextures(scene) {
  if (scene.textures.exists('ship')) return; // already generated

  _generateShip(scene);
  _generateAsteroids(scene);
  _generateOre(scene);
  _generateFuelCell(scene);
  _generateBullet(scene);
  _generatePowerUps(scene);
}

// -- Ship: detailed fighter with hull panels, cockpit, and engine nozzle ------

function _generateShip(scene) {
  const s = 32;
  const g = scene.add.graphics();

  // Engine nozzle glow (back of ship)
  g.fillStyle(0xff4422, 0.4);
  g.fillCircle(s / 2, s - 4, 6);

  // Main hull — darker base
  g.fillStyle(0xc03050, 1);
  g.beginPath();
  g.moveTo(s / 2, 1);
  g.lineTo(s - 3, s - 4);
  g.lineTo(s / 2, s - 9);
  g.lineTo(3, s - 4);
  g.closePath();
  g.fillPath();

  // Hull highlight — lighter top
  g.fillStyle(0xe94560, 1);
  g.beginPath();
  g.moveTo(s / 2, 3);
  g.lineTo(s - 7, s - 7);
  g.lineTo(s / 2, s - 11);
  g.lineTo(7, s - 7);
  g.closePath();
  g.fillPath();

  // Cockpit canopy
  g.fillStyle(0x44ddff, 0.9);
  g.fillCircle(s / 2, 11, 3);

  // Cockpit glint
  g.fillStyle(0xaaeeff, 0.7);
  g.fillCircle(s / 2 - 1, 10, 1);

  // Wing stripes
  g.lineStyle(1, 0x882244, 0.6);
  g.lineBetween(8, s - 9, s / 2, 6);
  g.lineBetween(s - 8, s - 9, s / 2, 6);

  // Engine ports (two small rects at the back)
  g.fillStyle(0xff6633, 0.8);
  g.fillRect(s / 2 - 5, s - 5, 3, 3);
  g.fillRect(s / 2 + 2, s - 5, 3, 3);

  g.generateTexture('ship', s, s);
  g.destroy();
}

// -- Asteroids: rocky shapes with craters and surface detail ------------------

function _generateAsteroids(scene) {
  _generateAsteroid(scene, 'asteroid_large', 80, 36, 0x555577, 8);
  _generateAsteroid(scene, 'asteroid_medium', 48, 20, 0x666688, 5);
  _generateAsteroid(scene, 'asteroid_small', 28, 10, 0x777799, 3);
}

function _generateAsteroid(scene, key, texSize, radius, baseColor, craterCount) {
  const g = scene.add.graphics();
  const cx = texSize / 2;
  const cy = texSize / 2;

  // Generate irregular polygon vertices
  const segments = 12;
  const points = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // Vary radius 75%-100% for rocky look
    const r = radius * (0.75 + _seededRandom(key, i) * 0.25);
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  // Shadow/base layer (darker, offset slightly)
  const r = (baseColor >> 16) & 0xff;
  const gr = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  const darkColor = ((Math.max(0, r - 40)) << 16) | ((Math.max(0, gr - 40)) << 8) | Math.max(0, b - 40);
  g.fillStyle(darkColor, 1);
  g.beginPath();
  g.moveTo(points[0].x + 2, points[0].y + 2);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x + 2, points[i].y + 2);
  }
  g.closePath();
  g.fillPath();

  // Main body
  g.fillStyle(baseColor, 1);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.closePath();
  g.fillPath();

  // Light edge highlight (top-left bias)
  const lightColor = ((Math.min(255, r + 30)) << 16) | ((Math.min(255, gr + 30)) << 8) | Math.min(255, b + 30);
  g.lineStyle(1, lightColor, 0.4);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i <= Math.floor(segments / 3); i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.strokePath();

  // Craters
  for (let i = 0; i < craterCount; i++) {
    const angle = _seededRandom(key, i + 100) * Math.PI * 2;
    const dist = _seededRandom(key, i + 200) * radius * 0.6;
    const craterX = cx + Math.cos(angle) * dist;
    const craterY = cy + Math.sin(angle) * dist;
    const craterR = 1.5 + _seededRandom(key, i + 300) * (radius * 0.12);

    // Crater shadow
    g.fillStyle(darkColor, 0.6);
    g.fillCircle(craterX + 1, craterY + 1, craterR);

    // Crater
    g.fillStyle(darkColor, 0.4);
    g.fillCircle(craterX, craterY, craterR);
  }

  // Outline
  g.lineStyle(1, lightColor, 0.2);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.closePath();
  g.strokePath();

  g.generateTexture(key, texSize, texSize);
  g.destroy();
}

// -- Ore: glowing crystal with facets -----------------------------------------

function _generateOre(scene) {
  const s = 16;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Outer glow
  g.fillStyle(0xffcc00, 0.15);
  g.fillCircle(cx, cy, 7);

  // Crystal body — hexagonal
  g.fillStyle(0xffaa00, 1);
  g.beginPath();
  g.moveTo(cx, cy - 6);
  g.lineTo(cx + 5, cy - 2);
  g.lineTo(cx + 5, cy + 2);
  g.lineTo(cx, cy + 6);
  g.lineTo(cx - 5, cy + 2);
  g.lineTo(cx - 5, cy - 2);
  g.closePath();
  g.fillPath();

  // Top facet (lighter)
  g.fillStyle(0xffdd44, 1);
  g.beginPath();
  g.moveTo(cx, cy - 6);
  g.lineTo(cx + 5, cy - 2);
  g.lineTo(cx, cy);
  g.lineTo(cx - 5, cy - 2);
  g.closePath();
  g.fillPath();

  // Specular highlight
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 1, cy - 3, 1.5);

  // Outline
  g.lineStyle(1, 0xcc8800, 0.6);
  g.beginPath();
  g.moveTo(cx, cy - 6);
  g.lineTo(cx + 5, cy - 2);
  g.lineTo(cx + 5, cy + 2);
  g.lineTo(cx, cy + 6);
  g.lineTo(cx - 5, cy + 2);
  g.lineTo(cx - 5, cy - 2);
  g.closePath();
  g.strokePath();

  g.generateTexture('ore', s, s);
  g.destroy();
}

// -- Fuel cell: green canister with detail ------------------------------------

function _generateFuelCell(scene) {
  const s = 16;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Outer glow
  g.fillStyle(0x00ff88, 0.15);
  g.fillCircle(cx, cy, 7);

  // Canister body
  g.fillStyle(0x009955, 1);
  g.fillRoundedRect(cx - 4, cy - 5, 8, 10, 2);

  // Canister highlight
  g.fillStyle(0x00cc66, 1);
  g.fillRoundedRect(cx - 3, cy - 4, 4, 8, 1);

  // Cap top
  g.fillStyle(0x00ff88, 1);
  g.fillRect(cx - 3, cy - 6, 6, 2);

  // Cap bottom
  g.fillStyle(0x00ff88, 1);
  g.fillRect(cx - 3, cy + 4, 6, 2);

  // "F" label
  g.fillStyle(0xffffff, 0.7);
  g.fillRect(cx - 1, cy - 2, 3, 1);
  g.fillRect(cx - 1, cy, 2, 1);
  g.fillRect(cx - 1, cy - 2, 1, 5);

  g.generateTexture('fuel_cell', s, s);
  g.destroy();
}

// -- Bullet: bright energy bolt -----------------------------------------------

function _generateBullet(scene) {
  const s = 8;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Outer glow
  g.fillStyle(0xaaccff, 0.3);
  g.fillCircle(cx, cy, 4);

  // Core
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx, cy, 2);

  // Inner bright spot
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(cx, cy, 1);

  g.generateTexture('bullet', s, s);
  g.destroy();

  // Spread bullet variant (magenta)
  const g2 = scene.add.graphics();
  g2.fillStyle(0xff44ff, 0.3);
  g2.fillCircle(cx, cy, 4);
  g2.fillStyle(0xff88ff, 1);
  g2.fillCircle(cx, cy, 2);
  g2.fillStyle(0xffffff, 0.8);
  g2.fillCircle(cx, cy, 1);
  g2.generateTexture('bullet_spread', s, s);
  g2.destroy();
}

// -- Power-ups: distinct icons for each type ----------------------------------

function _generatePowerUps(scene) {
  _generatePowerUpRapidFire(scene);
  _generatePowerUpShield(scene);
  _generatePowerUpSpread(scene);
}

function _generatePowerUpRapidFire(scene) {
  const s = 20;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Background diamond
  g.fillStyle(0xffdd00, 0.2);
  _drawDiamond(g, cx, cy, 9);

  g.fillStyle(0xffdd00, 1);
  _drawDiamond(g, cx, cy, 7);

  // Lightning bolt icon
  g.fillStyle(0x332200, 0.8);
  g.beginPath();
  g.moveTo(cx + 1, cy - 4);
  g.lineTo(cx - 2, cy + 1);
  g.lineTo(cx, cy + 1);
  g.lineTo(cx - 1, cy + 4);
  g.lineTo(cx + 2, cy - 1);
  g.lineTo(cx, cy - 1);
  g.closePath();
  g.fillPath();

  g.lineStyle(1, 0xcc9900, 0.5);
  _strokeDiamond(g, cx, cy, 7);

  g.generateTexture('powerup_rapidfire', s, s);
  g.destroy();
}

function _generatePowerUpShield(scene) {
  const s = 20;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Background diamond
  g.fillStyle(0x00ddff, 0.2);
  _drawDiamond(g, cx, cy, 9);

  g.fillStyle(0x00ddff, 1);
  _drawDiamond(g, cx, cy, 7);

  // Shield icon
  g.fillStyle(0x003344, 0.8);
  g.beginPath();
  g.moveTo(cx, cy - 3);
  g.lineTo(cx + 3, cy - 1);
  g.lineTo(cx + 3, cy + 1);
  g.lineTo(cx, cy + 4);
  g.lineTo(cx - 3, cy + 1);
  g.lineTo(cx - 3, cy - 1);
  g.closePath();
  g.fillPath();

  // Shield highlight
  g.fillStyle(0x44eeff, 0.4);
  g.beginPath();
  g.moveTo(cx, cy - 3);
  g.lineTo(cx + 3, cy - 1);
  g.lineTo(cx, cy);
  g.lineTo(cx - 3, cy - 1);
  g.closePath();
  g.fillPath();

  g.lineStyle(1, 0x008899, 0.5);
  _strokeDiamond(g, cx, cy, 7);

  g.generateTexture('powerup_shield', s, s);
  g.destroy();
}

function _generatePowerUpSpread(scene) {
  const s = 20;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Background diamond
  g.fillStyle(0xff44ff, 0.2);
  _drawDiamond(g, cx, cy, 9);

  g.fillStyle(0xff44ff, 1);
  _drawDiamond(g, cx, cy, 7);

  // Triple-dot spread icon
  g.fillStyle(0x330033, 0.8);
  g.fillCircle(cx, cy - 2, 1.5);
  g.fillCircle(cx - 3, cy + 2, 1.5);
  g.fillCircle(cx + 3, cy + 2, 1.5);

  // Lines from center
  g.lineStyle(1, 0x330033, 0.6);
  g.lineBetween(cx, cy, cx, cy - 2);
  g.lineBetween(cx, cy, cx - 3, cy + 2);
  g.lineBetween(cx, cy, cx + 3, cy + 2);

  g.lineStyle(1, 0x993399, 0.5);
  _strokeDiamond(g, cx, cy, 7);

  g.generateTexture('powerup_spread', s, s);
  g.destroy();
}

// -- Helpers ------------------------------------------------------------------

function _drawDiamond(g, cx, cy, r) {
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r * 0.7, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r * 0.7, cy);
  g.closePath();
  g.fillPath();
}

function _strokeDiamond(g, cx, cy, r) {
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r * 0.7, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r * 0.7, cy);
  g.closePath();
  g.strokePath();
}

// Simple seeded random for deterministic asteroid shapes
function _seededRandom(key, index) {
  let hash = 0;
  const str = key + String(index);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return ((hash & 0x7fffffff) % 1000) / 1000;
}
