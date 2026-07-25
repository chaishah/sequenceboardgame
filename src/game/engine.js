/**
 * Sequence Board Game Core Engine & State Manager
 */

import { BOARD_LAYOUT, PLAYER_CONFIGS, HAND_SIZES, SEQUENCES_TO_WIN, parseCard } from './constants.js';
import { Deck } from './deck.js';
import { evaluateBoardSequences, isCellLocked } from './sequenceLogic.js';

export class GameEngine {
  constructor() {
    this.grid = Array(10).fill(null).map(() => Array(10).fill(null));
    this.deck = new Deck();
    this.players = [];
    this.numPlayers = 2;
    this.currentTurnIndex = 0;
    this.selectedCardIndex = null;
    this.gameMode = 'ai'; // 'ai' or 'online'
    this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.winner = null;
    this.winningSequences = [];
    this.lockedCells = new Set();
    this.moveHistory = [];
    this.onStateChangeCallbacks = [];
  }

  subscribe(callback) {
    this.onStateChangeCallbacks.push(callback);
  }

  notifyStateChange() {
    for (const cb of this.onStateChangeCallbacks) {
      cb(this.getState());
    }
  }

  /**
   * Initializes a fresh new game
   */
  startNewGame({ numPlayers = 2, gameMode = 'ai', aiDifficulty = 'medium', localPlayerId = 1 } = {}) {
    this.numPlayers = numPlayers;
    this.gameMode = gameMode;
    this.aiDifficulty = aiDifficulty;
    this.localPlayerId = localPlayerId;
    this.winner = null;
    this.winningSequences = [];
    this.moveHistory = [];
    this.selectedCardIndex = null;

    // Reset 10x10 grid
    this.grid = Array(10).fill(null).map(() => Array(10).fill(null));

    // Reset Deck
    this.deck.reset();

    // Initialize Players
    const handSize = HAND_SIZES[numPlayers] || 7;
    this.players = [];

    for (let i = 0; i < numPlayers; i++) {
      const cfg = PLAYER_CONFIGS[i];
      const isAI = gameMode === 'ai' && i > 0; // In single player, player 1 is human, others are AI
      const hand = [];
      for (let h = 0; h < handSize; h++) {
        const drawn = this.deck.draw();
        if (drawn) hand.push(drawn);
      }

      this.players.push({
        id: cfg.id,
        name: isAI ? `Bot (${aiDifficulty.toUpperCase()})` : cfg.name,
        color: cfg.color,
        chipClass: cfg.chipClass,
        hex: cfg.hex,
        hand,
        isAI,
        sequencesCount: 0
      });
    }

    this.currentTurnIndex = 0;
    this.updateSequencesAndLocks();
    this.notifyStateChange();
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  selectCard(cardIndex) {
    if (this.winner) return;
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || cardIndex < 0 || cardIndex >= curPlayer.hand.length) {
      this.selectedCardIndex = null;
    } else {
      this.selectedCardIndex = cardIndex;
    }
    this.notifyStateChange();
  }

  /**
   * Returns list of valid board coordinates [{r, c, isRemoval}] for a given cardCode in hand
   */
  getValidTargetsForCard(cardCode) {
    if (!cardCode) return [];
    const parsed = parseCard(cardCode);
    const targets = [];
    const curPlayer = this.getCurrentPlayer();

    if (parsed.isTwoEyed) {
      // Wild: Any un-chipped space (excluding corners)
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (BOARD_LAYOUT[r][c] !== 'WILD' && this.grid[r][c] === null) {
            targets.push({ r, c, isRemoval: false });
          }
        }
      }
    } else if (parsed.isOneEyed) {
      // Removal: Any opponent chip that is NOT locked in a completed sequence
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const occupant = this.grid[r][c];
          if (occupant !== null && occupant !== curPlayer.id) {
            if (!isCellLocked(this.lockedCells, r, c)) {
              targets.push({ r, c, isRemoval: true });
            }
          }
        }
      }
    } else {
      // Standard Card: Up to 2 matching spaces on board that are un-chipped
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (BOARD_LAYOUT[r][c] === cardCode && this.grid[r][c] === null) {
            targets.push({ r, c, isRemoval: false });
          }
        }
      }
    }

    return targets;
  }

  /**
   * Checks if a card in hand is "dead" (both matching board spaces occupied)
   */
  isCardDead(cardCode) {
    if (!cardCode) return false;
    const parsed = parseCard(cardCode);
    if (parsed.isJack) return false; // Jacks are never dead!

    // Find all spaces for this card on board
    let matchingSpaces = 0;
    let occupiedSpaces = 0;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] === cardCode) {
          matchingSpaces++;
          if (this.grid[r][c] !== null) {
            occupiedSpaces++;
          }
        }
      }
    }

    return matchingSpaces > 0 && matchingSpaces === occupiedSpaces;
  }

  /**
   * Executes playing a selected card to board location (r, c)
   */
  executeMove(r, c) {
    if (this.winner) return false;
    const curPlayer = this.getCurrentPlayer();
    if (this.selectedCardIndex === null || this.selectedCardIndex >= curPlayer.hand.length) {
      return false;
    }

    const cardCode = curPlayer.hand[this.selectedCardIndex];
    const targets = this.getValidTargetsForCard(cardCode);
    const validTarget = targets.find(t => t.r === r && t.c === c);

    if (!validTarget) return false;

    // Apply move
    if (validTarget.isRemoval) {
      const prevOwner = this.grid[r][c];
      this.grid[r][c] = null;
      this.moveHistory.push({
        player: curPlayer.id,
        card: cardCode,
        action: 'remove',
        target: { r, c },
        prevOwner
      });
    } else {
      this.grid[r][c] = curPlayer.id;
      this.moveHistory.push({
        player: curPlayer.id,
        card: cardCode,
        action: 'place',
        target: { r, c }
      });
    }

    // Discard played card from hand
    curPlayer.hand.splice(this.selectedCardIndex, 1);
    this.deck.discard(cardCode);

    // Draw replacement card
    const drawn = this.deck.draw();
    if (drawn) {
      curPlayer.hand.push(drawn);
    }

    this.selectedCardIndex = null;

    // Re-evaluate sequences & victory condition
    this.updateSequencesAndLocks();
    const winningSeqNeeded = SEQUENCES_TO_WIN[this.numPlayers] || 2;

    if (curPlayer.sequencesCount >= winningSeqNeeded) {
      this.winner = curPlayer;
    } else {
      // Advance turn
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.numPlayers;
    }

    this.notifyStateChange();
    return true;
  }

  /**
   * Discards a dead card from hand and draws a replacement without ending turn
   */
  discardDeadCard(cardIndex) {
    if (this.winner) return false;
    const curPlayer = this.getCurrentPlayer();
    if (cardIndex < 0 || cardIndex >= curPlayer.hand.length) return false;

    const cardCode = curPlayer.hand[cardIndex];
    if (!this.isCardDead(cardCode)) return false;

    // Remove from hand and add to discard
    curPlayer.hand.splice(cardIndex, 1);
    this.deck.discard(cardCode);

    // Draw replacement
    const drawn = this.deck.draw();
    if (drawn) {
      curPlayer.hand.push(drawn);
    }

    if (this.selectedCardIndex === cardIndex) {
      this.selectedCardIndex = null;
    }

    this.moveHistory.push({
      player: curPlayer.id,
      card: cardCode,
      action: 'dead_discard'
    });

    this.notifyStateChange();
    return true;
  }

  updateSequencesAndLocks() {
    const res = evaluateBoardSequences(this.grid);
    this.lockedCells = res.lockedCells;
    this.winningSequences = [];

    this.players.forEach(p => {
      const seqs = res.sequences[p.id] || [];
      p.sequencesCount = seqs.length;
      if (seqs.length > 0) {
        this.winningSequences.push(...seqs);
      }
    });
  }

  getState() {
    const curPlayer = this.getCurrentPlayer();
    const selectedCard = (this.selectedCardIndex !== null && curPlayer)
      ? curPlayer.hand[this.selectedCardIndex]
      : null;

    return {
      grid: this.grid,
      players: this.players,
      numPlayers: this.numPlayers,
      currentTurnIndex: this.currentTurnIndex,
      currentPlayer: curPlayer,
      selectedCardIndex: this.selectedCardIndex,
      selectedCard,
      validTargets: selectedCard ? this.getValidTargetsForCard(selectedCard) : [],
      winner: this.winner,
      winningSequences: this.winningSequences,
      lockedCells: Array.from(this.lockedCells),
      deckRemaining: this.deck.remainingCount(),
      discardPileCount: this.deck.discardCount(),
      topDiscard: this.deck.peekTopDiscard(),
      gameMode: this.gameMode,
      aiDifficulty: this.aiDifficulty,
      lastMove: this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null
    };
  }

  // Restore full state for network sync
  loadState(fullState) {
    this.grid = fullState.grid;
    this.players = fullState.players;
    this.numPlayers = fullState.numPlayers;
    this.currentTurnIndex = fullState.currentTurnIndex;
    this.gameMode = fullState.gameMode;
    this.aiDifficulty = fullState.aiDifficulty;
    this.winner = fullState.winner;
    this.deck.setState(fullState.deckCards || [], fullState.deckDiscard || []);
    this.updateSequencesAndLocks();
    this.notifyStateChange();
  }
}
