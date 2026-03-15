# Game Design: Asteroid Miner

## Genre

Top-down arcade action / resource collector. Fly a mining ship through an asteroid field, break rocks to harvest ore, and survive as long as possible.

## Core Mechanic

Thrust and shoot to break asteroids into smaller fragments, then fly through the debris to collect ore before it drifts away.

## Win/Lose Condition

- **Lose**: Ship is destroyed by colliding with an asteroid, or fuel runs out.
- **Win**: There is no win state — it's a high-score chaser. Each round ends in death. The score is total ore collected.
- **Progression**: Difficulty ramps over time — asteroids spawn faster and move quicker. The player's goal is to beat their personal best.

## Scope (Minimum First Playable)

1. **Player ship** with thrust (WASD/arrows) and rotation
2. **Shooting** (spacebar) to break asteroids — costs ammo
3. **Asteroids** that split into smaller pieces when shot (large -> medium -> small -> ore fragments)
4. **Ore collection** on contact with fragments — adds to score
5. **Fuel** that depletes while thrusting — forces risk/reward decisions on movement
6. **Fuel pickups** that occasionally spawn from destroyed asteroids
7. **Difficulty scaling** — asteroid spawn rate increases over time
8. **HUD** — score, fuel gauge, ammo count
9. **Game over screen** with final score and restart prompt
10. **Title screen** with start button

Out of scope for first playable: upgrades, multiple ship types, leaderboards, sound, particle effects.

## Inspiration

- **Asteroids** (Atari, 1979) — the movement and shooting feel. Break rocks, dodge debris.
- **Downwell** (Moppin, 2015) — the resource tension. Every action has a cost, and greed is the real enemy.

## Why This Works

- **One more round**: Rounds are short (60-120 seconds). Death feels like "I could have dodged that" — immediate retry impulse.
- **Simple rules, emergent depth**: Fuel scarcity forces the player to choose between safe positioning and chasing ore. Ammo scarcity means you can't just spray-and-pray.
- **Placeholder-friendly**: Ship = triangle, asteroids = circles, ore = small diamonds, bullets = dots. No art dependency.
- **Tech fit**: Phaser 3 arcade physics handles thrust, collision, and wrapping natively. The entire game fits in the existing scaffold.
