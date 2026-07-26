/**
 * Match Statistics & Win Streak Tracker
 */

const STATS_KEY = 'seq_game_stats_v1';

const defaultStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestWinStreak: 0,
  totalSequences: 0,
  jacksPlayed: 0
};

export class StatsManager {
  constructor() {
    this.stats = this.loadStats();
  }

  loadStats() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STATS_KEY);
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : { ...defaultStats };
      }
      return { ...defaultStats };
    } catch (e) {
      return { ...defaultStats };
    }
  }

  saveStats() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
      }
    } catch (e) {
      // Ignore in non-browser environments
    }
  }

  recordWin() {
    this.stats.gamesPlayed++;
    this.stats.wins++;
    this.stats.winStreak++;
    if (this.stats.winStreak > this.stats.bestWinStreak) {
      this.stats.bestWinStreak = this.stats.winStreak;
    }
    this.saveStats();
  }

  recordLoss() {
    this.stats.gamesPlayed++;
    this.stats.losses++;
    this.stats.winStreak = 0;
    this.saveStats();
  }

  recordSequence() {
    this.stats.totalSequences++;
    this.saveStats();
  }

  recordJack() {
    this.stats.jacksPlayed++;
    this.saveStats();
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = { ...defaultStats };
    this.saveStats();
  }
}

export const statsManager = new StatsManager();
