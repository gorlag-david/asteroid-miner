import Phaser from 'phaser';
import { HelloScene } from './scenes/HelloScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scene: [HelloScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
