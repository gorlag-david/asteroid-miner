const COMBO_WINDOW = 2000; // ms — score within this window to keep combo alive
const COMBO_MULTIPLIERS = [1, 1.5, 2, 2.5, 3]; // index = min(comboCount, 4)

export class ComboTracker {
  constructor() {
    this.comboCount = 0;
    this.lastScoreTime = 0;
    this.maxCombo = 0;
  }

  recordScore() {
    const now = Date.now();

    if (this.lastScoreTime > 0 && (now - this.lastScoreTime) <= COMBO_WINDOW) {
      this.comboCount++;
    } else {
      this.comboCount = 0;
    }

    this.lastScoreTime = now;

    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
    }

    const multiplier = this.getMultiplier();
    const isCombo = this.comboCount > 0;

    return { multiplier, comboCount: this.comboCount, isCombo };
  }

  update(time) {
    if (this.comboCount > 0 && this.lastScoreTime > 0) {
      const now = time || Date.now();
      if ((now - this.lastScoreTime) > COMBO_WINDOW) {
        this.comboCount = 0;
        return true;
      }
    }
    return false;
  }

  getMultiplier() {
    const index = Math.min(this.comboCount, COMBO_MULTIPLIERS.length - 1);
    return COMBO_MULTIPLIERS[index];
  }

  getCount() {
    return this.comboCount;
  }

  getMaxCombo() {
    return this.maxCombo;
  }

  reset() {
    this.comboCount = 0;
    this.lastScoreTime = 0;
    this.maxCombo = 0;
  }
}
