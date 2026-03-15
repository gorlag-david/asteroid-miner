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
}

// -- Coin: gold circle with edge detail and shine --------------------------

function _generateCoin(scene) {
  const s = 24;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Shadow
  g.fillStyle(0x996600, 0.4);
  g.fillCircle(cx + 1, cy + 1, 10);

  // Outer rim
  g.fillStyle(0xcc8800, 1);
  g.fillCircle(cx, cy, 10);

  // Inner face
  g.fillStyle(0xffcc00, 1);
  g.fillCircle(cx, cy, 8);

  // Highlight arc (top-left shine)
  g.fillStyle(0xffee66, 0.7);
  g.fillCircle(cx - 2, cy - 2, 4);

  // Specular dot
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 3, cy - 3, 1.5);

  // Rim edge line
  g.lineStyle(1, 0xaa7700, 0.5);
  g.strokeCircle(cx, cy, 10);

  g.generateTexture('coin', s, s);
  g.destroy();
}

// -- Pusher: metallic platform rectangle -----------------------------------

function _generatePusher(scene) {
  const w = 200;
  const h = 20;
  const g = scene.add.graphics();

  // Shadow
  g.fillStyle(0x333333, 0.5);
  g.fillRect(2, 2, w, h);

  // Base
  g.fillStyle(0x888899, 1);
  g.fillRect(0, 0, w, h);

  // Top highlight
  g.fillStyle(0xaaaabb, 1);
  g.fillRect(0, 0, w, 6);

  // Grooves
  g.lineStyle(1, 0x666677, 0.6);
  for (let x = 20; x < w; x += 30) {
    g.lineBetween(x, 2, x, h - 2);
  }

  // Edge outline
  g.lineStyle(1, 0x555566, 0.8);
  g.strokeRect(0, 0, w, h);

  g.generateTexture('pusher', w, h);
  g.destroy();
}

// -- Gem: small colored gem for bonus points --------------------------------

function _generateGem(scene) {
  const s = 18;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Glow
  g.fillStyle(0x00ff88, 0.15);
  g.fillCircle(cx, cy, 8);

  // Diamond shape
  g.fillStyle(0x00cc66, 1);
  g.beginPath();
  g.moveTo(cx, cy - 7);
  g.lineTo(cx + 6, cy);
  g.lineTo(cx, cy + 7);
  g.lineTo(cx - 6, cy);
  g.closePath();
  g.fillPath();

  // Top facet
  g.fillStyle(0x44ffaa, 1);
  g.beginPath();
  g.moveTo(cx, cy - 7);
  g.lineTo(cx + 6, cy);
  g.lineTo(cx, cy - 1);
  g.lineTo(cx - 6, cy);
  g.closePath();
  g.fillPath();

  // Specular
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - 1, cy - 3, 1.5);

  // Outline
  g.lineStyle(1, 0x008844, 0.6);
  g.beginPath();
  g.moveTo(cx, cy - 7);
  g.lineTo(cx + 6, cy);
  g.lineTo(cx, cy + 7);
  g.lineTo(cx - 6, cy);
  g.closePath();
  g.strokePath();

  g.generateTexture('gem', s, s);
  g.destroy();
}

// -- Special token: star-shaped prize piece --------------------------------

function _generateSpecialToken(scene) {
  const s = 22;
  const g = scene.add.graphics();
  const cx = s / 2;
  const cy = s / 2;

  // Glow
  g.fillStyle(0xff44ff, 0.15);
  g.fillCircle(cx, cy, 9);

  // Star shape (5-pointed)
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 8 : 4;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }

  g.fillStyle(0xff44ff, 1);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i].x, points[i].y);
  }
  g.closePath();
  g.fillPath();

  // Highlight
  g.fillStyle(0xff88ff, 0.6);
  g.fillCircle(cx - 1, cy - 1, 3);

  // Specular
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(cx - 2, cy - 2, 1);

  g.generateTexture('special_token', s, s);
  g.destroy();
}
