import Phaser from 'phaser';

// Ship definitions — texture key, display name, stats, and description
const SHIPS = [
  {
    key: 'ship',
    name: 'VIPER',
    desc: 'Fast & agile. Low fuel reserves.',
    color: '#3366dd',
    stats: {
      thrust: 350,
      drag: 40,
      maxSpeed: 480,
      rotationSpeed: 240,
      fuelMax: 80,
      fuelBurn: 14,
      ammoStart: 15,
      ammoMax: 30,
    },
    // Stat bars for display (0-5 scale)
    bars: { speed: 5, agility: 5, fuel: 2, firepower: 3 },
  },
  {
    key: 'ship_hauler',
    name: 'HAULER',
    desc: 'Tanky miner. Extra fuel & ore magnet.',
    color: '#44aa44',
    stats: {
      thrust: 240,
      drag: 70,
      maxSpeed: 320,
      rotationSpeed: 160,
      fuelMax: 140,
      fuelBurn: 10,
      ammoStart: 12,
      ammoMax: 25,
      oreMagnetRadius: 120,
    },
    bars: { speed: 2, agility: 2, fuel: 5, firepower: 2 },
  },
  {
    key: 'ship_gunship',
    name: 'GUNSHIP',
    desc: 'Heavy weapons. Extra ammo capacity.',
    color: '#ff6633',
    stats: {
      thrust: 280,
      drag: 55,
      maxSpeed: 380,
      rotationSpeed: 180,
      fuelMax: 100,
      fuelBurn: 12,
      ammoStart: 25,
      ammoMax: 45,
      fireRate: 160,
    },
    bars: { speed: 3, agility: 3, fuel: 3, firepower: 5 },
  },
];

export { SHIPS };

export class ShipSelectScene extends Phaser.Scene {
  constructor() {
    super('ShipSelectScene');
  }

  create() {
    const { width, height } = this.scale;
    this.selected = 0;
    this.isMobile = !this.sys.game.device.os.desktop;

    // Title
    this.add.text(width / 2, 40, 'CHOOSE YOUR SHIP', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#e94560',
    }).setOrigin(0.5);

    // Ship cards
    this.cards = [];
    const cardWidth = 200;
    const totalWidth = SHIPS.length * cardWidth + (SHIPS.length - 1) * 30;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    SHIPS.forEach((ship, i) => {
      const cx = startX + i * (cardWidth + 30);
      const cy = height / 2 - 20;
      const card = this._createShipCard(cx, cy, ship, i);
      this.cards.push(card);
    });

    // Selection indicator
    this._updateSelection();

    // Controls hint
    const promptMsg = this.isMobile
      ? 'Tap a ship to select, then tap LAUNCH'
      : '[A/D] or [LEFT/RIGHT] to browse   [ENTER/SPACE] to launch';
    this.add.text(width / 2, height - 40, promptMsg, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    // Launch button
    this.launchBtn = this.add.text(width / 2, height - 80, '[ LAUNCH ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#e94560',
      backgroundColor: '#2a2a4a',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.launchBtn.on('pointerover', () => this.launchBtn.setStyle({ color: '#ffffff', backgroundColor: '#e94560' }));
    this.launchBtn.on('pointerout', () => this.launchBtn.setStyle({ color: '#e94560', backgroundColor: '#2a2a4a' }));
    this.launchBtn.on('pointerdown', () => this._launch());

    // Keyboard input
    this.input.keyboard.on('keydown-LEFT', () => this._navigate(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._navigate(1));
    this.input.keyboard.on('keydown-A', () => this._navigate(-1));
    this.input.keyboard.on('keydown-D', () => this._navigate(1));
    this.input.keyboard.on('keydown-ENTER', () => this._launch());
    this.input.keyboard.on('keydown-SPACE', () => this._launch());
  }

  _createShipCard(cx, cy, ship, index) {
    const objects = [];

    // Card background
    const bg = this.add.rectangle(cx, cy, 190, 280, 0x1a1a3e, 0.8)
      .setStrokeStyle(2, 0x333366);
    objects.push(bg);

    // Ship preview sprite (scaled up for visibility)
    const preview = this.add.sprite(cx, cy - 80, ship.key).setScale(2.5);
    objects.push(preview);

    // Ship name
    const nameText = this.add.text(cx, cy - 30, ship.name, {
      fontSize: '20px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: ship.color,
    }).setOrigin(0.5);
    objects.push(nameText);

    // Description
    const descText = this.add.text(cx, cy - 5, ship.desc, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#8888aa',
      wordWrap: { width: 170 },
      align: 'center',
    }).setOrigin(0.5);
    objects.push(descText);

    // Stat bars
    const barLabels = ['SPD', 'AGI', 'FUEL', 'GUN'];
    const barKeys = ['speed', 'agility', 'fuel', 'firepower'];
    const barStartY = cy + 25;
    barKeys.forEach((key, bi) => {
      const by = barStartY + bi * 22;
      // Label
      const label = this.add.text(cx - 80, by, barLabels[bi], {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#666688',
      }).setOrigin(0, 0.5);
      objects.push(label);

      // Bar background
      const barBg = this.add.rectangle(cx + 15, by, 100, 10, 0x222244);
      objects.push(barBg);

      // Bar fill
      const fillWidth = (ship.bars[key] / 5) * 100;
      const barFill = this.add.rectangle(cx + 15 - (100 - fillWidth) / 2, by, fillWidth, 10, Phaser.Display.Color.HexStringToColor(ship.color).color);
      objects.push(barFill);
    });

    // Make card clickable
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.selected = index;
      this._updateSelection();
    });

    return { objects, bg, preview };
  }

  _navigate(dir) {
    this.selected = Phaser.Math.Clamp(this.selected + dir, 0, SHIPS.length - 1);
    this._updateSelection();
  }

  _updateSelection() {
    this.cards.forEach((card, i) => {
      const isSelected = i === this.selected;
      card.bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xe94560 : 0x333366);
      card.bg.setFillStyle(isSelected ? 0x2a2a4e : 0x1a1a3e, isSelected ? 1 : 0.8);
      // Bounce the selected ship preview
      if (isSelected) {
        this.tweens.killTweensOf(card.preview);
        card.preview.setScale(2.5);
        this.tweens.add({
          targets: card.preview,
          scaleX: 2.8,
          scaleY: 2.8,
          duration: 300,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  _launch() {
    const ship = SHIPS[this.selected];
    this.scene.start('PlayScene', { shipConfig: ship });
  }
}
