/**
 * Deck module for Sequence (2x 52-card standard playing card decks = 104 cards total)
 */

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
  constructor() {
    this.cards = [];
    this.discardPile = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    this.discardPile = [];
    
    // Create 2 full 52-card decks
    for (let deckNum = 0; deckNum < 2; deckNum++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(`${rank}${suit}`);
        }
      }
    }

    this.shuffle();
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    if (this.cards.length === 0) {
      if (this.discardPile.length === 0) {
        return null; // Entire deck & discard empty
      }
      // Reshuffle discard pile back into deck
      this.cards = [...this.discardPile];
      this.discardPile = [];
      this.shuffle();
    }
    return this.cards.pop();
  }

  discard(cardCode) {
    if (cardCode) {
      this.discardPile.push(cardCode);
    }
  }

  remainingCount() {
    return this.cards.length;
  }

  discardCount() {
    return this.discardPile.length;
  }

  peekTopDiscard() {
    return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
  }

  // Restore state from network / save
  setState(cards, discardPile) {
    this.cards = [...cards];
    this.discardPile = [...discardPile];
  }
}
