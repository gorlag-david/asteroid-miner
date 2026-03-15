import Phaser from 'phaser';

const LEADERBOARD_KEY = 'asteroidMinerLeaderboard';

export function getLeaderboard() {
  try {
    const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(name, score) {
  const board = getLeaderboard();
  board.push({ name: name.slice(0, 10), score, date: Date.now() });
  board.sort((a, b) => b.score - a.score);
  const top10 = board.slice(0, 10);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top10));
  return top10;
}

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 40, 'TOP MINERS', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    const board = getLeaderboard();

    if (board.length === 0) {
      this.add.text(width / 2, height / 2, 'No scores yet.\nPlay a round to get on the board!', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#8888aa',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      const startY = 100;
      const rowH = 40;

      // Header
      this.add.text(120, startY, 'RANK', {
        fontSize: '14px', fontFamily: 'monospace', color: '#666688',
      }).setOrigin(0.5);
      this.add.text(width / 2, startY, 'NAME', {
        fontSize: '14px', fontFamily: 'monospace', color: '#666688',
      }).setOrigin(0.5);
      this.add.text(width - 120, startY, 'ORE', {
        fontSize: '14px', fontFamily: 'monospace', color: '#666688',
      }).setOrigin(0.5);

      board.forEach((entry, i) => {
        const y = startY + (i + 1) * rowH;
        const rankColor = i === 0 ? '#ffcc00' : i === 1 ? '#cccccc' : i === 2 ? '#cc8844' : '#8888aa';

        this.add.text(120, y, `#${i + 1}`, {
          fontSize: '18px', fontFamily: 'monospace', color: rankColor,
        }).setOrigin(0.5);

        this.add.text(width / 2, y, entry.name || 'ANON', {
          fontSize: '18px', fontFamily: 'monospace', color: '#ccccdd',
        }).setOrigin(0.5);

        this.add.text(width - 120, y, String(entry.score), {
          fontSize: '18px', fontFamily: 'monospace', color: '#ffcc00',
        }).setOrigin(0.5);
      });
    }

    // Back button
    const isMobile = !this.sys.game.device.os.desktop;
    const backBtn = this.add.text(width / 2, height - 50, '[ BACK ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#e94560',
      backgroundColor: '#2a2a4a',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ffffff', backgroundColor: '#e94560' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#e94560', backgroundColor: '#2a2a4a' }));
    backBtn.on('pointerdown', () => this.scene.start('BootScene'));

    this.input.keyboard.on('keydown-ESC', () => this.scene.start('BootScene'));
    this.input.keyboard.on('keydown-ENTER', () => this.scene.start('BootScene'));
    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('BootScene'));
    if (isMobile) {
      this.input.on('pointerdown', (pointer) => {
        const hitObjects = this.input.hitTestPointer(pointer);
        if (hitObjects.length === 0) this.scene.start('BootScene');
      });
    }
  }
}
