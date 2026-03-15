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
const ORE_LIFESPAN = 8000;
const ORE_SCORE = 10;
const ORE_MAGNET_RADIUS = 80;
const ORE_MAGNET_STRENGTH = 200; // px/s drift toward player
const ORE_DESPAWN_WARN = 2000; // ms before expiry to start warning pulse
const FUEL_PICKUP_CHANCE = 0.25; // chance a destroyed small asteroid drops fuel
const AMMO_PICKUP_CHANCE = 0.20; // chance a destroyed small asteroid drops an ammo crate
const AMMO_PICKUP_AMOUNT = 5;
const AMMO_PICKUP_LIFESPAN = 8000;
const AMMO_PICKUP_SPEED = 40;

const POWERUP_CHANCE = 0.15; // chance a destroyed small asteroid drops a power-up
const POWERUP_LIFESPAN = 6000;
const POWERUP_SPEED = 40;
const POWERUP_TYPES = {
  rapidfire: { color: 0xffdd00, duration: 8000, label: 'RAPID' },
  shield:    { color: 0x00ddff, duration: 6000, label: 'SHIELD' },
  spread:    { color: 0xff44ff, duration: 8000, label: 'SPREAD' },
};
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);

const COMBO_WINDOW = 2000; // ms — collect ore within this window to keep combo alive
const COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3]; // combo step 0,1,2,3,4+

// Store — spend score (ore) to buy items
const STORE_ITEMS = [
  { key: 'fuel',      label: 'FUEL +50',     cost: 50,  desc: 'Refill 50 fuel' },
  { key: 'ammo',      label: 'AMMO +10',     cost: 40,  desc: 'Add 10 ammo' },
  { key: 'shield',    label: 'SHIELD',       cost: 80,  desc: '6s shield' },
  { key: 'rapidfire', label: 'RAPID FIRE',   cost: 60,  desc: '8s rapid fire' },
  { key: 'spread',    label: 'SPREAD SHOT',  cost: 70,  desc: '8s spread shot' },
];

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

    // Active power-up state
    this.activePowerUp = null;   // { type, expiresAt }
    this.powerUpTimer = null;

    // Combo streak state
    this.comboCount = 0;         // consecutive ore pickups within the combo window
    this.comboMultiplier = 1;
    this.lastOreTime = 0;        // timestamp of last ore collection

    // Store state
    this.storeOpen = false;
    this.storeUI = null;
    this.storeSelection = 0;

    // Groups
    this.bullets = this.physics.add.group();
    this.asteroids = this.physics.add.group();
    this.ores = this.physics.add.group();
    this.fuelPickups = this.physics.add.group();
    this.ammoPickups = this.physics.add.group();
    this.powerUps = this.physics.add.group();

    // Player ship — detailed procedural sprite (generated in BootScene)
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

    // Touch controls (only on non-desktop)
    this.isMobile = !this.sys.game.device.os.desktop;
    this.touchThrust = false;
    this.touchAngle = null; // radians, null = no joystick input
    this.touchFire = false;
    if (this.isMobile) {
      this._createTouchControls();
    }

    // Collisions
    this.physics.add.overlap(this.ship, this.asteroids, this._hitAsteroid, null, this);
    this.physics.add.overlap(this.bullets, this.asteroids, this._bulletHitAsteroid, null, this);
    this.physics.add.overlap(this.ship, this.ores, this._collectOre, null, this);
    this.physics.add.overlap(this.ship, this.fuelPickups, this._collectFuel, null, this);
    this.physics.add.overlap(this.ship, this.powerUps, this._collectPowerUp, null, this);
    this.physics.add.overlap(this.ship, this.ammoPickups, this._collectAmmo, null, this);

    // Store key (Tab) — preventDefault to stop browser focus switching
    this.storeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB, true, true);
    this.storeKey.on('down', () => this._toggleStore());

    // Store navigation keys
    this.storeUpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.storeDownKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.storeEnterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

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

    this.powerUpText = this.add.text(width / 2, 12, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

    this.comboText = this.add.text(width - 12, 12, '', {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffcc00',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10).setAlpha(0);

    this.storeHint = this.add.text(width / 2, height - 12, '[TAB] SHOP', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);

    // Mobile shop button
    if (this.isMobile) {
      this.storeHint.setVisible(false);
      const shopBtnX = width - 80;
      const shopBtnY = height - 160;
      this.shopBtn = this.add.circle(shopBtnX, shopBtnY, 25, 0x44aa44, 0.2)
        .setScrollFactor(0).setDepth(20).setInteractive();
      this.shopBtnLabel = this.add.text(shopBtnX, shopBtnY, 'SHOP', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#44aa44',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0.6);
      this.shopBtn.on('pointerdown', () => this._toggleStore());
    }
  }

  update(time, delta) {
    if (this.gameOver) return;
    if (this.storeOpen) {
      this._handleStoreInput();
      return;
    }

    const dt = delta / 1000;
    this.elapsed += dt;

    this._handleInput(time, dt);
    this._wrapWorldBounds();
    this._cleanupBullets(time);
    this._applyOreMagnetism(dt);
    this._cleanupOres();
    this._cleanupAmmoPickups();
    this._cleanupPowerUps();
    this._tickPowerUp();
    this._tickCombo();
    this._spawnLogic(dt);
    this._updateHUD();
  }

  // -- Input ----------------------------------------------------------------

  _handleInput(time, dt) {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const thrust = this.cursors.up.isDown || this.wasd.up.isDown;
    const fire = this.cursors.space.isDown || this.touchFire;

    // Touch joystick: point ship toward joystick angle and thrust
    if (this.touchAngle !== null) {
      // Set ship angle directly to joystick direction (+90 because ship sprite points up)
      const targetDeg = Phaser.Math.RadToDeg(this.touchAngle) + 90;
      // Smooth rotation toward target
      let diff = Phaser.Math.Angle.WrapDegrees(targetDeg - this.ship.angle);
      if (Math.abs(diff) < 5) {
        this.ship.setAngle(targetDeg);
        this.ship.setAngularVelocity(0);
      } else {
        this.ship.setAngularVelocity(diff > 0 ? SHIP_ROTATION_SPEED * 2 : -SHIP_ROTATION_SPEED * 2);
      }
    } else if (left) {
      this.ship.setAngularVelocity(-SHIP_ROTATION_SPEED);
    } else if (right) {
      this.ship.setAngularVelocity(SHIP_ROTATION_SPEED);
    } else {
      this.ship.setAngularVelocity(0);
    }

    const shouldThrust = thrust || this.touchThrust;
    if (shouldThrust && this.fuel > 0) {
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

    const fireRate = (this.activePowerUp && this.activePowerUp.type === 'rapidfire') ? FIRE_RATE / 2 : FIRE_RATE;
    if (fire && time > this.lastFired + fireRate && this.ammo > 0) {
      this._fireBullet(time);
    }
  }

  // -- Touch controls -------------------------------------------------------

  _createTouchControls() {
    const { width, height } = this.scale;
    const joyRadius = 50;
    const joyX = 90;
    const joyY = height - 90;
    const deadZone = 12;

    // Joystick base (semi-transparent circle)
    this.joyBase = this.add.circle(joyX, joyY, joyRadius, 0xffffff, 0.1)
      .setScrollFactor(0).setDepth(20);
    this.joyThumb = this.add.circle(joyX, joyY, 20, 0xffffff, 0.3)
      .setScrollFactor(0).setDepth(21);

    // Fire button
    const btnRadius = 40;
    const btnX = width - 80;
    const btnY = height - 90;
    this.fireBtn = this.add.circle(btnX, btnY, btnRadius, 0xe94560, 0.2)
      .setScrollFactor(0).setDepth(20);
    this.fireBtnLabel = this.add.text(btnX, btnY, 'FIRE', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0.6);

    // Track which pointer is doing what
    this._joyPointerId = null;
    this._firePointerId = null;

    this.input.on('pointerdown', (pointer) => {
      // Left half = joystick, right half = fire
      if (pointer.x < width / 2) {
        this._joyPointerId = pointer.id;
        this._updateJoystick(pointer, joyX, joyY, joyRadius, deadZone);
      } else {
        this._firePointerId = pointer.id;
        this.touchFire = true;
        this.fireBtn.setFillStyle(0xe94560, 0.5);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id === this._joyPointerId) {
        this._updateJoystick(pointer, joyX, joyY, joyRadius, deadZone);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this._joyPointerId) {
        this._joyPointerId = null;
        this.touchThrust = false;
        this.touchAngle = null;
        this.joyThumb.setPosition(joyX, joyY);
      }
      if (pointer.id === this._firePointerId) {
        this._firePointerId = null;
        this.touchFire = false;
        this.fireBtn.setFillStyle(0xe94560, 0.2);
      }
    });
  }

  _updateJoystick(pointer, baseX, baseY, radius, deadZone) {
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < deadZone) {
      this.touchThrust = false;
      this.touchAngle = null;
      this.joyThumb.setPosition(baseX, baseY);
      return;
    }

    // Clamp thumb to joystick radius
    const clampDist = Math.min(dist, radius);
    const nx = dx / dist;
    const ny = dy / dist;
    this.joyThumb.setPosition(baseX + nx * clampDist, baseY + ny * clampDist);

    this.touchAngle = Math.atan2(dy, dx);
    this.touchThrust = true;
  }

  _fireBullet(time) {
    this.ammo--;
    this.lastFired = time;

    const baseAngle = Phaser.Math.DegToRad(this.ship.angle - 90);
    const isSpread = this.activePowerUp && this.activePowerUp.type === 'spread';
    const angles = isSpread
      ? [baseAngle - 0.2, baseAngle, baseAngle + 0.2] // ~11.5 degree spread
      : [baseAngle];

    for (const angle of angles) {
      const x = this.ship.x + Math.cos(angle) * 20;
      const y = this.ship.y + Math.sin(angle) * 20;

      const bulletTex = isSpread ? 'bullet_spread' : 'bullet';
      const bullet = this.physics.add.sprite(x, y, bulletTex);
      this.bullets.add(bullet);
      bullet.body.setVelocity(
        Math.cos(angle) * BULLET_SPEED + this.ship.body.velocity.x * 0.5,
        Math.sin(angle) * BULLET_SPEED + this.ship.body.velocity.y * 0.5,
      );
      bullet._born = time;
    }
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

    const texKey = size === 'large' ? 'asteroid_large' : size === 'medium' ? 'asteroid_medium' : 'asteroid_small';
    const asteroid = this.physics.add.sprite(x, y, texKey);
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
    // Center the circular physics body within the (larger) sprite texture
    const texW = asteroid.width;
    const offset = (texW / 2) - cfg.radius;
    asteroid.body.setCircle(cfg.radius, offset, offset);
    asteroid._size = size;
  }

  // -- Collisions -----------------------------------------------------------

  _hitAsteroid(_ship, asteroid) {
    if (this.invincible) return;
    if (this.activePowerUp && this.activePowerUp.type === 'shield') {
      // Shield absorbs the hit — destroy the asteroid instead
      const size = asteroid._size;
      const cfg = ASTEROID_SIZES[size];
      const ax = asteroid.x;
      const ay = asteroid.y;
      asteroid.destroy();

      // VFX: asteroid destruction particles (shield hit)
      const color = size === 'large' ? 0x555577 : size === 'medium' ? 0x666688 : 0x777799;
      this._emitDestructionParticles(ax, ay, color, Phaser.Math.Between(4, 8));

      this.cameras.main.shake(80, 0.008);
      if (cfg.splits > 0) {
        const nextSize = size === 'large' ? 'medium' : 'small';
        for (let i = 0; i < cfg.splits; i++) {
          this._spawnAsteroid(nextSize, ax + Phaser.Math.Between(-10, 10), ay + Phaser.Math.Between(-10, 10));
        }
      } else {
        this._spawnOre(ax, ay);
      }
      return;
    }
    this._endGame();
  }

  _bulletHitAsteroid(bullet, asteroid) {
    const size = asteroid._size;
    const cfg = ASTEROID_SIZES[size];
    const ax = asteroid.x;
    const ay = asteroid.y;
    const bx = bullet.x;
    const by = bullet.y;

    bullet.destroy();
    asteroid.destroy();

    // VFX: bullet impact spark at hit location
    this._emitBulletImpact(bx, by);

    // VFX: asteroid destruction particles
    const color = size === 'large' ? 0x555577 : size === 'medium' ? 0x666688 : 0x777799;
    const particleCount = Phaser.Math.Between(4, 8);
    this._emitDestructionParticles(ax, ay, color, particleCount);

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
      // Chance of power-up drop
      if (Math.random() < POWERUP_CHANCE) {
        this._spawnPowerUp(ax, ay);
      }
      // Chance of ammo crate drop
      if (Math.random() < AMMO_PICKUP_CHANCE) {
        this._spawnAmmoPickup(ax, ay);
      }
      // Ammo recovery: destroying a small asteroid gives 1 ammo back
      this.ammo = Math.min(AMMO_MAX, this.ammo + 1);
    }
  }

  _spawnOre(x, y) {
    const ore = this.physics.add.sprite(x, y, 'ore');
    this.ores.add(ore);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    ore.body.setVelocity(Math.cos(angle) * ORE_SPEED, Math.sin(angle) * ORE_SPEED);
    ore.body.setSize(10, 10);
    ore._born = this.time.now;
  }

  _spawnFuelPickup(x, y) {
    const pickup = this.physics.add.sprite(x, y, 'fuel_cell');
    this.fuelPickups.add(pickup);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    pickup.body.setVelocity(Math.cos(angle) * ORE_SPEED, Math.sin(angle) * ORE_SPEED);
    pickup.body.setCircle(6);
    pickup._born = this.time.now;
  }

  _collectOre(_ship, ore) {
    const now = this.time.now;

    // Update combo streak
    if (now - this.lastOreTime <= COMBO_WINDOW) {
      this.comboCount = Math.min(this.comboCount + 1, COMBO_MULTIPLIERS.length - 1);
    } else {
      this.comboCount = 0;
    }
    this.lastOreTime = now;
    this.comboMultiplier = COMBO_MULTIPLIERS[this.comboCount];

    const points = Math.round(ORE_SCORE * this.comboMultiplier);
    this.score += points;

    // Floating score text — color shifts with higher combos
    const comboColors = ['#ffcc00', '#ffdd33', '#ffaa00', '#ff8800', '#ff4400'];
    const color = comboColors[this.comboCount] || '#ff4400';
    const label = this.comboMultiplier > 1 ? `+${points} x${this.comboMultiplier}` : `+${points}`;
    const floatText = this.add.text(ore.x, ore.y, label, {
      fontSize: this.comboMultiplier > 1 ? '16px' : '14px',
      fontFamily: 'monospace',
      color,
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: floatText,
      y: ore.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => floatText.destroy(),
    });

    // Combo HUD pop animation
    if (this.comboMultiplier > 1) {
      this._showComboHUD();
    }

    ore.destroy();
  }

  _collectFuel(_ship, pickup) {
    this.fuel = Math.min(FUEL_MAX, this.fuel + FUEL_PICKUP_AMOUNT);
    pickup.destroy();
  }

  // -- Ammo pickups -----------------------------------------------------------

  _spawnAmmoPickup(x, y) {
    const pickup = this.physics.add.sprite(x, y, 'ammo_crate');
    this.ammoPickups.add(pickup);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    pickup.body.setVelocity(Math.cos(angle) * AMMO_PICKUP_SPEED, Math.sin(angle) * AMMO_PICKUP_SPEED);
    pickup.body.setCircle(6);
    pickup._born = this.time.now;
  }

  _collectAmmo(_ship, pickup) {
    const prev = this.ammo;
    this.ammo = Math.min(AMMO_MAX, this.ammo + AMMO_PICKUP_AMOUNT);
    const gained = this.ammo - prev;
    pickup.destroy();

    // Floating text
    const floatText = this.add.text(pickup.x, pickup.y, `+${gained} AMMO`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff8844',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: floatText,
      y: pickup.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => floatText.destroy(),
    });
  }

  _cleanupAmmoPickups() {
    const now = this.time.now;
    this.ammoPickups.getChildren().forEach((p) => {
      const age = now - p._born;
      if (age > AMMO_PICKUP_LIFESPAN) {
        p.destroy();
      } else if (age > AMMO_PICKUP_LIFESPAN - ORE_DESPAWN_WARN) {
        p.setAlpha(Math.sin(age * 0.008) * 0.4 + 0.5);
      }
    });
  }

  // -- Power-ups --------------------------------------------------------------

  _spawnPowerUp(x, y) {
    const type = POWERUP_KEYS[Phaser.Math.Between(0, POWERUP_KEYS.length - 1)];
    const cfg = POWERUP_TYPES[type];
    const pickup = this.physics.add.sprite(x, y, `powerup_${type}`);
    this.powerUps.add(pickup);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    pickup.body.setVelocity(Math.cos(angle) * POWERUP_SPEED, Math.sin(angle) * POWERUP_SPEED);
    pickup.body.setSize(12, 12);
    pickup._born = this.time.now;
    pickup._type = type;
    // Gentle rotation for visibility
    this.tweens.add({
      targets: pickup,
      angle: 360,
      duration: 2000,
      repeat: -1,
    });
  }

  _collectPowerUp(_ship, pickup) {
    const type = pickup._type;
    const cfg = POWERUP_TYPES[type];
    pickup.destroy();

    // Replace any active power-up
    if (this.powerUpTimer) {
      this.powerUpTimer.remove(false);
    }

    this.activePowerUp = { type, expiresAt: this.time.now + cfg.duration };

    // Visual feedback on activation
    this._flashShip(cfg.color);

    // Shield: set ship alpha hint
    if (type === 'shield') {
      this.ship.setTint(0x00ddff);
    }

    // Floating label
    const floatText = this.add.text(this.ship.x, this.ship.y - 20, cfg.label, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#' + cfg.color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: floatText,
      y: this.ship.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => floatText.destroy(),
    });

    this.powerUpTimer = this.time.delayedCall(cfg.duration, () => {
      this._deactivatePowerUp();
    });
  }

  _deactivatePowerUp() {
    if (!this.activePowerUp) return;
    this.activePowerUp = null;
    this.powerUpTimer = null;
    if (!this.gameOver) {
      this.ship.clearTint();
    }
  }

  _tickPowerUp() {
    if (!this.activePowerUp) {
      this.powerUpText.setText('');
      return;
    }
    const remaining = Math.max(0, this.activePowerUp.expiresAt - this.time.now);
    const cfg = POWERUP_TYPES[this.activePowerUp.type];
    const secs = (remaining / 1000).toFixed(1);
    this.powerUpText.setText(`${cfg.label} ${secs}s`);
    this.powerUpText.setColor('#' + cfg.color.toString(16).padStart(6, '0'));
  }

  _cleanupPowerUps() {
    const now = this.time.now;
    this.powerUps.getChildren().forEach((p) => {
      const age = now - p._born;
      if (age > POWERUP_LIFESPAN) {
        p.destroy();
      } else if (age > POWERUP_LIFESPAN - 1500) {
        // Blink before expiring
        p.setAlpha(Math.sin(age * 0.01) * 0.4 + 0.5);
      }
    });
  }

  _flashShip(color) {
    this.ship.setTint(color);
    this.time.delayedCall(200, () => {
      if (this.activePowerUp && this.activePowerUp.type === 'shield') {
        this.ship.setTint(0x00ddff);
      } else if (!this.gameOver) {
        this.ship.clearTint();
      }
    });
  }

  // -- Combo streak ---------------------------------------------------------

  _tickCombo() {
    if (this.comboCount > 0 && this.time.now - this.lastOreTime > COMBO_WINDOW) {
      this.comboCount = 0;
      this.comboMultiplier = 1;
      // Fade out combo text
      this.tweens.add({
        targets: this.comboText,
        alpha: 0,
        duration: 300,
      });
    }
  }

  _showComboHUD() {
    this.comboText.setText(`x${this.comboMultiplier}`);
    this.comboText.setAlpha(1);
    // Scale-up pop animation
    this.comboText.setScale(1.6);
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  // -- Store ----------------------------------------------------------------

  _toggleStore() {
    if (this.gameOver) return;
    if (this.storeOpen) {
      this._closeStore();
    } else {
      this._openStore();
    }
  }

  _openStore() {
    this.storeOpen = true;
    this.storeSelection = 0;
    this.physics.pause();

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Container for all store UI elements
    this.storeUI = [];

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(50);
    this.storeUI.push(overlay);

    // Title
    const title = this.add.text(cx, cy - 120, 'SHOP', {
      fontSize: '28px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffcc00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    this.storeUI.push(title);

    // Ore balance
    this.storeBalanceText = this.add.text(cx, cy - 90, `ORE: ${this.score}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    this.storeUI.push(this.storeBalanceText);

    // Items
    this.storeItemTexts = [];
    STORE_ITEMS.forEach((item, i) => {
      const y = cy - 50 + i * 36;
      const canAfford = this.score >= item.cost;
      const color = canAfford ? '#ffffff' : '#666666';
      const itemText = this.add.text(cx, y, `${item.label}  -  ${item.cost} ore  (${item.desc})`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
      this.storeUI.push(itemText);
      this.storeItemTexts.push(itemText);

      // Make items clickable on mobile
      itemText.setInteractive();
      itemText.on('pointerdown', () => {
        this.storeSelection = i;
        this._purchaseStoreItem();
      });
    });

    // Selection indicator
    this.storeCursor = this.add.text(cx - 170, cy - 50, '>', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    this.storeUI.push(this.storeCursor);

    // Instructions
    const instructions = this.isMobile
      ? 'Tap item to buy  |  Tap SHOP to close'
      : '[UP/DOWN] Select  [ENTER] Buy  [TAB] Close';
    const instrText = this.add.text(cx, cy + 140, instructions, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    this.storeUI.push(instrText);

    this._updateStoreHighlight();
  }

  _closeStore() {
    this.storeOpen = false;
    this.physics.resume();
    if (this.storeUI) {
      this.storeUI.forEach((obj) => obj.destroy());
      this.storeUI = null;
    }
    this.storeItemTexts = null;
    this.storeCursor = null;
    this.storeBalanceText = null;
  }

  _handleStoreInput() {
    if (Phaser.Input.Keyboard.JustDown(this.storeUpKey)) {
      this.storeSelection = Math.max(0, this.storeSelection - 1);
      this._updateStoreHighlight();
    } else if (Phaser.Input.Keyboard.JustDown(this.storeDownKey)) {
      this.storeSelection = Math.min(STORE_ITEMS.length - 1, this.storeSelection + 1);
      this._updateStoreHighlight();
    } else if (Phaser.Input.Keyboard.JustDown(this.storeEnterKey)) {
      this._purchaseStoreItem();
    }
  }

  _updateStoreHighlight() {
    if (!this.storeCursor || !this.storeItemTexts) return;
    const { height } = this.scale;
    const cy = height / 2;
    this.storeCursor.setY(cy - 50 + this.storeSelection * 36);

    // Update item colors based on affordability
    STORE_ITEMS.forEach((item, i) => {
      const canAfford = this.score >= item.cost;
      const isSelected = i === this.storeSelection;
      if (isSelected) {
        this.storeItemTexts[i].setColor(canAfford ? '#ffcc00' : '#884444');
      } else {
        this.storeItemTexts[i].setColor(canAfford ? '#ffffff' : '#666666');
      }
    });
  }

  _purchaseStoreItem() {
    const item = STORE_ITEMS[this.storeSelection];
    if (this.score < item.cost) return; // can't afford

    this.score -= item.cost;

    switch (item.key) {
      case 'fuel':
        this.fuel = Math.min(FUEL_MAX, this.fuel + 50);
        break;
      case 'ammo':
        this.ammo = Math.min(AMMO_MAX, this.ammo + 10);
        break;
      case 'shield':
        this._activateStorePowerUp('shield');
        break;
      case 'rapidfire':
        this._activateStorePowerUp('rapidfire');
        break;
      case 'spread':
        this._activateStorePowerUp('spread');
        break;
    }

    // Update balance display
    if (this.storeBalanceText) {
      this.storeBalanceText.setText(`ORE: ${this.score}`);
    }
    this._updateStoreHighlight();

    // Flash feedback
    if (this.storeCursor) {
      this.storeCursor.setColor('#00ff00');
      this.time.delayedCall(200, () => {
        if (this.storeCursor) this.storeCursor.setColor('#ffcc00');
      });
    }
  }

  _activateStorePowerUp(type) {
    const cfg = POWERUP_TYPES[type];
    // Replace any active power-up
    if (this.powerUpTimer) {
      this.powerUpTimer.remove(false);
    }
    this.activePowerUp = { type, expiresAt: this.time.now + cfg.duration };
    if (type === 'shield') {
      this.ship.setTint(0x00ddff);
    }
    this.powerUpTimer = this.time.delayedCall(cfg.duration, () => {
      this._deactivatePowerUp();
    });
  }

  // -- Ore magnetism --------------------------------------------------------

  _applyOreMagnetism(dt) {
    const sx = this.ship.x;
    const sy = this.ship.y;
    this.ores.getChildren().forEach((ore) => {
      const dx = sx - ore.x;
      const dy = sy - ore.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ORE_MAGNET_RADIUS && dist > 1) {
        // Stronger pull the closer the ore is
        const factor = 1 - dist / ORE_MAGNET_RADIUS;
        const pull = ORE_MAGNET_STRENGTH * factor;
        ore.body.setVelocity(
          ore.body.velocity.x + (dx / dist) * pull * dt,
          ore.body.velocity.y + (dy / dist) * pull * dt,
        );
      }
    });
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
      } else if (age > ORE_LIFESPAN - ORE_DESPAWN_WARN) {
        // Pulse: rapid alpha oscillation signals imminent despawn
        const t = (age - (ORE_LIFESPAN - ORE_DESPAWN_WARN)) / ORE_DESPAWN_WARN; // 0→1
        const pulse = 0.3 + 0.7 * Math.abs(Math.sin(age * 0.008));
        o.setAlpha(pulse * (1 - t * 0.6)); // fade out as t→1
        // Brighten ore tint to signal urgency
        if (!o._despawnWarned) {
          o._despawnWarned = true;
          o.setScale(1.2);
        }
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
    this.ammoPickups.getChildren().forEach(wrap);
    this.powerUps.getChildren().forEach(wrap);
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

    // VFX: ship death particles (red burst)
    this._emitDestructionParticles(this.ship.x, this.ship.y, 0xff3333, 8);

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

  _emitDestructionParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 160);
      const radius = Phaser.Math.FloatBetween(2, 4);
      const p = this.add.circle(x, y, radius, color).setDepth(5);
      this.tweens.add({
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
  }

  _emitBulletImpact(x, y) {
    const flash = this.add.circle(x, y, 8, 0xffffff).setDepth(5).setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
    for (let i = 0; i < 3; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spark = this.add.circle(
        x + Math.cos(angle) * 4,
        y + Math.sin(angle) * 4,
        1.5, 0xffffaa,
      ).setDepth(5);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20,
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

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

}
