export const PRIZE_CONFIG = {
  gem:     { points: 5,   weight: 60, texture: 'gem',           color: '#00ff88', radius: 8 },
  token:   { points: 10,  weight: 20, texture: 'special_token', color: '#ff44ff', radius: 8 },
  ruby:    { points: 25,  weight: 10, texture: 'ruby',          color: '#ff4444', radius: 8 },
  diamond: { points: 50,  weight: 7,  texture: 'diamond',       color: '#00ffff', radius: 9 },
  crown:   { points: 100, weight: 3,  texture: 'crown',         color: '#ffdd00', radius: 10 },
};

export function rollPrize() {
  const keys = Object.keys(PRIZE_CONFIG);
  const totalWeight = keys.reduce((sum, key) => sum + PRIZE_CONFIG[key].weight, 0);
  let roll = Math.random() * totalWeight;

  for (const key of keys) {
    roll -= PRIZE_CONFIG[key].weight;
    if (roll <= 0) {
      return key;
    }
  }

  return keys[0];
}

export function getPrizeConfig(key) {
  return PRIZE_CONFIG[key];
}
