/**
 * Sequence Board Game Constants & Board Layout Matrix
 * Matches user image board grid 100% cell-by-cell.
 */

// Official Board Layout Grid matching user's image
export const BOARD_LAYOUT = [
  ["WILD", "AC",  "KC",  "QC",  "10C", "9C",  "8C",  "7C",  "6C",  "WILD"],
  ["AD",   "7S",  "8S",  "9S",  "10S", "QS",  "KS",  "AS",  "5C",  "2S"],
  ["KD",   "6S",  "10C", "9C",  "8C",  "7C",  "6C",  "2D",  "4C",  "3S"],
  ["QD",   "5S",  "QC",  "8H",  "7H",  "6H",  "5C",  "3D",  "3C",  "4S"],
  ["10D",  "4S",  "KC",  "9H",  "2H",  "5H",  "4C",  "4D",  "2C",  "5S"],
  ["9D",   "3S",  "AC",  "10H", "3H",  "4H",  "3C",  "5D",  "AH",  "6S"],
  ["8D",   "2S",  "AD",  "QH",  "KH",  "AH",  "2C",  "6D",  "KH",  "7S"],
  ["7D",   "2H",  "KD",  "QD",  "10D", "9D",  "8D",  "7D",  "QH",  "8S"],
  ["6D",   "3H",  "4H",  "5H",  "6H",  "7H",  "8H",  "9H",  "10H", "9S"],
  ["WILD", "5D",  "4D",  "3D",  "2D",  "AS",  "KS",  "QS",  "10S", "WILD"]
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
  { id: 1, name: 'Player 1', color: 'blue',  chipClass: 'chip-blue',  hex: '#2563eb', label: 'Blue' },
  { id: 2, name: 'Player 2', color: 'green', chipClass: 'chip-green', hex: '#059669', label: 'Green' },
  { id: 3, name: 'Player 3', color: 'red',   chipClass: 'chip-red',   hex: '#dc2626', label: 'Red' }
];

export const HAND_SIZES = {
  2: 7, // 2 players: 7 cards each
  3: 6  // 3 players: 6 cards each
};

export const SEQUENCES_TO_WIN = {
  2: 2,
  3: 1
};

export const SEQUENCE_LENGTH = 5;

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
