/**
 * Sequence Board Game Constants & Board Layout Matrix
 */

// Official 10x10 Sequence Board Layout Grid
export const BOARD_LAYOUT = [
  ["WILD", "6D",  "7D",  "8D",  "9D",  "10D", "QD",  "KD",  "AD",  "WILD"],
  ["5D",   "3S",  "2S",  "2H",  "3H",  "4H",  "5H",  "6H",  "7H",  "AC"],
  ["4D",   "4S",  "KS",  "QS",  "10S", "9S",  "2C",  "3C",  "4C",  "KC"],
  ["3D",   "5S",  "AH",  "2C",  "3C",  "4C",  "5C",  "5C",  "QH",  "QC"],
  ["2D",   "6S",  "KH",  "9H",  "10H", "QH",  "KH",  "AH",  "2H",  "10C"],
  ["AS",   "7S",  "8H",  "2D",  "3D",  "4D",  "5D",  "6D",  "3H",  "9C"],
  ["KS",   "8S",  "10H", "7D",  "8D",  "9D",  "10D", "QD",  "4H",  "8C"],
  ["QS",   "9S",  "9H",  "KD",  "AD",  "5H",  "6H",  "7H",  "8H",  "7C"],
  ["10S",  "2S",  "3S",  "4S",  "5S",  "6S",  "7S",  "8S",  "AS",  "6C"],
  ["WILD", "AC",  "KC",  "QC",  "10C", "9C",  "8C",  "7C",  "6C",  "WILD"]
];

export const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣'
};

export const SUIT_NAMES = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs'
};

export const SUIT_COLORS = {
  S: 'black',
  C: 'black',
  H: 'red',
  D: 'red'
};

// Two-Eyed Jacks: Wild (place chip anywhere empty)
// One-Eyed Jacks: Anti-Wild / Removal (remove opponent chip from non-completed sequence)
export const TWO_EYED_JACKS = ['JC', 'JD'];
export const ONE_EYED_JACKS = ['JS', 'JH'];

export const PLAYER_CONFIGS = [
  { id: 1, name: 'Player 1', color: 'blue',  chipClass: 'chip-blue',  hex: '#3b82f6', label: 'Blue' },
  { id: 2, name: 'Player 2', color: 'green', chipClass: 'chip-green', hex: '#10b981', label: 'Green' },
  { id: 3, name: 'Player 3', color: 'red',   chipClass: 'chip-red',   hex: '#ef4444', label: 'Red' }
];

export const HAND_SIZES = {
  2: 7, // 2 players: 7 cards each
  3: 6  // 3 players: 6 cards each
};

export const SEQUENCES_TO_WIN = {
  2: 2, // 2 players / 2 teams need 2 sequences
  3: 1  // 3 players / 3 teams need 1 sequence
};

export const SEQUENCE_LENGTH = 5;

/**
 * Utility functions for Card parsing
 */
export function parseCard(cardCode) {
  if (cardCode === 'WILD') {
    return { isWildCorner: true };
  }
  const suit = cardCode.slice(-1);
  const rank = cardCode.slice(0, -1);
  const isJack = rank === 'J';
  const isTwoEyed = TWO_EYED_JACKS.includes(cardCode);
  const isOneEyed = ONE_EYED_JACKS.includes(cardCode);

  return {
    code: cardCode,
    rank,
    suit,
    suitSymbol: SUIT_SYMBOLS[suit] || '',
    color: SUIT_COLORS[suit] || 'black',
    isJack,
    isTwoEyed,
    isOneEyed,
    isWildCorner: false
  };
}

export function getCardName(cardCode) {
  if (cardCode === 'WILD') return 'Corner Wild';
  const parsed = parseCard(cardCode);
  const rankNames = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
    'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace'
  };
  const rankName = rankNames[parsed.rank] || parsed.rank;
  const suitName = SUIT_NAMES[parsed.suit] || parsed.suit;
  
  if (parsed.isTwoEyed) return `${rankName} of ${suitName} (Two-Eyed Wild)`;
  if (parsed.isOneEyed) return `${rankName} of ${suitName} (One-Eyed Removal)`;
  return `${rankName} of ${suitName}`;
}
