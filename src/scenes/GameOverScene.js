import Phaser from 'phaser';
import { KOFI_URL } from '../config.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.bestScore = data.best || 0;
    this.isNewBest = data.isNewBest || false;
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 4, 'GAME OVER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.42, `ORE COLLECTED: ${this.finalScore}`, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // High score display
    const bestText = this.isNewBest ? 'NEW BEST!' : `BEST: ${this.bestScore}`;
    const bestColor = this.isNewBest ? '#00ff88' : '#8888aa';
    this.add.text(width / 2, height * 0.52, bestText, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: bestColor,
    }).setOrigin(0.5);

    const prompt = this.add.text(width / 2, height * 0.7, 'Press ENTER or SPACE to retry', {
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

    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('PlayScene'));
    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('PlayScene'));

    // Ko-fi tip jar button — more prominent on game over to catch post-session generosity
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
  }
}
