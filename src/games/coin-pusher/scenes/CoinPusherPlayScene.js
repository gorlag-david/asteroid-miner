import Phaser from 'phaser';
import { generateCoinPusherTextures } from '../sprites.js';

// Layout constants — 800x600 canvas
const TRAY_LEFT = 200;
const TRAY_RIGHT = 600;
const TRAY_TOP = 80;
const TRAY_BOTTOM = 560;
const TRAY_WIDTH = TRAY_RIGHT - TRAY_LEFT;

// Pusher
const PUSHER_Y_MIN = 180;
const PUSHER_Y_MAX = 320;
const PUSHER_SPEED = 80; // px/s

// Coin drop
const DROP_Y = TRAY_TOP + 10;
const COIN_GRAVITY = 200;
const COIN_BOUNCE = 0.3;
const COIN_DRAG = 60;
const COIN_RADIUS = 10;

// Game
const STARTING_COINS = 30;
const DROP_COOLDOWN = 400; // ms between drops
const PRIZE_SPAWN_INTERVAL = 8000; // ms
const MAX_PRIZES = 5;

// Scoring
const COIN_VALUE = 1;
const GEM_VALUE = 5;
const TOKEN_VALUE = 10;

// Win zone: the front edge where coins fall off to score
const WIN_ZONE_Y = TRAY_BOTTOM - 10;

export class CoinPusherPlayScene extends Phaser.Scene {
  constructor() {
    super('CoinPusherPlayScene');
  }

  create() {
    generateCoinPusherTextures(this);
    const { width, height } = this.scale;
    this.isMobile = !this.sys.game.device.os.desktop;

    this.coinsLeft = STARTING_COINS;
    this.score = 0;
    this.lastDrop = 0;
    this.gameOver = false;
    this.prizeTimer = 0;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Draw tray walls
    this._drawTray(width, height);

    // Physics groups
    this.coins = this.physics.add.group();
    this.prizes = this.physics.add.group();

    // Pusher — a kinematic body that moves up and down
    this.pusher = this.physics.add.sprite(TRAY_LEFT + TRAY_WIDTH / 2, PUSHER_Y_MIN, 'pusher');
    this.pusher.setImmovable(true);
    this.pusher.body.setAllowGravity(false);
    this.pusher.setPushable(false);
    // Widen pusher to match tray width
    this.pusher.setDisplaySize(TRAY_WIDTH - 20, 20);
    this.pusher.body.setSize(TRAY_WIDTH - 20, 20);
    this.pusherDirection = 1; // 1 = moving down, -1 = moving up

    // Tray boundary walls (invisible physics bodies)
    this._createWalls();

    // Collisions
    this.physics.add.collider(this.coins, this.coins);
    this.physics.add.collider(this.coins, this.pusher);
    this.physics.add.collider(this.prizes, this.coins);
    this.physics.add.collider(this.prizes, this.pusher);
    this.physics.add.collider(this.prizes, this.prizes);

    // Drop zone indicator
    this.dropIndicator = this.add.triangle(width / 2, DROP_Y - 12, 0, 0, 12, 0, 6, 8, 0xffcc00, 0.6);
    this.dropIndicator.setOrigin(0.5);

    // HUD
    this.hudCoins = this.add.text(14, 14, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setDepth(10);

    this.hudScore = this.add.text(14, 36, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
    }).setDepth(10);

    this._updateHUD();

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
      // Drop at current pointer X or center
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

    // Seed a few coins and prizes on the tray
    this._seedTray();
  }

  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;

    this._movePusher(dt);
    this._checkFallenObjects();
    this._spawnPrizes(delta);
    this._updateDropIndicator();
    this._updateHUD();
  }

  // -- Tray visuals ----------------------------------------------------------

  _drawTray() {
    const g = this.add.graphics();

    // Tray floor
    g.fillStyle(0x222244, 1);
    g.fillRect(TRAY_LEFT, TRAY_TOP, TRAY_WIDTH, TRAY_BOTTOM - TRAY_TOP);

    // Tray floor texture lines
    g.lineStyle(1, 0x333355, 0.3);
    for (let y = TRAY_TOP; y < TRAY_BOTTOM; y += 20) {
      g.lineBetween(TRAY_LEFT, y, TRAY_RIGHT, y);
    }

    // Side walls visual
    g.fillStyle(0x444466, 1);
    g.fillRect(TRAY_LEFT - 10, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);
    g.fillRect(TRAY_RIGHT, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);

    // Back wall visual
    g.fillStyle(0x444466, 1);
    g.fillRect(TRAY_LEFT - 10, TRAY_TOP - 10, TRAY_WIDTH + 20, 10);

    // Win zone highlight (front edge)
    g.fillStyle(0x00ff88, 0.08);
    g.fillRect(TRAY_LEFT, TRAY_BOTTOM - 30, TRAY_WIDTH, 30);

    // Win zone label
    this.add.text(TRAY_LEFT + TRAY_WIDTH / 2, TRAY_BOTTOM - 15, 'WIN ZONE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5).setAlpha(0.4);

    // Drop zone label at top
    this.add.text(TRAY_LEFT + TRAY_WIDTH / 2, TRAY_TOP - 20, 'DROP ZONE', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setAlpha(0.4);

    g.setDepth(-1);
  }

  _createWalls() {
    // Left wall
    this.leftWall = this.physics.add.staticBody(TRAY_LEFT - 5, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);
    // Right wall
    this.rightWall = this.physics.add.staticBody(TRAY_RIGHT - 5, TRAY_TOP, 10, TRAY_BOTTOM - TRAY_TOP);
    // Back wall (top)
    this.backWall = this.physics.add.staticBody(TRAY_LEFT, TRAY_TOP - 5, TRAY_WIDTH, 10);

    // Collide coins and prizes with walls
    this.physics.add.collider(this.coins, this.leftWall);
    this.physics.add.collider(this.coins, this.rightWall);
    this.physics.add.collider(this.coins, this.backWall);
    this.physics.add.collider(this.prizes, this.leftWall);
    this.physics.add.collider(this.prizes, this.rightWall);
    this.physics.add.collider(this.prizes, this.backWall);
  }

  // -- Pusher ----------------------------------------------------------------

  _movePusher(dt) {
    const y = this.pusher.y + this.pusherDirection * PUSHER_SPEED * dt;
    if (y >= PUSHER_Y_MAX) {
      this.pusher.y = PUSHER_Y_MAX;
      this.pusherDirection = -1;
    } else if (y <= PUSHER_Y_MIN) {
      this.pusher.y = PUSHER_Y_MIN;
      this.pusherDirection = 1;
    } else {
      this.pusher.y = y;
    }

    // Push coins that are in front of the pusher via velocity
    const pushVelY = this.pusherDirection * PUSHER_SPEED;
    this.pusher.body.setVelocityY(pushVelY);
  }

  // -- Coin drop -------------------------------------------------------------

  _dropCoin(x) {
    if (this.gameOver) return;
    const now = this.time.now;
    if (now - this.lastDrop < DROP_COOLDOWN) return;
    if (this.coinsLeft <= 0) return;

    this.coinsLeft--;
    this.lastDrop = now;

    const coin = this.physics.add.sprite(x, DROP_Y, 'coin');
    this.coins.add(coin);
    coin.body.setCircle(COIN_RADIUS, (coin.width / 2) - COIN_RADIUS, (coin.height / 2) - COIN_RADIUS);
    coin.body.setBounce(COIN_BOUNCE);
    coin.body.setDrag(COIN_DRAG);
    coin.body.setGravityY(COIN_GRAVITY);
    coin.body.setMaxVelocity(300, 300);
    coin._type = 'coin';

    // Slight random horizontal nudge
    coin.body.setVelocityX(Phaser.Math.FloatBetween(-15, 15));
    coin.body.setVelocityY(60);
  }

  // -- Check for objects falling off the front or sides ----------------------

  _checkFallenObjects() {
    const checkGroup = (group) => {
      group.getChildren().forEach((obj) => {
        // Fell off the front (bottom) = win
        if (obj.y > WIN_ZONE_Y) {
          this._scoreObject(obj);
          obj.destroy();
          return;
        }
        // Fell off sides = lost (shouldn't happen with walls, but safety)
        if (obj.x < TRAY_LEFT - 20 || obj.x > TRAY_RIGHT + 20) {
          obj.destroy();
        }
      });
    };
    checkGroup(this.coins);
    checkGroup(this.prizes);

    // Check game over
    if (this.coinsLeft <= 0 && this.coins.getLength() === 0 && !this.gameOver) {
      this._endGame();
    }
  }

  _scoreObject(obj) {
    let points = 0;
    let color = '#ffcc00';
    if (obj._type === 'coin') {
      points = COIN_VALUE;
      color = '#ffcc00';
    } else if (obj._type === 'gem') {
      points = GEM_VALUE;
      color = '#00ff88';
    } else if (obj._type === 'token') {
      points = TOKEN_VALUE;
      color = '#ff44ff';
    }
    this.score += points;

    // Floating score text
    const label = `+${points}`;
    const floatText = this.add.text(obj.x, WIN_ZONE_Y - 10, label, {
      fontSize: '16px', fontFamily: 'monospace', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: floatText,
      y: WIN_ZONE_Y - 40,
      alpha: 0,
      duration: 600,
      onComplete: () => floatText.destroy(),
    });
  }

  // -- Prize spawning --------------------------------------------------------

  _spawnPrizes(delta) {
    this.prizeTimer += delta;
    if (this.prizeTimer < PRIZE_SPAWN_INTERVAL) return;
    this.prizeTimer = 0;

    if (this.prizes.getLength() >= MAX_PRIZES) return;

    const isToken = Math.random() < 0.3;
    const texKey = isToken ? 'special_token' : 'gem';
    const type = isToken ? 'token' : 'gem';

    const x = Phaser.Math.Between(TRAY_LEFT + 30, TRAY_RIGHT - 30);
    const y = DROP_Y;

    const prize = this.physics.add.sprite(x, y, texKey);
    this.prizes.add(prize);
    prize.body.setCircle(8, (prize.width / 2) - 8, (prize.height / 2) - 8);
    prize.body.setBounce(COIN_BOUNCE);
    prize.body.setDrag(COIN_DRAG);
    prize.body.setGravityY(COIN_GRAVITY);
    prize.body.setMaxVelocity(300, 300);
    prize._type = type;
    prize.body.setVelocityY(40);

    // Gentle glow tween
    this.tweens.add({
      targets: prize,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  // -- Seed initial tray state -----------------------------------------------

  _seedTray() {
    // Place some coins in the middle zone
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

    // A couple prizes
    for (let i = 0; i < 2; i++) {
      const isToken = i === 1;
      const texKey = isToken ? 'special_token' : 'gem';
      const x = Phaser.Math.Between(TRAY_LEFT + 60, TRAY_RIGHT - 60);
      const y = Phaser.Math.Between(PUSHER_Y_MAX + 40, TRAY_BOTTOM - 80);
      const prize = this.physics.add.sprite(x, y, texKey);
      this.prizes.add(prize);
      prize.body.setCircle(8, (prize.width / 2) - 8, (prize.height / 2) - 8);
      prize.body.setBounce(COIN_BOUNCE);
      prize.body.setDrag(COIN_DRAG);
      prize.body.setGravityY(COIN_GRAVITY);
      prize.body.setMaxVelocity(300, 300);
      prize._type = isToken ? 'token' : 'gem';

      this.tweens.add({
        targets: prize,
        alpha: 0.6,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // -- Drop indicator --------------------------------------------------------

  _updateDropIndicator() {
    const px = this.input.activePointer.x;
    const clampedX = Phaser.Math.Clamp(px, TRAY_LEFT + 20, TRAY_RIGHT - 20);
    this.dropIndicator.x = clampedX;
  }

  // -- HUD -------------------------------------------------------------------

  _updateHUD() {
    this.hudCoins.setText(`COINS: ${this.coinsLeft}`);
    this.hudScore.setText(`SCORE: ${this.score}`);

    // Flash coins red when low
    this.hudCoins.setColor(this.coinsLeft <= 5 ? '#ff4444' : '#ffcc00');
  }

  // -- Game over -------------------------------------------------------------

  _endGame() {
    if (this.gameOver) return;
    this.gameOver = true;

    // Save high score
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
      });
    });
  }
}
