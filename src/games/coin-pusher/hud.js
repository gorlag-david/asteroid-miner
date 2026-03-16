import Phaser from 'phaser';

const MAX_COINS = 30;
const COIN_BAR_WIDTH = 120;
const COIN_BAR_HEIGHT = 8;
const COIN_BAR_X = 14;
const COIN_BAR_Y = 60;

export class CoinPusherHUD {
  constructor(scene) {
    this.scene = scene;

    this.coinsText = scene.add.text(14, 14, 'COINS: 30', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc00',
    }).setDepth(10);

    this.scoreText = scene.add.text(14, 36, 'SCORE: 0', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
    }).setDepth(10);

    this.coinBarBg = scene.add.rectangle(
      COIN_BAR_X, COIN_BAR_Y, COIN_BAR_WIDTH, COIN_BAR_HEIGHT, 0x333355, 1,
    ).setOrigin(0, 0).setDepth(10);

    this.coinBarFill = scene.add.rectangle(
      COIN_BAR_X, COIN_BAR_Y, COIN_BAR_WIDTH, COIN_BAR_HEIGHT, 0xffcc00, 1,
    ).setOrigin(0, 0).setDepth(10);

    this.coinBarBorder = scene.add.rectangle(
      COIN_BAR_X, COIN_BAR_Y, COIN_BAR_WIDTH, COIN_BAR_HEIGHT,
    ).setOrigin(0, 0).setDepth(10).setStrokeStyle(1, 0x666688);

    const { width } = scene.scale;
    this.comboText = scene.add.text(width - 14, 14, '', {
      fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffcc00',
    }).setOrigin(1, 0).setDepth(10).setAlpha(0);

    this.timeText = scene.add.text(width / 2, 14, '00:00', {
      fontSize: '14px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5, 0).setDepth(10);

    this.bonusText = scene.add.text(width / 2, 300, 'BONUS ROUND!', {
      fontSize: '36px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd00',
    }).setOrigin(0.5).setDepth(10).setAlpha(0).setScale(0);

    this._coinsFlashing = false;
  }

  update(data) {
    const { coinsLeft, score, comboMultiplier, comboCount, elapsed } = data;

    this.coinsText.setText(`COINS: ${coinsLeft}`);
    this.coinsText.setColor(coinsLeft <= 5 ? '#ff4444' : '#ffcc00');

    this.scoreText.setText(`SCORE: ${score}`);

    const fillRatio = Math.max(0, Math.min(1, coinsLeft / MAX_COINS));
    this.coinBarFill.setDisplaySize(COIN_BAR_WIDTH * fillRatio, COIN_BAR_HEIGHT);
    this.coinBarFill.setFillStyle(coinsLeft <= 5 ? 0xff4444 : 0xffcc00, 1);

    if (comboMultiplier > 1) {
      this.comboText.setText(`x${comboMultiplier}`);
      if (this.comboText.alpha === 0) {
        this.comboText.setAlpha(1);
      }
    }

    const totalSeconds = Math.floor(elapsed);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timeText.setText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  }

  showCombo(multiplier) {
    this.comboText.setText(`x${multiplier}`);
    this.comboText.setAlpha(1);
    this.comboText.setScale(1.8);
    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1, scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  hideCombo() {
    this.scene.tweens.add({
      targets: this.comboText,
      alpha: 0,
      duration: 300,
    });
  }

  showBonusRound() {
    this.bonusText.setAlpha(1).setScale(0);
    this.scene.tweens.add({
      targets: this.bonusText,
      scaleX: 1.2, scaleY: 1.2,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.bonusText,
          scaleX: 1, scaleY: 1, alpha: 0,
          duration: 1100,
          ease: 'Power2',
          onComplete: () => this.bonusText.setScale(0).setAlpha(0),
        });
      },
    });
  }

  destroy() {
    this.coinsText.destroy();
    this.scoreText.destroy();
    this.coinBarBg.destroy();
    this.coinBarFill.destroy();
    this.coinBarBorder.destroy();
    this.comboText.destroy();
    this.timeText.destroy();
    this.bonusText.destroy();
  }
}
