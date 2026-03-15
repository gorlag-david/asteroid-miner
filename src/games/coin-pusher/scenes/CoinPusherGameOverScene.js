import Phaser from 'phaser';

export class CoinPusherGameOverScene extends Phaser.Scene {
  constructor() {
    super('CoinPusherGameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.bestScore = data.best || 0;
    this.isNewBest = data.isNewBest || false;
  }

  create() {
    const { width, height } = this.scale;
    this.isMobile = !this.sys.game.device.os.desktop;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(width / 2, height * 0.15, 'OUT OF COINS!', {
      fontSize: '42px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, height * 0.30, `SCORE: ${this.finalScore}`, {
      fontSize: '28px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5);

    // Best score
    const bestText = this.isNewBest ? 'NEW BEST!' : `BEST: ${this.bestScore}`;
    const bestColor = this.isNewBest ? '#ffcc00' : '#8888aa';
    this.add.text(width / 2, height * 0.40, bestText, {
      fontSize: '22px', fontFamily: 'monospace', color: bestColor,
    }).setOrigin(0.5);

    if (this.isNewBest) {
      // Celebration particles
      for (let i = 0; i < 12; i++) {
        const px = Phaser.Math.Between(width * 0.2, width * 0.8);
        const py = Phaser.Math.Between(height * 0.1, height * 0.5);
        const colors = [0xffcc00, 0x00ff88, 0xff44ff, 0xffffff];
        const dot = this.add.circle(px, py, Phaser.Math.Between(2, 4), Phaser.Utils.Array.GetRandom(colors));
        this.tweens.add({
          targets: dot,
          y: py - Phaser.Math.Between(30, 80),
          alpha: 0,
          duration: Phaser.Math.Between(800, 1500),
          delay: Phaser.Math.Between(0, 500),
          onComplete: () => dot.destroy(),
        });
      }
    }

    // Retry prompt
    const promptMsg = this.isMobile ? 'Tap to play again' : 'Press ENTER or SPACE to play again';
    const prompt = this.add.text(width / 2, height * 0.55, promptMsg, {
      fontSize: '18px', fontFamily: 'monospace', color: '#0f3460',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const restart = () => this.scene.start('CoinPusherPlayScene');

    this.input.keyboard.on('keydown-SPACE', restart);
    this.input.keyboard.on('keydown-ENTER', restart);
    this.input.on('pointerdown', (pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      if (hitObjects.length === 0) restart();
    });

    // Back to arcade
    const arcadeBtn = this.add.text(width / 2, height * 0.68, '[ BACK TO ARCADE ]', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff44ff',
      backgroundColor: '#1a1a2e', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    arcadeBtn.on('pointerover', () => arcadeBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a1a4e' }));
    arcadeBtn.on('pointerout', () => arcadeBtn.setStyle({ color: '#ff44ff', backgroundColor: '#1a1a2e' }));
    arcadeBtn.on('pointerdown', () => this.scene.start('ArcadeMenuScene'));

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('ArcadeMenuScene'));
  }
}
