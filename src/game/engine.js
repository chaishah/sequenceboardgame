/**
 * Sequence Board Game Core Engine & State Manager (Multiplayer P2P Sync Fix)
 */

import { BOARD_LAYOUT, PLAYER_CONFIGS, HAND_SIZES, SEQUENCES_TO_WIN, parseCard } from './constants.js';
import { Deck } from './deck.js';
import { evaluateBoardSequences, isCellLocked } from './sequenceLogic.js';
import { statsManager } from './statsManager.js';

export class GameEngine {
  constructor() {
    this.grid = Array(10).fill(null).map(() => Array(10).fill(null));
    this.deck = new Deck();
    this.players = [];
    this.numPlayers = 2;
    this.currentTurnIndex = 0;
    this.selectedCardIndex = null;
    this.gameMode = 'ai'; // 'ai', 'local', or 'online'
    this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.winner = null;
    this.winningSequences = [];
    this.lockedCells = new Set();
    this.moveHistory = [];
    this.onStateChangeCallbacks = [];
    this.lastMove = null;
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
  startNewGame({ numPlayers = 2, gameMode = 'ai', aiDifficulty = 'medium', localPlayerId = 1, playerName = 'Player 1', playerAvatar = '🦊', player2Name = 'Player 2', player2Avatar = '👤' } = {}) {
    this.numPlayers = numPlayers;
    this.gameMode = gameMode;
    this.aiDifficulty = aiDifficulty;
    this.localPlayerId = localPlayerId;
    this.winner = null;
    this.winningSequences = [];
    this.moveHistory = [];
    this.selectedCardIndex = null;
    this.lastMove = null;

    // Reset 10x10 grid & Deck
    this.grid = Array(10).fill(null).map(() => Array(10).fill(null));
    this.deck.reset();

    // Initialize Players
    const handSize = HAND_SIZES[numPlayers] || 7;
    this.players = [];

    for (let i = 0; i < numPlayers; i++) {
      const cfg = PLAYER_CONFIGS[i];
      const isAI = gameMode === 'ai' && i > 0;
      const hand = [];
      for (let h = 0; h < handSize; h++) {
        const drawn = this.deck.draw();
        if (drawn) hand.push(drawn);
      }

      let pName = cfg.name;
      let pAvatar = '👤';
      if (i === 0) {
        pName = playerName;
        pAvatar = playerAvatar;
      } else if (i === 1 && gameMode === 'local') {
        pName = player2Name;
        pAvatar = player2Avatar;
      } else if (isAI) {
        pName = `Bot (${aiDifficulty.toUpperCase()})`;
        pAvatar = '🤖';
      }

      this.players.push({
        id: cfg.id,
        name: pName,
        avatar: pAvatar,
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

  sortCurrentPlayerHand() {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer) return;

    // Sort cards by suit, then rank
    const suitOrder = { S: 1, H: 2, D: 3, C: 4 };
    const rankOrder = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

    curPlayer.hand.sort((a, b) => {
      const pa = parseCard(a);
      const pb = parseCard(b);
      if (suitOrder[pa.suit] !== suitOrder[pb.suit]) {
        return suitOrder[pa.suit] - suitOrder[pb.suit];
      }
      return rankOrder[pa.rank] - rankOrder[pb.rank];
    });

    this.selectedCardIndex = null;
    this.notifyStateChange();
  }

  getValidTargetsForCard(cardCode) {
    if (!cardCode) return [];
    const parsed = parseCard(cardCode);
    const targets = [];
    const curPlayer = this.getCurrentPlayer();

    if (parsed.isTwoEyed) {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (BOARD_LAYOUT[r][c] !== 'WILD' && this.grid[r][c] === null) {
            targets.push({ r, c, isRemoval: false });
          }
        }
      }
    } else if (parsed.isOneEyed) {
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

  isCardDead(cardCode) {
    if (!cardCode) return false;
    const parsed = parseCard(cardCode);
    if (parsed.isJack) return false;

    let matchingSpaces = 0;
    let occupiedSpaces = 0;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD_LAYOUT[r][c] === cardCode) {
          matchingSpaces++;
          if (this.grid[r][c] !== null) occupiedSpaces++;
        }
      }
    }

    return matchingSpaces > 0 && matchingSpaces === occupiedSpaces;
  }

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

    const parsed = parseCard(cardCode);
    if (parsed.isJack) {
      statsManager.recordJack();
    }

    // Apply move
    if (validTarget.isRemoval) {
      const prevOwner = this.grid[r][c];
      this.grid[r][c] = null;
      this.lastMove = {
        player: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        playerHex: curPlayer.hex,
        card: cardCode,
        action: 'remove',
        target: { r, c },
        prevOwner
      };
    } else {
      this.grid[r][c] = curPlayer.id;
      this.lastMove = {
        player: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        playerHex: curPlayer.hex,
        card: cardCode,
        action: 'place',
        target: { r, c }
      };
    }

    this.moveHistory.push(this.lastMove);

    // Discard played card from hand & draw replacement
    curPlayer.hand.splice(this.selectedCardIndex, 1);
    this.deck.discard(cardCode);

    const drawn = this.deck.draw();
    if (drawn) {
      curPlayer.hand.push(drawn);
    }

    this.selectedCardIndex = null;

    // Re-evaluate sequences & victory condition
    const prevSeqCount = curPlayer.sequencesCount;
    this.updateSequencesAndLocks();
    const winningSeqNeeded = SEQUENCES_TO_WIN[this.numPlayers] || 2;

    if (curPlayer.sequencesCount > prevSeqCount) {
      statsManager.recordSequence();
      this.moveHistory.push({
        player: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        playerHex: curPlayer.hex,
        action: 'sequence'
      });
    }

    if (curPlayer.sequencesCount >= winningSeqNeeded) {
      this.winner = curPlayer;
      if (curPlayer.id === 1) {
        statsManager.recordWin();
      } else {
        statsManager.recordLoss();
      }
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.numPlayers;
    }

    this.notifyStateChange();
    return true;
  }

  discardDeadCard(cardIndex) {
    if (this.winner) return false;
    const curPlayer = this.getCurrentPlayer();
    if (cardIndex < 0 || cardIndex >= curPlayer.hand.length) return false;

    const cardCode = curPlayer.hand[cardIndex];
    if (!this.isCardDead(cardCode)) return false;

    curPlayer.hand.splice(cardIndex, 1);
    this.deck.discard(cardCode);

    const drawn = this.deck.draw();
    if (drawn) {
      curPlayer.hand.push(drawn);
    }

    if (this.selectedCardIndex === cardIndex) {
      this.selectedCardIndex = null;
    }

    const logEntry = {
      player: curPlayer.id,
      playerName: curPlayer.name,
      playerAvatar: curPlayer.avatar,
      playerHex: curPlayer.hex,
      card: cardCode,
      action: 'dead_discard'
    };

    this.lastMove = logEntry;
    this.moveHistory.push(logEntry);
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
      lastMove: this.lastMove,
      moveHistory: this.moveHistory
    };
  }

  loadState(fullState) {
    this.grid = fullState.grid;
    this.players = fullState.players;
    this.numPlayers = fullState.numPlayers;
    this.currentTurnIndex = fullState.currentTurnIndex;
    this.selectedCardIndex = fullState.selectedCardIndex !== undefined ? fullState.selectedCardIndex : null;
    this.gameMode = fullState.gameMode;
    this.aiDifficulty = fullState.aiDifficulty;
    this.winner = fullState.winner;
    this.lastMove = fullState.lastMove;
    if (fullState.deckCards || fullState.deckDiscard) {
      this.deck.setState(fullState.deckCards || [], fullState.deckDiscard || []);
    }
    this.updateSequencesAndLocks();
    this.notifyStateChange();
  }
}
