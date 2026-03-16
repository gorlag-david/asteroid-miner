import Phaser from 'phaser';
import { generateCoinPusherTextures } from '../sprites.js';
import { drawTray, createWalls } from '../tray.js';
import { emitCoinScore, emitPrizeScore, cameraShake, emitCoinLanding, emitSparkle } from '../effects.js';
import { ComboTracker } from '../combo.js';
import { rollPrize, getPrizeConfig, PRIZE_CONFIG } from '../prizes.js';
import { createBumpers } from '../bumpers.js';
import { CoinPusherHUD } from '../hud.js';

// Layout constants — 800x600 canvas
const TRAY_LEFT = 200;
const TRAY_RIGHT = 600;
const TRAY_TOP = 80;
const TRAY_BOTTOM = 560;
const TRAY_WIDTH = TRAY_RIGHT - TRAY_LEFT;

// Pusher
const PUSHER_Y_MIN = 180;
const PUSHER_Y_MAX = 320;
const PUSHER_SPEED_MIN = 80;   // starting speed px/s
const PUSHER_SPEED_MAX = 160;  // max speed after ramp
const PUSHER_RAMP_DURATION = 120; // seconds to reach max speed

// Coin drop
const DROP_Y = TRAY_TOP + 10;
const COIN_GRAVITY = 200;
const COIN_BOUNCE = 0.3;
const COIN_DRAG = 60;
const COIN_RADIUS = 10;

// Game
const STARTING_COINS = 30;
const DROP_COOLDOWN = 400;
const PRIZE_SPAWN_INTERVAL = 8000;
const MAX_PRIZES = 5;

// Win zone
const WIN_ZONE_Y = TRAY_BOTTOM - 10;

// Bonus round
const BONUS_INTERVAL = 30; // seconds between bonus rounds
const BONUS_PRIZE_COUNT = 3;

export class CoinPusherPlayScene extends Phaser.Scene {
  constructor() {
    super('CoinPusherPlayScene');
  }

  create() {
    generateCoinPusherTextures(this);
    const { width, height } = this.scale;
    this.isMobile = !this.sys.game.device.os.desktop;

    // Game state
    this.coinsLeft = STARTING_COINS;
    this.score = 0;
    this.lastDrop = 0;
    this.gameOver = false;
    this.prizeTimer = 0;
    this.elapsed = 0;
    this.coinsDropped = 0;
    this.prizesCollected = 0;
    this.lastBonusTime = 0;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Draw tray visuals (replaced inline _drawTray)
    drawTray(this);

    // Physics groups
    this.coins = this.physics.add.group();
    this.prizes = this.physics.add.group();

    // Pusher
    this.pusher = this.physics.add.sprite(TRAY_LEFT + TRAY_WIDTH / 2, PUSHER_Y_MIN, 'pusher');
    this.pusher.setImmovable(true);
    this.pusher.body.setAllowGravity(false);
    this.pusher.setPushable(false);
    this.pusher.setDisplaySize(TRAY_WIDTH - 20, 20);
    this.pusher.body.setSize(TRAY_WIDTH - 20, 20);
    this.pusherDirection = 1;

    // Walls (replaced inline _createWalls)
    createWalls(this, this.coins, this.prizes);

    // Bumpers
    this.bumpers = createBumpers(this, { coins: this.coins, prizes: this.prizes });

    // Collisions
    this.physics.add.collider(this.coins, this.coins);
    this.physics.add.collider(this.coins, this.pusher);
    this.physics.add.collider(this.prizes, this.coins);
    this.physics.add.collider(this.prizes, this.pusher);
    this.physics.add.collider(this.prizes, this.prizes);

    // Combo tracker
    this.combo = new ComboTracker();

    // HUD (replaced inline HUD text objects)
    this.hud = new CoinPusherHUD(this);

    // Drop zone indicator
    this.dropIndicator = this.add.triangle(width / 2, DROP_Y - 12, 0, 0, 12, 0, 6, 8, 0xffcc00, 0.6);
    this.dropIndicator.setOrigin(0.5);

    // Controls hint
    const hint = this.isMobile ? 'Tap to drop a coin' : 'Click or press SPACE to drop a coin';
    this.add.text(width / 2, height - 12, hint, {
      fontSize: '11px', fontFamily: 'monospace', color: '#444466',
    }).setOrigin(0.5, 1).setDepth(10);

    // Input
    this.input.on('pointerdown', (pointer) => {
      this._dropCoin(Phaser.Math.Clamp(pointer.x, TRAY_LEFT + 20, TRAY_RIGHT - 20));
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      const px = this.input.activePointer.x;
      const dropX = (px > TRAY_LEFT && px < TRAY_RIGHT)
        ? px
        : TRAY_LEFT + TRAY_WIDTH / 2;
      this._dropCoin(dropX);
    });

    // Back to arcade
    const arcadeBtn = this.add.text(60, 20, '< ARCADE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff44ff',
      backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(10);
    arcadeBtn.on('pointerover', () => arcadeBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a1a4e' }));
    arcadeBtn.on('pointerout', () => arcadeBtn.setStyle({ color: '#ff44ff', backgroundColor: '#1a1a2e' }));
    arcadeBtn.on('pointerdown', () => this.scene.start('ArcadeMenuScene'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('ArcadeMenuScene'));

    // Seed initial coins and prizes
    this._seedTray();
  }

  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;
    this.elapsed += dt;

    this._movePusher(dt);
    this._checkFallenObjects();
    this._spawnPrizes(delta);
    this._checkBonusRound();
    this._updateDropIndicator();

    // Combo expiry check
    if (this.combo.update(Date.now())) {
      this.hud.hideCombo();
    }

    // Update HUD
    this.hud.update({
      coinsLeft: this.coinsLeft,
      score: this.score,
      comboMultiplier: this.combo.getMultiplier(),
      comboCount: this.combo.getCount(),
      elapsed: this.elapsed,
    });
  }

  // -- Pusher with difficulty ramp ------------------------------------------

  _movePusher(dt) {
    // Speed ramps from min to max over PUSHER_RAMP_DURATION seconds
    const rampT = Math.min(1, this.elapsed / PUSHER_RAMP_DURATION);
    const speed = PUSHER_SPEED_MIN + (PUSHER_SPEED_MAX - PUSHER_SPEED_MIN) * rampT;

    const y = this.pusher.y + this.pusherDirection * speed * dt;
    if (y >= PUSHER_Y_MAX) {
      this.pusher.y = PUSHER_Y_MAX;
      this.pusherDirection = -1;
    } else if (y <= PUSHER_Y_MIN) {
      this.pusher.y = PUSHER_Y_MIN;
      this.pusherDirection = 1;
    } else {
      this.pusher.y = y;
    }

    this.pusher.body.setVelocityY(this.pusherDirection * speed);
  }

  // -- Coin drop with scale-in animation ------------------------------------

  _dropCoin(x) {
    if (this.gameOver) return;
    const now = this.time.now;
    if (now - this.lastDrop < DROP_COOLDOWN) return;
    if (this.coinsLeft <= 0) return;

    this.coinsLeft--;
    this.coinsDropped++;
    this.lastDrop = now;

    const coin = this.physics.add.sprite(x, DROP_Y, 'coin');
    this.coins.add(coin);
    coin.body.setCircle(COIN_RADIUS, (coin.width / 2) - COIN_RADIUS, (coin.height / 2) - COIN_RADIUS);
    coin.body.setBounce(COIN_BOUNCE);
    coin.body.setDrag(COIN_DRAG);
    coin.body.setGravityY(COIN_GRAVITY);
    coin.body.setMaxVelocity(300, 300);
    coin._type = 'coin';

    // Scale-in animation
    coin.setScale(0);
    this.tweens.add({
      targets: coin,
      scaleX: 1, scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    // Landing flash after a brief delay
    this.time.delayedCall(400, () => {
      if (coin.active) {
        emitCoinLanding(this, coin.x, coin.y);
      }
    });

    coin.body.setVelocityX(Phaser.Math.FloatBetween(-15, 15));
    coin.body.setVelocityY(60);
  }

  // -- Check for objects falling off ----------------------------------------

  _checkFallenObjects() {
    const checkGroup = (group) => {
      group.getChildren().forEach((obj) => {
        if (obj.y > WIN_ZONE_Y) {
          this._scoreObject(obj);
          obj.destroy();
          return;
        }
        if (obj.x < TRAY_LEFT - 20 || obj.x > TRAY_RIGHT + 20) {
          obj.destroy();
        }
      });
    };
    checkGroup(this.coins);
    checkGroup(this.prizes);

    if (this.coinsLeft <= 0 && this.coins.getLength() === 0 && !this.gameOver) {
      this._endGame();
    }
  }

  // -- Scoring with combo system and effects --------------------------------

  _scoreObject(obj) {
    const comboResult = this.combo.recordScore();
    const multiplier = comboResult.multiplier;

    if (obj._type === 'coin') {
      const points = Math.round(1 * multiplier);
      this.score += points;
      emitCoinScore(this, obj.x, WIN_ZONE_Y - 10, points, '#ffcc00');
      if (multiplier > 1) {
        cameraShake(this, 0.004);
      }
    } else {
      // Prize object — look up config
      const config = getPrizeConfig(obj._type);
      if (config) {
        const points = Math.round(config.points * multiplier);
        this.score += points;
        this.prizesCollected++;
        emitPrizeScore(this, obj.x, WIN_ZONE_Y - 10, points, config.color);
        cameraShake(this, 0.01);
      }
    }

    // Show combo HUD if active
    if (comboResult.isCombo) {
      this.hud.showCombo(comboResult.multiplier);
    }
  }

  // -- Prize spawning using weighted PRIZE_CONFIG ---------------------------

  _spawnPrizes(delta) {
    this.prizeTimer += delta;
    if (this.prizeTimer < PRIZE_SPAWN_INTERVAL) return;
    this.prizeTimer = 0;

    if (this.prizes.getLength() >= MAX_PRIZES) return;

    this._spawnOnePrize();
  }

  _spawnOnePrize() {
    const prizeKey = rollPrize();
    const config = getPrizeConfig(prizeKey);

    const x = Phaser.Math.Between(TRAY_LEFT + 30, TRAY_RIGHT - 30);
    const y = DROP_Y;

    const prize = this.physics.add.sprite(x, y, config.texture);
    this.prizes.add(prize);
    prize.body.setCircle(config.radius, (prize.width / 2) - config.radius, (prize.height / 2) - config.radius);
    prize.body.setBounce(COIN_BOUNCE);
    prize.body.setDrag(COIN_DRAG);
    prize.body.setGravityY(COIN_GRAVITY);
    prize.body.setMaxVelocity(300, 300);
    prize._type = prizeKey;
    prize.body.setVelocityY(40);

    // Scale-in
    prize.setScale(0);
    this.tweens.add({
      targets: prize,
      scaleX: 1, scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Gentle glow tween
    this.tweens.add({
      targets: prize,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  // -- Bonus round every 30s -----------------------------------------------

  _checkBonusRound() {
    if (this.elapsed - this.lastBonusTime >= BONUS_INTERVAL) {
      this.lastBonusTime = this.elapsed;

      // Skip on first frame
      if (this.elapsed < 1) return;

      this.hud.showBonusRound();

      // Spawn 3 rapid prizes with sparkle effects
      for (let i = 0; i < BONUS_PRIZE_COUNT; i++) {
        this.time.delayedCall(i * 300, () => {
          if (this.gameOver) return;
          this._spawnOnePrize();

          // Sparkle at random tray positions
          const sx = Phaser.Math.Between(TRAY_LEFT + 40, TRAY_RIGHT - 40);
          const sy = Phaser.Math.Between(TRAY_TOP + 40, TRAY_BOTTOM - 40);
          emitSparkle(this, sx, sy, 0xffdd00);
        });
      }
    }
  }

  // -- Seed initial tray state ----------------------------------------------

  _seedTray() {
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(TRAY_LEFT + 30, TRAY_RIGHT - 30);
      const y = Phaser.Math.Between(PUSHER_Y_MAX + 20, TRAY_BOTTOM - 60);
      const coin = this.physics.add.sprite(x, y, 'coin');
      this.coins.add(coin);
      coin.body.setCircle(COIN_RADIUS, (coin.width / 2) - COIN_RADIUS, (coin.height / 2) - COIN_RADIUS);
      coin.body.setBounce(COIN_BOUNCE);
      coin.body.setDrag(COIN_DRAG);
      coin.body.setGravityY(COIN_GRAVITY);
      coin.body.setMaxVelocity(300, 300);
      coin._type = 'coin';
    }

    // Seed 2 prizes using the weighted system
    for (let i = 0; i < 2; i++) {
      const prizeKey = rollPrize();
      const config = getPrizeConfig(prizeKey);
      const x = Phaser.Math.Between(TRAY_LEFT + 60, TRAY_RIGHT - 60);
      const y = Phaser.Math.Between(PUSHER_Y_MAX + 40, TRAY_BOTTOM - 80);
      const prize = this.physics.add.sprite(x, y, config.texture);
      this.prizes.add(prize);
      prize.body.setCircle(config.radius, (prize.width / 2) - config.radius, (prize.height / 2) - config.radius);
      prize.body.setBounce(COIN_BOUNCE);
      prize.body.setDrag(COIN_DRAG);
      prize.body.setGravityY(COIN_GRAVITY);
      prize.body.setMaxVelocity(300, 300);
      prize._type = prizeKey;

      this.tweens.add({
        targets: prize,
        alpha: 0.6,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // -- Drop indicator -------------------------------------------------------

  _updateDropIndicator() {
    const px = this.input.activePointer.x;
    this.dropIndicator.x = Phaser.Math.Clamp(px, TRAY_LEFT + 20, TRAY_RIGHT - 20);
  }

  // -- Game over with expanded stats ----------------------------------------

  _endGame() {
    if (this.gameOver) return;
    this.gameOver = true;

    const prevBest = parseInt(localStorage.getItem('coinPusherBest') || '0', 10);
    const isNewBest = this.score > prevBest;
    if (isNewBest) {
      localStorage.setItem('coinPusherBest', String(this.score));
    }

    this.time.delayedCall(800, () => {
      this.scene.start('CoinPusherGameOverScene', {
        score: this.score,
        best: Math.max(this.score, prevBest),
        isNewBest,
        stats: {
          coinsDropped: this.coinsDropped,
          prizesCollected: this.prizesCollected,
          maxCombo: this.combo.getMaxCombo(),
          timePlayed: this.elapsed,
        },
      });
    });
  }
}
