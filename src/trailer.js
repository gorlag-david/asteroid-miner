import Phaser from 'phaser';
import { generateAllTextures } from './sprites.js';
import { TrailerScene } from './scenes/TrailerScene.js';

// Tiny boot scene just to generate textures, then start the trailer
class TrailerBootScene extends Phaser.Scene {
  constructor() { super('TrailerBoot'); }
  create() {
    generateAllTextures(this);
    this.scene.start('TrailerScene');
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TrailerBootScene, TrailerScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
