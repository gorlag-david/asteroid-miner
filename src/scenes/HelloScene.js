import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() {
    super('HelloScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 40, 'lazygamedev', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'game engine ready', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#0f3460',
    }).setOrigin(0.5);

    // Bouncing logo to prove physics works
    const dot = this.add.circle(width / 2, height / 2 + 80, 12, 0x16213e);
    this.physics.add.existing(dot);
    dot.body.setVelocity(200, 150);
    dot.body.setBounce(1, 1);
    dot.body.setCollideWorldBounds(true);
  }
}
