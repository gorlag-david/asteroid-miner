/**
 * Procedural sprite generator for Coin Pusher game.
 * Call generateCoinPusherTextures(scene) once during boot.
 */

export function generateCoinPusherTextures(scene) {
  if (scene.textures.exists('coin')) return;

  _generateCoin(scene);
  _generatePusher(scene);
  _generateGem(scene);
  _generateSpecialToken(scene);
  _generateRuby(scene);
  _generateDiamond(scene);
  _generateCrown(scene);
  _generateBumper(scene);
  _generateCoinParticle(scene);
}

// -- Coin: gold circle with embossed "C", thick rim, inner detail -----------

function _generateCoin(scene) {
  const s = 24;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(0x996600, 0.4);
  g.fillCircle(cx + 2, cy + 2, 10);

  g.fillStyle(0xcc8800, 1);
  g.fillCircle(cx, cy, 10);

  g.fillStyle(0xffcc00, 1);
  g.fillCircle(cx, cy, 8);

  g.lineStyle(0.5, 0xcc8800, 0.4);
  g.strokeCircle(cx, cy, 6);

  g.lineStyle(1.5, 0xcc8800, 0.6);
  g.beginPath();
  g.arc(cx, cy, 4, -Math.PI * 0.7, Math.PI * 0.7, true);
  g.strokePath();

  g.fillStyle(0xffee66, 0.7);
  g.fillCircle(cx - 2, cy - 2, 4);

  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 3, cy - 3, 1.5);

  g.lineStyle(1.5, 0xaa7700, 0.5);
  g.strokeCircle(cx, cy, 10);

  g.generateTexture('coin', s, s);
  g.destroy();
}

// -- Pusher: metallic platform with rivets and beveled edges ----------------

function _generatePusher(scene) {
  const w = 200;
  const h = 20;
  const g = scene.add.graphics();

  g.fillStyle(0x333333, 0.5);
  g.fillRect(2, 2, w, h);

  g.fillStyle(0x777788, 1);
  g.fillRect(0, 0, w, h);

  g.fillStyle(0x888899, 1);
  g.fillRect(0, 4, w, 12);

  g.fillStyle(0xaaaacc, 1);
  g.fillRect(0, 2, w, 6);

  g.fillStyle(0xccccdd, 0.7);
  g.fillRect(0, 0, w, 1);

  g.fillStyle(0x444455, 0.7);
  g.fillRect(0, h - 1, w, 1);

  const rivetSpacing = w / 6;
  for (let i = 1; i <= 5; i++) {
    const rx = rivetSpacing * i;
    const ry = h / 2;
    g.fillStyle(0x555566, 0.8);
    g.fillCircle(rx + 0.5, ry + 0.5, 2.5);
    g.fillStyle(0x999aaa, 1);
    g.fillCircle(rx, ry, 2.5);
    g.fillStyle(0xccccdd, 0.6);
    g.fillCircle(rx - 0.5, ry - 0.5, 1);
  }

  g.lineStyle(1, 0x555566, 0.8);
  g.strokeRect(0, 0, w, h);

  g.generateTexture('pusher', w, h);
  g.destroy();
}

// -- Gem: hexagonal cut with refraction lines -------------------------------

function _generateGem(scene) {
  const s = 18;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(0x00ff88, 0.15);
  g.fillCircle(cx, cy, 8);

  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    hexPoints.push({ x: cx + Math.cos(angle) * 7, y: cy + Math.sin(angle) * 7 });
  }

  g.fillStyle(0x00cc66, 1);
  g.beginPath();
  g.moveTo(hexPoints[0].x, hexPoints[0].y);
  for (let i = 1; i < hexPoints.length; i++) g.lineTo(hexPoints[i].x, hexPoints[i].y);
  g.closePath();
  g.fillPath();

  g.fillStyle(0x44ffaa, 1);
  g.beginPath();
  g.moveTo(hexPoints[0].x, hexPoints[0].y);
  g.lineTo(hexPoints[1].x, hexPoints[1].y);
  g.lineTo(cx, cy);
  g.lineTo(hexPoints[5].x, hexPoints[5].y);
  g.closePath();
  g.fillPath();

  g.lineStyle(0.8, 0x88ffcc, 0.5);
  g.lineBetween(cx - 4, cy - 3, cx + 4, cy + 3);
  g.lineBetween(cx + 4, cy - 3, cx - 4, cy + 3);

  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 1, cy - 3, 1.5);

  g.lineStyle(1, 0x008844, 0.6);
  g.beginPath();
  g.moveTo(hexPoints[0].x, hexPoints[0].y);
  for (let i = 1; i < hexPoints.length; i++) g.lineTo(hexPoints[i].x, hexPoints[i].y);
  g.closePath();
  g.strokePath();

  g.generateTexture('gem', s, s);
  g.destroy();
}

// -- Special token: star-shaped prize piece with radiating rays -------------

function _generateSpecialToken(scene) {
  const s = 22;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(0xff44ff, 0.25);
  g.fillCircle(cx, cy, 10);

  g.lineStyle(1, 0xff88ff, 0.4);
  g.lineBetween(cx, cy - 10, cx, cy + 10);
  g.lineBetween(cx - 10, cy, cx + 10, cy);
  g.lineBetween(cx - 7, cy - 7, cx + 7, cy + 7);
  g.lineBetween(cx + 7, cy - 7, cx - 7, cy + 7);

  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 8 : 4;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }

  g.fillStyle(0xff44ff, 1);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xff88ff, 0.6);
  g.fillCircle(cx - 1, cy - 1, 3);

  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(cx - 2, cy - 2, 1);

  g.generateTexture('special_token', s, s);
  g.destroy();
}

// -- Ruby: red octagonal gem ------------------------------------------------

function _generateRuby(scene) {
  const s = 20;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  const octPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    octPoints.push({ x: cx + Math.cos(angle) * 8, y: cy + Math.sin(angle) * 8 });
  }

  g.fillStyle(0xcc2222, 1);
  g.beginPath();
  g.moveTo(octPoints[0].x, octPoints[0].y);
  for (let i = 1; i < octPoints.length; i++) g.lineTo(octPoints[i].x, octPoints[i].y);
  g.closePath();
  g.fillPath();

  const innerOctPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
    innerOctPoints.push({ x: cx + Math.cos(angle) * 5.5, y: cy + Math.sin(angle) * 5.5 });
  }

  g.fillStyle(0xff4444, 1);
  g.beginPath();
  g.moveTo(innerOctPoints[0].x, innerOctPoints[0].y);
  for (let i = 1; i < innerOctPoints.length; i++) g.lineTo(innerOctPoints[i].x, innerOctPoints[i].y);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xff6666, 0.8);
  g.beginPath();
  g.moveTo(innerOctPoints[0].x, innerOctPoints[0].y);
  g.lineTo(innerOctPoints[1].x, innerOctPoints[1].y);
  g.lineTo(cx, cy);
  g.lineTo(innerOctPoints[7].x, innerOctPoints[7].y);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 2, cy - 2, 1.5);

  g.lineStyle(1, 0x881111, 0.8);
  g.beginPath();
  g.moveTo(octPoints[0].x, octPoints[0].y);
  for (let i = 1; i < octPoints.length; i++) g.lineTo(octPoints[i].x, octPoints[i].y);
  g.closePath();
  g.strokePath();

  g.generateTexture('ruby', s, s);
  g.destroy();
}

// -- Diamond: white/cyan brilliant-cut shape --------------------------------

function _generateDiamond(scene) {
  const s = 22;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(0xbbffff, 1);
  g.beginPath();
  g.moveTo(cx, cy - 9);
  g.lineTo(cx + 8, cy - 1);
  g.lineTo(cx - 8, cy - 1);
  g.closePath();
  g.fillPath();

  g.fillStyle(0x88eeff, 1);
  g.beginPath();
  g.moveTo(cx - 8, cy - 1);
  g.lineTo(cx + 8, cy - 1);
  g.lineTo(cx, cy + 9);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xbbffff, 0.6);
  g.beginPath();
  g.moveTo(cx, cy - 9);
  g.lineTo(cx + 3, cy - 1);
  g.lineTo(cx - 3, cy - 1);
  g.closePath();
  g.fillPath();

  g.lineStyle(0.7, 0xffffff, 0.3);
  g.lineBetween(cx - 4, cy - 1, cx, cy + 6);
  g.lineBetween(cx + 4, cy - 1, cx, cy + 6);
  g.lineBetween(cx - 2, cy - 5, cx + 2, cy - 1);

  g.lineStyle(1, 0x44aacc, 0.8);
  g.beginPath();
  g.moveTo(cx, cy - 9);
  g.lineTo(cx + 8, cy - 1);
  g.lineTo(cx, cy + 9);
  g.lineTo(cx - 8, cy - 1);
  g.closePath();
  g.strokePath();

  g.lineBetween(cx - 8, cy - 1, cx + 8, cy - 1);

  g.generateTexture('diamond', s, s);
  g.destroy();
}

// -- Crown: gold crown with gem dots ----------------------------------------

function _generateCrown(scene) {
  const s = 24;
  const g = scene.add.graphics();
  const cx = s / 2;

  g.fillStyle(0xddaa00, 1);
  g.fillRect(3, 14, 18, 6);

  g.fillStyle(0xffcc00, 1);
  g.beginPath();
  g.moveTo(3, 14);
  g.lineTo(6, 4);
  g.lineTo(9, 11);
  g.lineTo(cx, 2);
  g.lineTo(15, 11);
  g.lineTo(18, 4);
  g.lineTo(21, 14);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xffdd44, 0.7);
  g.fillCircle(6, 5, 1.5);
  g.fillCircle(cx, 3, 1.5);
  g.fillCircle(18, 5, 1.5);

  g.fillStyle(0xff2222, 1);
  g.fillCircle(7, 17, 1.5);
  g.fillStyle(0x2244ff, 1);
  g.fillCircle(cx, 17, 1.5);
  g.fillStyle(0x22cc44, 1);
  g.fillCircle(17, 17, 1.5);

  g.lineStyle(1, 0xaa8800, 0.8);
  g.beginPath();
  g.moveTo(3, 20);
  g.lineTo(3, 14);
  g.lineTo(6, 4);
  g.lineTo(9, 11);
  g.lineTo(cx, 2);
  g.lineTo(15, 11);
  g.lineTo(18, 4);
  g.lineTo(21, 14);
  g.lineTo(21, 20);
  g.closePath();
  g.strokePath();

  g.generateTexture('crown', s, s);
  g.destroy();
}

// -- Bumper: circular metallic bumper with concentric rings -----------------

function _generateBumper(scene) {
  const s = 28;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.lineStyle(2, 0x444466, 1);
  g.strokeCircle(cx, cy, 12);

  g.fillStyle(0x666688, 1);
  g.fillCircle(cx, cy, 12);

  g.fillStyle(0x8888aa, 1);
  g.fillCircle(cx, cy, 8);

  g.fillStyle(0xaaaacc, 1);
  g.fillCircle(cx, cy, 5);

  g.fillStyle(0xccccdd, 1);
  g.fillCircle(cx, cy, 2);

  g.lineStyle(2, 0x444466, 1);
  g.strokeCircle(cx, cy, 12);

  g.lineStyle(0.5, 0x555577, 0.5);
  g.strokeCircle(cx, cy, 8);
  g.strokeCircle(cx, cy, 5);

  g.generateTexture('bumper', s, s);
  g.destroy();
}

// -- Coin Particle: tiny gold dot for effects -------------------------------

function _generateCoinParticle(scene) {
  const s = 6;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  g.fillStyle(0xffcc00, 1);
  g.fillCircle(cx, cy, 2.5);

  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(cx, cy, 0.8);

  g.generateTexture('coin_particle', s, s);
  g.destroy();
}
