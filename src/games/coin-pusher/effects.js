import Phaser from 'phaser';

/**
 * Particle effects module for Coin Pusher game.
 * All effects use lightweight tween-based particles (no Phaser particle emitters).
 */

/**
 * Burst of 4-6 tiny gold particles outward from score position + floating score text with tween up and fade.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} points
 * @param {string} color - CSS color string, e.g. '#ffcc00'
 */
export function emitCoinScore(scene, x, y, points, color) {
  // Particle burst
  const count = Phaser.Math.Between(4, 6);
  const particleColor = 0xffcc00;
  for (let i = 0; i < count; i++) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.FloatBetween(40, 100);
    const radius = Phaser.Math.FloatBetween(1.5, 3);
    const p = scene.add.circle(x, y, radius, particleColor).setDepth(5);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * speed * 0.3,
      y: y + Math.sin(angle) * speed * 0.3,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300,
      onComplete: () => p.destroy(),
    });
  }

  // Floating score text
  const label = `+${points}`;
  const floatText = scene.add.text(x, y - 10, label, {
    fontSize: '16px',
    fontFamily: 'monospace',
    color: color || '#ffcc00',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(10);

  scene.tweens.add({
    targets: floatText,
    y: y - 50,
    alpha: 0,
    duration: 600,
    onComplete: () => floatText.destroy(),
  });
}

/**
 * Bigger burst (8-10 particles) + sparkle flash + floating score text for prize scoring.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} points
 * @param {string} color - CSS color string
 */
export function emitPrizeScore(scene, x, y, points, color) {
  // Parse hex color string to number for particles
  const colorNum = parseInt((color || '#ffffff').replace('#', ''), 16);

  // Bigger particle burst
  const count = Phaser.Math.Between(8, 10);
  for (let i = 0; i < count; i++) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.FloatBetween(60, 160);
    const radius = Phaser.Math.FloatBetween(2, 4);
    const p = scene.add.circle(x, y, radius, colorNum).setDepth(5);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * speed * 0.35,
      y: y + Math.sin(angle) * speed * 0.35,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 400,
      onComplete: () => p.destroy(),
    });
  }

  // Sparkle flash — white circle that scales up and fades rapidly
  const flash = scene.add.circle(x, y, 6, 0xffffff).setDepth(6).setAlpha(0.9);
  scene.tweens.add({
    targets: flash,
    scaleX: 3,
    scaleY: 3,
    alpha: 0,
    duration: 250,
    onComplete: () => flash.destroy(),
  });

  // Floating score text
  const label = `+${points}`;
  const floatText = scene.add.text(x, y - 10, label, {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: color || '#ffffff',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(10);

  scene.tweens.add({
    targets: floatText,
    y: y - 60,
    alpha: 0,
    duration: 800,
    onComplete: () => floatText.destroy(),
  });
}

/**
 * Camera shake wrapper.
 * @param {Phaser.Scene} scene
 * @param {number} [intensity=0.008]
 */
export function cameraShake(scene, intensity) {
  scene.cameras.main.shake(100, intensity || 0.008);
}

/**
 * Small white flash circle that scales up and fades — used when coins land on the tray.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 */
export function emitCoinLanding(scene, x, y) {
  const flash = scene.add.circle(x, y, 4, 0xffffff).setDepth(5).setAlpha(0.7);
  scene.tweens.add({
    targets: flash,
    scaleX: 2.5,
    scaleY: 2.5,
    alpha: 0,
    duration: 200,
    onComplete: () => flash.destroy(),
  });
}

/**
 * Single sparkle that scales 0->1->0 with alpha fade — used for bonus round indicators.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} color - Hex color number, e.g. 0xffcc00
 */
export function emitSparkle(scene, x, y, color) {
  const sparkle = scene.add.circle(x, y, 3, color || 0xffffff).setDepth(6).setScale(0).setAlpha(1);
  scene.tweens.add({
    targets: sparkle,
    scaleX: 1,
    scaleY: 1,
    duration: 200,
    ease: 'Quad.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: sparkle,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => sparkle.destroy(),
      });
    },
  });
}
