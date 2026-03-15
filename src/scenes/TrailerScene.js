import Phaser from 'phaser';

/**
 * TrailerScene — automated cinematic gameplay demo.
 * The ship flies, shoots, breaks asteroids, collects ore, and shows off
 * power-ups on a scripted loop. Cinematic text overlays sell the game.
 */

const W = 800;
const H = 600;

// Scripted sequence of events (time in ms from scene start)
const SCRIPT = [
  { t: 0, action: 'title', text: 'ASTEROID MINER', duration: 3000 },
  { t: 500, action: 'subtitle', text: 'Break. Harvest. Survive.', duration: 2500 },
  { t: 3500, action: 'phase', text: 'BLAST ASTEROIDS', duration: 2500 },
  { t: 6500, action: 'phase', text: 'HARVEST ORE', duration: 2500 },
  { t: 9500, action: 'phase', text: 'POWER UPS', duration: 2500 },
  { t: 12500, action: 'phase', text: 'CHAIN COMBOS', duration: 2500 },
  { t: 15500, action: 'title', text: 'PLAY FREE NOW', duration: 3000 },
  { t: 15800, action: 'subtitle', text: 'No download. Any browser.', duration: 2700 },
  { t: 19000, action: 'cta' },
];

const TRAILER_DURATION = 20000;

export class TrailerScene extends Phaser.Scene {
  constructor() {
    super('TrailerScene');
  }

  create() {
    this.elapsed = 0;
    this.scriptIdx = 0;
    this.shipAngle = -90; // pointing up in Phaser coords
    this.shipSpeed = 180;
    this.loopCount = 0;

    // Groups
    this.bullets = this.physics.add.group();
    this.asteroids = this.physics.add.group();
    this.ores = this.physics.add.group();
    this.particles = [];

    // Ship
    this.ship = this.physics.add.sprite(W / 2, H / 2, 'ship');
    this.ship.setDepth(5);

    // Starfield background
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 1.5),
        0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.6),
      ).setDepth(0);
      s._speed = Phaser.Math.FloatBetween(10, 40);
      this.stars.push(s);
    }

    // Pre-spawn some asteroids for visual interest
    for (let i = 0; i < 5; i++) {
      this._spawnAsteroid();
    }

    // Collisions
    this.physics.add.overlap(this.bullets, this.asteroids, this._bulletHit, null, this);
    this.physics.add.overlap(this.ship, this.ores, this._collectOre, null, this);

    // Text overlay layer
    this.overlayTexts = [];

    // CTA elements (hidden until needed)
    this.ctaGroup = null;

    // Vignette overlay for cinematic feel
    const vignette = this.add.graphics().setDepth(50);
    vignette.fillStyle(0x000000, 0.4);
    vignette.fillRect(0, 0, W, 20);
    vignette.fillRect(0, H - 20, W, 20);

    // Auto-fire timer
    this.lastFired = 0;
    this.lastAsteroidSpawn = 0;
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.elapsed += delta;

    // Loop the trailer
    if (this.elapsed >= TRAILER_DURATION) {
      this.elapsed = 0;
      this.scriptIdx = 0;
      this.loopCount++;
      this._clearOverlays();
      if (this.ctaGroup) {
        this.ctaGroup.forEach(o => o.destroy());
        this.ctaGroup = null;
      }
    }

    this._runScript();
    this._autopilot(dt);
    this._autoFire();
    this._spawnLogic();
    this._scrollStars(dt);
    this._cleanupBullets();
    this._wrapBounds();
  }

  // -- Script runner --------------------------------------------------------

  _runScript() {
    while (this.scriptIdx < SCRIPT.length && this.elapsed >= SCRIPT[this.scriptIdx].t) {
      const evt = SCRIPT[this.scriptIdx];
      this.scriptIdx++;

      switch (evt.action) {
        case 'title':
          this._showText(evt.text, W / 2, H / 2 - 60, '42px', '#e94560', evt.duration);
          break;
        case 'subtitle':
          this._showText(evt.text, W / 2, H / 2 - 10, '18px', '#8888aa', evt.duration);
          break;
        case 'phase':
          this._showText(evt.text, W / 2, 50, '28px', '#ffffff', evt.duration);
          break;
        case 'cta':
          this._showCTA();
          break;
      }
    }
  }

  _showText(text, x, y, fontSize, color, duration) {
    const t = this.add.text(x, y, text, {
      fontSize,
      fontFamily: 'monospace',
      color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.overlayTexts.push(t);

    // Fade in
    this.tweens.add({
      targets: t,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });

    // Fade out
    this.time.delayedCall(duration - 400, () => {
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => t.destroy(),
      });
    });
  }

  _showCTA() {
    this.ctaGroup = [];

    const playBtn = this.add.text(W / 2, H / 2 + 40, '[ PLAY NOW ]', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#1a1a2e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true }).setAlpha(0);

    playBtn.on('pointerover', () => playBtn.setStyle({ color: '#ffffff', backgroundColor: '#00aa55' }));
    playBtn.on('pointerout', () => playBtn.setStyle({ color: '#00ff88', backgroundColor: '#1a1a2e' }));
    playBtn.on('pointerdown', () => {
      window.location.href = './';
    });

    this.tweens.add({
      targets: playBtn,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    // Pulse
    this.tweens.add({
      targets: playBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.ctaGroup.push(playBtn);
  }

  _clearOverlays() {
    this.overlayTexts.forEach(t => { if (t && t.active) t.destroy(); });
    this.overlayTexts = [];
  }

  // -- Autopilot ------------------------------------------------------------

  _autopilot(dt) {
    // Fly in a gentle figure-8 pattern
    const t = this.elapsed / 1000;
    const targetX = W / 2 + Math.sin(t * 0.4) * 250;
    const targetY = H / 2 + Math.sin(t * 0.8) * 150;

    // Steer toward target
    const dx = targetX - this.ship.x;
    const dy = targetY - this.ship.y;
    const targetAngle = Math.atan2(dy, dx);

    this.ship.rotation = targetAngle + Math.PI / 2; // sprite faces up
    const speed = this.shipSpeed;
    this.ship.body.setVelocity(
      Math.cos(targetAngle) * speed,
      Math.sin(targetAngle) * speed,
    );

    // Thrust trail
    this._emitThrust();
  }

  _emitThrust() {
    if (Math.random() > 0.3) return; // throttle particle rate
    const angle = this.ship.rotation - Math.PI / 2;
    const x = this.ship.x - Math.cos(angle) * 16;
    const y = this.ship.y - Math.sin(angle) * 16;
    const p = this.add.circle(x, y, 2, 0xff6633).setDepth(1);
    this.tweens.add({
      targets: p,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300,
      onComplete: () => p.destroy(),
    });
  }

  // -- Auto fire ------------------------------------------------------------

  _autoFire() {
    if (this.elapsed - this.lastFired < 300) return;

    // Find nearest asteroid
    let nearest = null;
    let nearDist = Infinity;
    this.asteroids.getChildren().forEach(a => {
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, a.x, a.y);
      if (d < nearDist && d < 350) {
        nearDist = d;
        nearest = a;
      }
    });

    if (!nearest) return;

    this.lastFired = this.elapsed;
    const angle = Math.atan2(nearest.y - this.ship.y, nearest.x - this.ship.x);
    const bx = this.ship.x + Math.cos(angle) * 20;
    const by = this.ship.y + Math.sin(angle) * 20;

    const bullet = this.physics.add.sprite(bx, by, 'bullet');
    this.bullets.add(bullet);
    bullet.body.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
    bullet._born = this.elapsed;
  }

  // -- Spawning -------------------------------------------------------------

  _spawnLogic() {
    if (this.elapsed - this.lastAsteroidSpawn < 1500) return;
    if (this.asteroids.getLength() >= 8) return;
    this.lastAsteroidSpawn = this.elapsed;
    this._spawnAsteroid();
  }

  _spawnAsteroid() {
    const sizes = ['asteroid_large', 'asteroid_medium', 'asteroid_small'];
    const texKey = sizes[Phaser.Math.Between(0, sizes.length - 1)];
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    switch (edge) {
      case 0: x = Phaser.Math.Between(0, W); y = -40; break;
      case 1: x = W + 40; y = Phaser.Math.Between(0, H); break;
      case 2: x = Phaser.Math.Between(0, W); y = H + 40; break;
      case 3: x = -40; y = Phaser.Math.Between(0, H); break;
    }

    const asteroid = this.physics.add.sprite(x, y, texKey);
    this.asteroids.add(asteroid);

    // Drift toward center area
    const angle = Math.atan2(H / 2 - y + Phaser.Math.Between(-100, 100), W / 2 - x + Phaser.Math.Between(-100, 100));
    const speed = Phaser.Math.Between(40, 100);
    asteroid.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    asteroid._size = texKey.includes('large') ? 'large' : texKey.includes('medium') ? 'medium' : 'small';
  }

  // -- Collisions -----------------------------------------------------------

  _bulletHit(bullet, asteroid) {
    const ax = asteroid.x;
    const ay = asteroid.y;
    const size = asteroid._size;
    const bx = bullet.x;
    const by = bullet.y;

    bullet.destroy();
    asteroid.destroy();

    // Impact flash
    const flash = this.add.circle(bx, by, 8, 0xffffff).setDepth(5).setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    // Destruction particles
    const color = size === 'large' ? 0x555577 : size === 'medium' ? 0x666688 : 0x777799;
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 160);
      const p = this.add.circle(ax, ay, Phaser.Math.FloatBetween(2, 4), color).setDepth(5);
      this.tweens.add({
        targets: p,
        x: ax + Math.cos(angle) * speed * 0.3,
        y: ay + Math.sin(angle) * speed * 0.3,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300,
        onComplete: () => p.destroy(),
      });
    }

    this.cameras.main.shake(80, 0.008);

    // Split or drop ore
    if (size === 'large' || size === 'medium') {
      const nextTex = size === 'large' ? 'asteroid_medium' : 'asteroid_small';
      const nextSize = size === 'large' ? 'medium' : 'small';
      for (let i = 0; i < 2; i++) {
        const child = this.physics.add.sprite(
          ax + Phaser.Math.Between(-10, 10),
          ay + Phaser.Math.Between(-10, 10),
          nextTex,
        );
        this.asteroids.add(child);
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const s = Phaser.Math.Between(60, 120);
        child.body.setVelocity(Math.cos(a) * s, Math.sin(a) * s);
        child._size = nextSize;
      }
    } else {
      // Drop ore
      const ore = this.physics.add.sprite(ax, ay, 'ore');
      this.ores.add(ore);
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      ore.body.setVelocity(Math.cos(a) * 50, Math.sin(a) * 50);
      ore._born = this.elapsed;
    }
  }

  _collectOre(_ship, ore) {
    const x = ore.x;
    const y = ore.y;
    ore.destroy();

    // Score popup
    const points = Phaser.Math.Between(10, 30);
    const label = `+${points}`;
    const t = this.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: t,
      y: y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  // -- Cleanup --------------------------------------------------------------

  _cleanupBullets() {
    this.bullets.getChildren().forEach(b => {
      if (this.elapsed - b._born > 1200) b.destroy();
    });
    // Cleanup old ores too
    this.ores.getChildren().forEach(o => {
      if (this.elapsed - o._born > 5000) o.destroy();
    });
  }

  _wrapBounds() {
    const pad = 50;
    const wrap = (obj) => {
      if (obj.x < -pad) obj.x = W + pad;
      else if (obj.x > W + pad) obj.x = -pad;
      if (obj.y < -pad) obj.y = H + pad;
      else if (obj.y > H + pad) obj.y = -pad;
    };
    wrap(this.ship);
    this.asteroids.getChildren().forEach(wrap);
    this.ores.getChildren().forEach(wrap);
  }

  _scrollStars(dt) {
    for (const s of this.stars) {
      s.y += s._speed * dt;
      if (s.y > H + 5) {
        s.y = -5;
        s.x = Phaser.Math.Between(0, W);
      }
    }
  }
}
