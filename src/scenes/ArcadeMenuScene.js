import Phaser from 'phaser';
import { generateAllTextures } from '../sprites.js';
import { KOFI_URL, GITHUB_ISSUES_URL } from '../config.js';

const GAMES = [
  {
    key: 'asteroid-miner',
    name: 'ASTEROID\nMINER',
    tagline: 'Mine ore. Survive. High scores.',
    color: 0xe94560,
    colorHex: '#e94560',
    available: true,
    scene: 'BootScene',
  },
  {
    key: 'coin-pusher',
    name: 'COIN\nPUSHER',
    tagline: 'Drop coins. Push prizes.',
    color: 0xffcc00,
    colorHex: '#ffcc00',
    available: false,
    scene: null,
  },
];

export class ArcadeMenuScene extends Phaser.Scene {
  constructor() {
    super('ArcadeMenuScene');
  }

  create() {
    generateAllTextures(this);
    const { width, height } = this.scale;
    this.selected = 0;
    this.isMobile = !this.sys.game.device.os.desktop;

    // Background — dark arcade floor
    this.cameras.main.setBackgroundColor('#0a0a18');

    // Scanline overlay effect
    const scanlines = this.add.graphics();
    scanlines.setAlpha(0.03);
    for (let y = 0; y < height; y += 4) {
      scanlines.fillStyle(0x000000, 1);
      scanlines.fillRect(0, y, width, 2);
    }
    scanlines.setDepth(100);

    // Neon header
    const headerGlow = this.add.text(width / 2, 52, 'LAZY ARCADE', {
      fontSize: '44px',
      fontFamily: 'monospace',
      color: '#ff00ff',
    }).setOrigin(0.5).setAlpha(0.15).setScale(1.05);

    const header = this.add.text(width / 2, 50, 'LAZY ARCADE', {
      fontSize: '44px',
      fontFamily: 'monospace',
      color: '#ff44ff',
    }).setOrigin(0.5);

    // Pulse the glow
    this.tweens.add({
      targets: headerGlow,
      alpha: 0.08,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, 90, 'SELECT A GAME', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    // Arcade cabinets
    this.cabinets = [];
    const cabinetWidth = 260;
    const gap = 40;
    const totalWidth = GAMES.length * cabinetWidth + (GAMES.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + cabinetWidth / 2;

    GAMES.forEach((game, i) => {
      const cx = startX + i * (cabinetWidth + gap);
      const cy = height / 2 + 10;
      this.cabinets.push(this._createCabinet(cx, cy, game, i));
    });

    this._updateSelection();

    // Controls hint
    const promptMsg = this.isMobile
      ? 'Tap a cabinet to play'
      : '[A/D] or [LEFT/RIGHT] to browse   [ENTER/SPACE] to play';
    this.add.text(width / 2, height - 70, promptMsg, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#444466',
    }).setOrigin(0.5);

    // Bottom links
    const ghLink = this.add.text(width / 2, height - 40, '[ Request a Game on GitHub ]', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#58a6ff',
      backgroundColor: '#0a0a18',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    ghLink.on('pointerover', () => ghLink.setStyle({ color: '#ffffff', backgroundColor: '#1a3a5e' }));
    ghLink.on('pointerout', () => ghLink.setStyle({ color: '#58a6ff', backgroundColor: '#0a0a18' }));
    ghLink.on('pointerdown', () => window.open(GITHUB_ISSUES_URL, '_blank'));

    const tipBtn = this.add.text(width / 2, height - 16, 'Support on Ko-fi', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ff5e5b',
      backgroundColor: '#0a0a18',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tipBtn.on('pointerover', () => tipBtn.setStyle({ color: '#ffffff', backgroundColor: '#ff5e5b' }));
    tipBtn.on('pointerout', () => tipBtn.setStyle({ color: '#ff5e5b', backgroundColor: '#0a0a18' }));
    tipBtn.on('pointerdown', () => window.open(KOFI_URL, '_blank'));

    // Keyboard
    this.input.keyboard.on('keydown-LEFT', () => this._navigate(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._navigate(1));
    this.input.keyboard.on('keydown-A', () => this._navigate(-1));
    this.input.keyboard.on('keydown-D', () => this._navigate(1));
    this.input.keyboard.on('keydown-ENTER', () => this._launchSelected());
    this.input.keyboard.on('keydown-SPACE', () => this._launchSelected());
  }

  _createCabinet(cx, cy, game, index) {
    const w = 240;
    const h = 320;

    // Cabinet body — outer shell
    const shell = this.add.rectangle(cx, cy, w, h, 0x111128, 1)
      .setStrokeStyle(2, 0x222244);

    // Screen area (inner rectangle, slightly lighter)
    const screenBg = this.add.rectangle(cx, cy - 40, w - 40, 160, 0x0a0a1a, 1)
      .setStrokeStyle(1, game.available ? game.color : 0x333344);

    // Game icon area — use a relevant sprite if available, else a placeholder
    let icon;
    if (game.key === 'asteroid-miner' && this.textures.exists('asteroid_large')) {
      icon = this.add.sprite(cx, cy - 70, 'asteroid_large').setScale(0.8);
    } else {
      // Coin placeholder — simple circle
      const g = this.add.graphics();
      g.fillStyle(game.available ? game.color : 0x444466, 0.6);
      g.fillCircle(cx, cy - 70, 20);
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(cx - 4, cy - 74, 6);
      icon = g;
    }

    // Game title on the cabinet "marquee"
    const title = this.add.text(cx, cy - 10, game.name, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: game.available ? game.colorHex : '#555566',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5);

    // Tagline
    const tagline = this.add.text(cx, cy + 30, game.tagline, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#777799',
      align: 'center',
    }).setOrigin(0.5);

    // Status badge
    const statusText = game.available ? '[ PLAY ]' : '[ COMING SOON ]';
    const statusColor = game.available ? '#00ff88' : '#666666';
    const badge = this.add.text(cx, cy + 100, statusText, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: statusColor,
      backgroundColor: '#111128',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5);

    if (game.available) {
      this.tweens.add({
        targets: badge,
        alpha: 0.4,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }

    // Neon trim glow at top of cabinet
    const trimGlow = this.add.rectangle(cx, cy - h / 2 + 4, w - 10, 4, game.available ? game.color : 0x333344, 0.6);

    if (game.available) {
      this.tweens.add({
        targets: trimGlow,
        alpha: 0.2,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Make cabinet interactive
    shell.setInteractive({ useHandCursor: true });
    shell.on('pointerdown', () => {
      this.selected = index;
      this._updateSelection();
      this._launchSelected();
    });

    return { shell, screenBg, title, badge, trimGlow, game };
  }

  _navigate(dir) {
    this.selected = Phaser.Math.Clamp(this.selected + dir, 0, GAMES.length - 1);
    this._updateSelection();
  }

  _updateSelection() {
    this.cabinets.forEach((cab, i) => {
      const isSelected = i === this.selected;
      const game = cab.game;
      cab.shell.setStrokeStyle(
        isSelected ? 3 : 2,
        isSelected ? (game.available ? game.color : 0x555566) : 0x222244
      );
      cab.shell.setFillStyle(isSelected ? 0x181838 : 0x111128, 1);

      if (isSelected && game.available) {
        this.tweens.killTweensOf(cab.shell);
        cab.shell.setScale(1);
        this.tweens.add({
          targets: cab.shell,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 200,
          yoyo: true,
          ease: 'Sine.easeOut',
        });
      }
    });
  }

  _launchSelected() {
    const game = GAMES[this.selected];
    if (game.available && game.scene) {
      this.scene.start(game.scene);
    }
  }
}
