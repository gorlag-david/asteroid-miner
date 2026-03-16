import Phaser from 'phaser';
import { addLeaderboardEntry, qualifiesForLeaderboard } from './CoinPusherLeaderboardScene.js';

export class CoinPusherGameOverScene extends Phaser.Scene {
  constructor() {
    super('CoinPusherGameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.bestScore = data.best || 0;
    this.isNewBest = data.isNewBest || false;
    this.stats = data.stats || { coinsDropped: 0, prizesCollected: 0, maxCombo: 0, timePlayed: 0 };
  }

  create() {
    const { width, height } = this.scale;
    this.isMobile = !this.sys.game.device.os.desktop;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this._createCoinRain(width);

    const title = this.add.text(width / 2, height * 0.12, 'OUT OF COINS!', {
      fontSize: '42px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(1);

    this.tweens.add({
      targets: title,
      scaleX: 1.05, scaleY: 1.05,
      duration: 2000, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, height * 0.25, `SCORE: ${this.finalScore}`, {
      fontSize: '32px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5).setDepth(1);

    if (this.isNewBest) {
      const newBestText = this.add.text(width / 2, height * 0.34, 'NEW BEST!', {
        fontSize: '26px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1);

      this.tweens.add({
        targets: newBestText,
        scaleX: 1.2, scaleY: 1.2,
        duration: 600, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const celebColors = [0xffcc00, 0x00ff88, 0xff44ff, 0xffffff];
      for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
        const dist = Phaser.Math.Between(60, 160);
        const dot = this.add.circle(
          width / 2, height * 0.34,
          Phaser.Math.Between(2, 5),
          Phaser.Utils.Array.GetRandom(celebColors)
        ).setDepth(1);

        this.tweens.add({
          targets: dot,
          x: width / 2 + Math.cos(angle) * dist,
          y: height * 0.34 + Math.sin(angle) * dist,
          alpha: 0,
          duration: Phaser.Math.Between(600, 1200),
          delay: Phaser.Math.Between(0, 300),
          ease: 'Power2',
          onComplete: () => dot.destroy(),
        });
      }
    } else {
      this.add.text(width / 2, height * 0.34, `BEST: ${this.bestScore}`, {
        fontSize: '22px', fontFamily: 'monospace', color: '#8888aa',
      }).setOrigin(0.5).setDepth(1);
    }

    this._createStatsPanel(width, height);

    if (qualifiesForLeaderboard(this.finalScore)) {
      this._createNicknameEntry(width, height);
    } else {
      this._createButtons(width, height);
    }

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('ArcadeMenuScene'));
  }

  _createCoinRain(width) {
    const goldColors = [0xffcc00, 0xffdd44, 0xeebb00, 0xddaa00, 0xffee66];
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const startY = Phaser.Math.Between(-50, -10);
      const radius = Phaser.Math.Between(2, 4);
      const color = Phaser.Utils.Array.GetRandom(goldColors);
      const coin = this.add.circle(x, startY, radius, color).setAlpha(0.7).setDepth(0);

      this.tweens.add({
        targets: coin,
        y: 620 + Phaser.Math.Between(0, 40),
        x: x + Phaser.Math.Between(-30, 30),
        alpha: 0.3,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 2000),
        ease: 'Sine.easeIn',
        onComplete: () => coin.destroy(),
      });
    }
  }

  _createStatsPanel(width, height) {
    const panelTop = height * 0.46;
    const panelBottom = height * 0.62;
    const panelW = 320;
    const panelH = panelBottom - panelTop;
    const panelX = (width - panelW) / 2;

    const bg = this.add.graphics().setDepth(1);
    bg.fillStyle(0x111133, 0.6);
    bg.fillRect(panelX, panelTop, panelW, panelH);

    const lineH = panelH / 4;
    const textX = width / 2;
    const stats = this.stats;

    const totalSec = Math.floor(stats.timePlayed || 0);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const rows = [
      `Coins Dropped: ${stats.coinsDropped}`,
      `Prizes Collected: ${stats.prizesCollected}`,
      `Max Combo: x${stats.maxCombo || 1}`,
      `Time Played: ${timeStr}`,
    ];

    rows.forEach((text, i) => {
      this.add.text(textX, panelTop + lineH * i + lineH / 2, text, {
        fontSize: '14px', fontFamily: 'monospace', color: '#8888aa',
      }).setOrigin(0.5).setDepth(2);
    });
  }

  _createNicknameEntry(width, height) {
    this.nickname = '';
    const maxChars = 10;

    this.add.text(width / 2, height * 0.66, 'ENTER NAME:', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(2);

    const nameDisplay = this.add.text(width / 2, height * 0.71, '_', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);

    let cursorVisible = true;
    this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        cursorVisible = !cursorVisible;
        this._updateNameDisplay(nameDisplay, cursorVisible);
      },
    });

    this.input.keyboard.on('keydown', (event) => {
      if (this._inputLocked) return;
      const key = event.key;
      if (key === 'Backspace') {
        this.nickname = this.nickname.slice(0, -1);
        this._updateNameDisplay(nameDisplay, cursorVisible);
      } else if (key === 'Enter') {
        this._saveName();
      } else if (key.length === 1 && /^[a-zA-Z0-9 _\-.]$/.test(key) && this.nickname.length < maxChars) {
        this.nickname += key.toUpperCase();
        this._updateNameDisplay(nameDisplay, cursorVisible);
      }
    });

    const saveBtn = this.add.text(width / 2, height * 0.77, '[ SAVE ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#1a1a2e', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

    saveBtn.on('pointerover', () => saveBtn.setStyle({ color: '#ffffff', backgroundColor: '#224422' }));
    saveBtn.on('pointerout', () => saveBtn.setStyle({ color: '#00ff88', backgroundColor: '#1a1a2e' }));
    saveBtn.on('pointerdown', () => this._saveName());

    const arcadeBtn = this.add.text(width / 2, height * 0.87, '[ BACK TO ARCADE ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff44ff',
      backgroundColor: '#1a1a2e', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

    arcadeBtn.on('pointerover', () => arcadeBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a1a4e' }));
    arcadeBtn.on('pointerout', () => arcadeBtn.setStyle({ color: '#ff44ff', backgroundColor: '#1a1a2e' }));
    arcadeBtn.on('pointerdown', () => this.scene.start('ArcadeMenuScene'));
  }

  _updateNameDisplay(textObj, showCursor) {
    const cursor = showCursor ? '_' : ' ';
    textObj.setText((this.nickname || '') + cursor);
  }

  _saveName() {
    if (this._inputLocked) return;
    this._inputLocked = true;
    addLeaderboardEntry(this.nickname || 'ANON', this.finalScore);
    this.scene.start('CoinPusherLeaderboardScene');
  }

  _createButtons(width, height) {
    const promptMsg = this.isMobile ? 'Tap to play again' : 'Press ENTER or SPACE to play again';
    const prompt = this.add.text(width / 2, height * 0.68, promptMsg, {
      fontSize: '18px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5).setDepth(2);

    this.tweens.add({
      targets: prompt, alpha: 0.3,
      duration: 800, yoyo: true, repeat: -1,
    });

    const restart = () => this.scene.start('CoinPusherPlayScene');
    this.input.keyboard.on('keydown-SPACE', restart);
    this.input.keyboard.on('keydown-ENTER', restart);
    this.input.on('pointerdown', (pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length === 0) restart();
    });

    const lbBtn = this.add.text(width / 2, height * 0.78, '[ LEADERBOARD ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
      backgroundColor: '#1a1a2e', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

    lbBtn.on('pointerover', () => lbBtn.setStyle({ color: '#ffffff', backgroundColor: '#224422' }));
    lbBtn.on('pointerout', () => lbBtn.setStyle({ color: '#00ff88', backgroundColor: '#1a1a2e' }));
    lbBtn.on('pointerdown', () => this.scene.start('CoinPusherLeaderboardScene'));

    const arcadeBtn = this.add.text(width / 2, height * 0.87, '[ BACK TO ARCADE ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff44ff',
      backgroundColor: '#1a1a2e', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

    arcadeBtn.on('pointerover', () => arcadeBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a1a4e' }));
    arcadeBtn.on('pointerout', () => arcadeBtn.setStyle({ color: '#ff44ff', backgroundColor: '#1a1a2e' }));
    arcadeBtn.on('pointerdown', () => this.scene.start('ArcadeMenuScene'));
  }
}
