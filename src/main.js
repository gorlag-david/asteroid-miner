import Phaser from 'phaser';
import { ArcadeMenuScene } from './scenes/ArcadeMenuScene.js';
import { BootScene } from './games/asteroid-miner/scenes/BootScene.js';
import { ShipSelectScene } from './games/asteroid-miner/scenes/ShipSelectScene.js';
import { PlayScene } from './games/asteroid-miner/scenes/PlayScene.js';
import { GameOverScene } from './games/asteroid-miner/scenes/GameOverScene.js';
import { LeaderboardScene } from './games/asteroid-miner/scenes/LeaderboardScene.js';
import { CoinPusherPlayScene } from './games/coin-pusher/scenes/CoinPusherPlayScene.js';
import { CoinPusherGameOverScene } from './games/coin-pusher/scenes/CoinPusherGameOverScene.js';
import { CoinPusherLeaderboardScene } from './games/coin-pusher/scenes/CoinPusherLeaderboardScene.js';

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
  scene: [ArcadeMenuScene, BootScene, ShipSelectScene, PlayScene, GameOverScene, LeaderboardScene, CoinPusherPlayScene, CoinPusherGameOverScene, CoinPusherLeaderboardScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
