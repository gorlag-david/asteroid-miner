import Phaser from 'phaser';

const SHIP_THRUST = 300;
const SHIP_DRAG = 50;
const SHIP_MAX_SPEED = 400;
const SHIP_ROTATION_SPEED = 200; // degrees per second

const BULLET_SPEED = 500;
const BULLET_LIFESPAN = 1200;
const FIRE_RATE = 200; // ms between shots

const FUEL_MAX = 100;
const FUEL_BURN_RATE = 12; // per second while thrusting
const FUEL_PICKUP_AMOUNT = 25;

const AMMO_MAX = 30;
const AMMO_START = 15;

const ASTEROID_SIZES = {
  large: { radius: 36, speed: 60, score: 0, splits: 2 },
  medium: { radius: 20, speed: 100, score: 0, splits: 2 },
  small: { radius: 10, speed: 140, score: 0, splits: 0 },
};

const ORE_SPEED = 50;
const ORE_LIFESPAN = 5000;
const ORE_SCORE = 10;
const FUEL_PICKUP_CHANCE = 0.25; // chance a destroyed small asteroid drops fuel

const INITIAL_SPAWN_INTERVAL = 3000;
const MIN_SPAWN_INTERVAL = 800;
const SPAWN_RAMP_RATE = 30; // ms reduction per second of play

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    const { width, height } = this.scale;

    this.score = 0;
    this.fuel = FUEL_MAX;
    this.ammo = AMMO_START;
    this.lastFired = 0;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.gameOver = false;
    this.invincible = true;

    // Groups
    this.bullets = this.physics.add.group();
    this.asteroids = this.physics.add.group();
    this.ores = this.physics.add.group();
    this.fuelPickups = this.physics.add.group();

    // Player ship — triangle via graphics texture
    this._createShipTexture();
    this.ship = this.physics.add.sprite(width / 2, height / 2, 'ship');
    this.ship.setDrag(SHIP_DRAG);
    this.ship.setMaxVelocity(SHIP_MAX_SPEED);
    this.ship.body.setSize(20, 20);

    // World wrapping is handled in update

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Collisions
    this.physics.add.overlap(this.ship, this.asteroids, this._hitAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.asteroids, this._bulletHitAsteroid, null, this);
    this.physics.add.overlap(this.ship, this.ores, this._collectOre, null, this);
    this.physics.add.overlap(this.ship, this.fuelPickups, this._collectFuel, null, this);

    // Spawn initial asteroids (3, safe distance from ship)
    for (let i = 0; i < 3; i++) {
      this._spawnAsteroid('large', undefined, undefined, true);
    }

    // Invincibility wears off after 2 seconds
    this.ship.setAlpha(0.5);
    this.time.delayedCall(2000, () => {
      this.invincible = false;
      this.ship.setAlpha(1);
    });

    // HUD
    this.hudText = this.add.text(12, 12, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setScrollFactor(0).setDepth(10);
  }

  update(time, delta) {
    if (this.gameOver) return;

    const dt = delta / 1000;
    this.elapsed += dt;

    this._handleInput(time, dt);
    this._wrapWorldBounds();
    this._cleanupBullets(time);
    this._cleanupOres();
    this._spawnLogic(dt);
    this._updateHUD();
  }

  // -- Input ----------------------------------------------------------------

  _handleInput(time, dt) {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const thrust = this.cursors.up.isDown || this.wasd.up.isDown;
    const fire = this.cursors.space.isDown;

    if (left) {
      this.ship.setAngularVelocity(-SHIP_ROTATION_SPEED);
    } else if (right) {
      this.ship.setAngularVelocity(SHIP_ROTATION_SPEED);
    } else {
      this.ship.setAngularVelocity(0);
    }

    if (thrust && this.fuel > 0) {
      this.physics.velocityFromRotation(
        Phaser.Math.DegToRad(this.ship.angle - 90),
        SHIP_THRUST,
        this.ship.body.acceleration,
      );
      this.fuel = Math.max(0, this.fuel - FUEL_BURN_RATE * dt);
      if (this.fuel <= 0) {
        this._endGame();
      }
      // Thrust trail
      this._emitThrustParticle();
    } else {
      this.ship.setAcceleration(0);
    }

    if (fire && time > this.lastFired + FIRE_RATE && this.ammo > 0) {
      this._fireBullet(time);
    }
  }

  _fireBullet(time) {
    this.ammo--;
    this.lastFired = time;

    const angle = Phaser.Math.DegToRad(this.ship.angle - 90);
    const x = this.ship.x + Math.cos(angle) * 20;
    const y = this.ship.y + Math.sin(angle) * 20;

    const bullet = this.add.circle(x, y, 3, 0xffffff);
    this.physics.add.existing(bullet);
    this.bullets.add(bullet);
    bullet.body.setVelocity(
      Math.cos(angle) * BULLET_SPEED + this.ship.body.velocity.x * 0.5,
      Math.sin(angle) * BULLET_SPEED + this.ship.body.velocity.y * 0.5,
    );
    bullet.getData = () => ({ born: time });
    bullet._born = time;
  }

  // -- Spawning -------------------------------------------------------------

  _spawnLogic(dt) {
    const interval = Math.max(
      MIN_SPAWN_INTERVAL,
      INITIAL_SPAWN_INTERVAL - this.elapsed * SPAWN_RAMP_RATE,
    );
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawnAsteroid('large');
    }
  }

  _spawnAsteroid(size, x, y, safeSpawn = false) {
    const { width, height } = this.scale;
    const cfg = ASTEROID_SIZES[size];

    if (x === undefined || y === undefined) {
      // Spawn at a random edge
      const edge = Phaser.Math.Between(0, 3);
      switch (edge) {
        case 0: x = Phaser.Math.Between(0, width); y = -cfg.radius; break;
        case 1: x = width + cfg.radius; y = Phaser.Math.Between(0, height); break;
        case 2: x = Phaser.Math.Between(0, width); y = height + cfg.radius; break;
        case 3: x = -cfg.radius; y = Phaser.Math.Between(0, height); break;
      }
    }

    const color = size === 'large' ? 0x555577 : size === 'medium' ? 0x666688 : 0x777799;
    const asteroid = this.add.circle(x, y, cfg.radius, color);
    this.physics.add.existing(asteroid);
    this.asteroids.add(asteroid);

    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // If safeSpawn, aim away from the center so asteroids don't drift toward the player
    if (safeSpawn) {
      const cx = width / 2;
      const cy = height / 2;
      const awayAngle = Math.atan2(y - cy, x - cx);
      // Bias toward away direction (+/- 60 degrees)
      angle = awayAngle + Phaser.Math.FloatBetween(-Math.PI / 3, Math.PI / 3);
    }
    const speed = cfg.speed + Phaser.Math.FloatBetween(-20, 20);
    asteroid.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    asteroid.body.setCircle(cfg.radius);
    asteroid._size = size;
  }

  // -- Collisions -----------------------------------------------------------

  _hitAsteroid(_ship, _asteroid) {
    if (this.invincible) return;
    this._endGame();
  }

  _bulletHitAsteroid(bullet, asteroid) {
    const size = asteroid._size;
    const cfg = ASTEROID_SIZES[size];
    const ax = asteroid.x;
    const ay = asteroid.y;

    bullet.destroy();
    asteroid.destroy();

    // Camera shake on destruction
    this.cameras.main.shake(100, 0.01);

    if (cfg.splits > 0) {
      const nextSize = size === 'large' ? 'medium' : 'small';
      for (let i = 0; i < cfg.splits; i++) {
        this._spawnAsteroid(nextSize, ax + Phaser.Math.Between(-10, 10), ay + Phaser.Math.Between(-10, 10));
      }
    } else {
      // Small asteroid destroyed — drop ore
      this._spawnOre(ax, ay);
      // Chance of fuel pickup
      if (Math.random() < FUEL_PICKUP_CHANCE) {
        this._spawnFuelPickup(ax, ay);
      }
      // Ammo recovery: destroying a small asteroid gives 1 ammo back
      this.ammo = Math.min(AMMO_MAX, this.ammo + 1);
    }
  }

  _spawnOre(x, y) {
    const ore = this.add.polygon(x, y, [0, -6, 5, 0, 0, 6, -5, 0], 0xffcc00);
    this.physics.add.existing(ore);
    this.ores.add(ore);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    ore.body.setVelocity(Math.cos(angle) * ORE_SPEED, Math.sin(angle) * ORE_SPEED);
    ore.body.setSize(10, 10);
    ore._born = this.time.now;
  }

  _spawnFuelPickup(x, y) {
    const pickup = this.add.circle(x, y, 6, 0x00ff88);
    this.physics.add.existing(pickup);
    this.fuelPickups.add(pickup);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    pickup.body.setVelocity(Math.cos(angle) * ORE_SPEED, Math.sin(angle) * ORE_SPEED);
    pickup.body.setCircle(6);
    pickup._born = this.time.now;
  }

  _collectOre(_ship, ore) {
    this.score += ORE_SCORE;
    // Floating score text
    const floatText = this.add.text(ore.x, ore.y, `+${ORE_SCORE}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: floatText,
      y: ore.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => floatText.destroy(),
    });
    ore.destroy();
  }

  _collectFuel(_ship, pickup) {
    this.fuel = Math.min(FUEL_MAX, this.fuel + FUEL_PICKUP_AMOUNT);
    pickup.destroy();
  }

  // -- Cleanup --------------------------------------------------------------

  _cleanupBullets(time) {
    this.bullets.getChildren().forEach((b) => {
      if (time - b._born > BULLET_LIFESPAN) b.destroy();
    });
  }

  _cleanupOres() {
    const now = this.time.now;
    [...this.ores.getChildren(), ...this.fuelPickups.getChildren()].forEach((o) => {
      const age = now - o._born;
      if (age > ORE_LIFESPAN) {
        o.destroy();
      } else if (age > ORE_LIFESPAN - 1000) {
        o.setAlpha(Math.max(0.1, 1 - (age - (ORE_LIFESPAN - 1000)) / 1000));
      }
    });
  }

  // -- World wrap -----------------------------------------------------------

  _wrapWorldBounds() {
    const { width, height } = this.scale;
    const pad = 20;
    const wrap = (obj) => {
      if (obj.x < -pad) obj.x = width + pad;
      else if (obj.x > width + pad) obj.x = -pad;
      if (obj.y < -pad) obj.y = height + pad;
      else if (obj.y > height + pad) obj.y = -pad;
    };

    wrap(this.ship);
    this.asteroids.getChildren().forEach(wrap);
    this.ores.getChildren().forEach(wrap);
    this.fuelPickups.getChildren().forEach(wrap);
  }

  // -- HUD ------------------------------------------------------------------

  _updateHUD() {
    const fuelBar = Math.round(this.fuel);
    this.hudText.setText(
      `ORE: ${this.score}  |  FUEL: ${fuelBar}  |  AMMO: ${this.ammo}`,
    );
    // Flash fuel red when low
    this.hudText.setColor(this.fuel < 20 ? '#ff4444' : '#aaaacc');
  }

  // -- Game Over ------------------------------------------------------------

  _endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.cameras.main.shake(200, 0.03);
    this.ship.setTint(0xff0000);
    this.ship.setAcceleration(0);
    this.ship.setVelocity(0);
    this.ship.setAngularVelocity(0);
    this.physics.pause();

    // Check and save high score
    const prevBest = parseInt(localStorage.getItem('asteroidMinerBest') || '0', 10);
    const isNewBest = this.score > prevBest;
    if (isNewBest) {
      localStorage.setItem('asteroidMinerBest', String(this.score));
    }

    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', { score: this.score, best: Math.max(this.score, prevBest), isNewBest });
    });
  }

  // -- Effects --------------------------------------------------------------

  _emitThrustParticle() {
    const angle = Phaser.Math.DegToRad(this.ship.angle - 90);
    // Spawn behind the ship (opposite of thrust direction)
    const x = this.ship.x - Math.cos(angle) * 16;
    const y = this.ship.y - Math.sin(angle) * 16;
    const particle = this.add.circle(x, y, 2, 0xff6633).setDepth(0);
    this.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 300,
      onComplete: () => particle.destroy(),
    });
  }

  // -- Texture generation ---------------------------------------------------

  _createShipTexture() {
    if (this.textures.exists('ship')) return;
    const g = this.add.graphics();
    g.fillStyle(0xe94560, 1);
    g.beginPath();
    g.moveTo(16, 0);
    g.lineTo(32, 32);
    g.lineTo(16, 24);
    g.lineTo(0, 32);
    g.closePath();
    g.fillPath();
    g.generateTexture('ship', 32, 32);
    g.destroy();
  }
}
