import Phaser from 'phaser';
import { KOFI_URL, GITHUB_ISSUES_URL } from '../config.js';
import { addLeaderboardEntry, getLeaderboard } from './LeaderboardScene.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.bestScore = data.best || 0;
    this.isNewBest = data.isNewBest || false;
    this.nickname = '';
    this.nameSubmitted = false;
  }

  create() {
    const { width, height } = this.scale;
    this.isMobile = !this.sys.game.device.os.desktop;

    this.add.text(width / 2, height * 0.12, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.25, `ORE COLLECTED: ${this.finalScore}`, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // High score display
    const bestText = this.isNewBest ? 'NEW BEST!' : `BEST: ${this.bestScore}`;
    const bestColor = this.isNewBest ? '#00ff88' : '#8888aa';
    this.add.text(width / 2, height * 0.33, bestText, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: bestColor,
    }).setOrigin(0.5);

    // Check if score qualifies for leaderboard
    const board = getLeaderboard();
    const qualifies = board.length < 10 || this.finalScore > (board[board.length - 1]?.score ?? 0);

    if (qualifies && this.finalScore > 0) {
      this._showNicknameEntry(width, height);
    } else {
      this._showPostSubmitUI(width, height);
    }
  }

  _showNicknameEntry(width, height) {
    this.add.text(width / 2, height * 0.43, 'ENTER YOUR NAME:', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#8888aa',
    }).setOrigin(0.5);

    // Name input display
    this.nameDisplay = this.add.text(width / 2, height * 0.51, '_', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#222244',
      padding: { x: 16, y: 8 },
      fixedWidth: 260,
      align: 'center',
    }).setOrigin(0.5);

    // Cursor blink
    this.cursorVisible = true;
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this._updateNameDisplay();
      },
    });

    // Keyboard input for name
    this.input.keyboard.on('keydown', (event) => {
      if (this.nameSubmitted) return;

      if (event.key === 'Enter' && this.nickname.length > 0) {
        this._submitName();
      } else if (event.key === 'Backspace') {
        this.nickname = this.nickname.slice(0, -1);
        this._updateNameDisplay();
      } else if (event.key.length === 1 && this.nickname.length < 10) {
        // Allow alphanumeric and common symbols
        if (/^[a-zA-Z0-9 _\-.]$/.test(event.key)) {
          this.nickname += event.key.toUpperCase();
          this._updateNameDisplay();
        }
      }
    });

    // Mobile: show a prompt dialog since on-screen keyboard is awkward in canvas
    if (this.isMobile) {
      this.time.delayedCall(300, () => {
        const name = prompt('Enter your name for the leaderboard (max 10 chars):');
        if (name && name.trim()) {
          this.nickname = name.trim().toUpperCase().slice(0, 10);
          this._submitName();
        } else {
          this.nickname = 'ANON';
          this._submitName();
        }
      });
    }

    const hint = this.isMobile ? '' : 'Type your name, then press ENTER';
    if (hint) {
      this.add.text(width / 2, height * 0.59, hint, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555577',
      }).setOrigin(0.5);
    }
  }

  _updateNameDisplay() {
    if (!this.nameDisplay) return;
    const cursor = this.cursorVisible ? '_' : '';
    this.nameDisplay.setText(this.nickname + cursor || '_');
  }

  _submitName() {
    if (this.nameSubmitted) return;
    this.nameSubmitted = true;

    addLeaderboardEntry(this.nickname, this.finalScore);

    // Clear the name entry UI and show post-submit options
    if (this.nameDisplay) {
      this.nameDisplay.setText(this.nickname);
      this.nameDisplay.setColor('#00ff88');
    }

    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.59, 'SCORE SAVED!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ff88',
    }).setOrigin(0.5);

    this.time.delayedCall(500, () => {
      this._showPostSubmitUI(width, height);
    });
  }

  _showPostSubmitUI(width, height) {
    const promptMsg = this.isMobile ? 'Tap to retry' : 'Press ENTER or SPACE to retry';
    const prompt = this.add.text(width / 2, height * 0.68, promptMsg, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#0f3460',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const restartGame = () => this.scene.start('ShipSelectScene');

    // Leaderboard button
    const lbBtn = this.add.text(width / 2, height * 0.76, '[ LEADERBOARD ]', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      backgroundColor: '#2a2a4a',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerover', () => lbBtn.setStyle({ color: '#ffffff', backgroundColor: '#ffcc00' }));
    lbBtn.on('pointerout', () => lbBtn.setStyle({ color: '#ffcc00', backgroundColor: '#2a2a4a' }));
    lbBtn.on('pointerdown', () => this.scene.start('LeaderboardScene'));

    this.input.keyboard.on('keydown-SPACE', restartGame);
    this.input.keyboard.on('keydown-ENTER', restartGame);
    this.input.on('pointerdown', (pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length === 0) restartGame();
    });

    // Community-driven feature request link
    const featureLink = this.add.text(width / 2, height * 0.85, 'Want a new feature? Request it on GitHub', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#58a6ff',
      backgroundColor: '#1a1a2e',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    featureLink.on('pointerover', () => featureLink.setStyle({ color: '#ffffff', backgroundColor: '#1a3a5e' }));
    featureLink.on('pointerout', () => featureLink.setStyle({ color: '#58a6ff', backgroundColor: '#1a1a2e' }));
    featureLink.on('pointerdown', () => window.open(GITHUB_ISSUES_URL, '_blank'));

    // Ko-fi tip jar button
    const tipBtn = this.add.text(width / 2, height - 30, 'Enjoyed it? Support on Ko-fi', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff5e5b',
      backgroundColor: '#2a2a4a',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tipBtn.on('pointerover', () => tipBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff5e5b' }));
    tipBtn.on('pointerout', () => tipBtn.setStyle({ color: '#ff5e5b', backgroundColor: '#2a2a4a' }));
    tipBtn.on('pointerdown', () => window.open(KOFI_URL, '_blank'));

    // Back to arcade menu
    const arcadeBtn = this.add.text(width / 2, height * 0.92, '[ BACK TO ARCADE ]', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ff44ff',
      backgroundColor: '#1a1a2e',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    arcadeBtn.on('pointerover', () => arcadeBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a1a4e' }));
    arcadeBtn.on('pointerout', () => arcadeBtn.setStyle({ color: '#ff44ff', backgroundColor: '#1a1a2e' }));
    arcadeBtn.on('pointerdown', () => this.scene.start('ArcadeMenuScene'));

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('ArcadeMenuScene'));
  }
}
