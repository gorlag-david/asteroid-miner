# Asteroid Miner

A top-down arcade game where you pilot a mining ship through an asteroid field, blast rocks to harvest ore, and chase high scores. Built with Phaser 3, playable instantly in your browser.

**[Play Now](https://gorlag-david.github.io/asteroid-miner/)**

```
        /\
       /  \
      / ** \
     /______\
        ||
       /||\
      / || \
```

## How to Play

You're a miner in deep space. Break asteroids to collect ore. Manage your fuel and ammo. Survive as long as you can.

**Controls:**

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrow keys | Virtual joystick |
| Shoot | Spacebar | Fire button |

**Rules:**
- Shooting costs ammo — collect ammo drops from destroyed asteroids
- Thrusting costs fuel — grab fuel pickups to stay alive
- Asteroids split: large → medium → small → ore fragments
- Fly through ore fragments to collect them and score points
- Chain ore pickups for combo multipliers
- Visit the shop between rounds to buy powerups

**Game over** when you collide with an asteroid or run out of fuel. There's no win state — just you vs. your high score.

## Features

- 3 unique ship types with different stats
- Powerup shop with upgrades
- Combo/streak scoring system
- Local leaderboard with top 10 scores
- Mobile support with touch controls
- Procedurally generated sprites — no external art assets

## Want Something Added?

Open an issue: [github.com/gorlag-david/asteroid-miner/issues](https://github.com/gorlag-david/asteroid-miner/issues)

Bug reports, feature requests, and ideas are all welcome.

## Development

```bash
npm install
npm run dev     # dev server on localhost:3000
npm run build   # production build
```

Built with [Phaser 3](https://phaser.io/) and [Vite](https://vite.dev/). Made by [lazygamedev](https://github.com/gorlag-david).
