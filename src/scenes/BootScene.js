import Phaser from 'phaser';

const TIP_JAR_URL = 'https://ko-fi.com/lazygamedev';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'ASTEROID MINER', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, 'Harvest ore. Survive. Chase high scores.', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#8888aa',
    }).setOrigin(0.5);

    // Show persistent high score if one exists
    const best = parseInt(localStorage.getItem('asteroidMinerBest') || '0', 10);
    if (best > 0) {
      this.add.text(width / 2, height * 0.58, `BEST: ${best}`, {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffcc00',
      }).setOrigin(0.5);
    }

    const prompt = this.add.text(width / 2, height * 0.7, 'Press ENTER or SPACE to start', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#0f3460',
    }).setOrigin(0.5);

    // Blink the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('PlayScene'));
    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('PlayScene'));

    const tipBtn = this.add.text(width / 2, height - 30, 'Support the Dev - $1', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#555577',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tipBtn.on('pointerover', () => tipBtn.setColor('#8888cc'));
    tipBtn.on('pointerout', () => tipBtn.setColor('#555577'));
    tipBtn.on('pointerdown', () => window.open(TIP_JAR_URL, '_blank'));
  }
}
