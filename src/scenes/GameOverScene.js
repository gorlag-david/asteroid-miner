import Phaser from 'phaser';

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
  }
}
