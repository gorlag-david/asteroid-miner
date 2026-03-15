import Phaser from 'phaser';
import { ArcadeMenuScene } from './scenes/ArcadeMenuScene.js';
import { BootScene } from './scenes/BootScene.js';
import { ShipSelectScene } from './scenes/ShipSelectScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0a0a18',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [ArcadeMenuScene, BootScene, ShipSelectScene, PlayScene, GameOverScene, LeaderboardScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
