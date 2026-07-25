/**
 * Sequence Board Game Main Entry Point
 */

import './styles/main.css';
import './styles/board.css';
import './styles/cards.css';
import './styles/modal.css';

import { GameEngine } from './game/engine.js';
import { SequenceAI } from './game/ai.js';
import { BoardRenderer } from './ui/boardRenderer.js';
import { HandRenderer } from './ui/handRenderer.js';
import { StatusRenderer } from './ui/statusRenderer.js';
import { ModalManager } from './ui/modalManager.js';
import { NetworkManager } from './net/peerManager.js';
import { sounds } from './ui/soundEffects.js';

class SequenceApp {
  constructor() {
    this.engine = new GameEngine();
    this.net = new NetworkManager();
    this.localPlayerId = 1;

    this.initDOM();
    this.initRenderers();
    this.initNetworkEvents();

    // Subscribe engine state updates to render
    this.engine.subscribe((state) => this.onEngineStateChange(state));

    // Check URL parameters for Room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      this.handleJoinRoom(roomParam);
    } else {
      // Start default vs AI (Medium)
      this.engine.startNewGame({ numPlayers: 2, gameMode: 'ai', aiDifficulty: 'medium' });
    }
  }

  initDOM() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <header id="status-header"></header>
      <main class="main-game-container">
        <div id="board-container" class="board-container"></div>
        <div id="hand-container" class="hand-container"></div>
      </main>
    `;
  }

  initRenderers() {
    this.boardRenderer = new BoardRenderer(
      document.getElementById('board-container'),
      (r, c) => this.handleTileClick(r, c)
    );

    this.handRenderer = new HandRenderer(
      document.getElementById('hand-container'),
      (cardIdx) => this.handleCardSelect(cardIdx),
      (cardIdx) => this.handleDiscardDeadCard(cardIdx),
      (cardCode) => this.engine.isCardDead(cardCode)
    );

    this.statusRenderer = new StatusRenderer(
      document.getElementById('status-header'),
      {
        onNewGame: () => this.modalManager.showNewGameModal({
          gameMode: this.engine.gameMode,
          aiDifficulty: this.engine.aiDifficulty,
          numPlayers: this.engine.numPlayers
        }),
        onToggleRules: () => this.modalManager.showRulesModal(),
        onToggleSound: () => {
          const enabled = sounds.toggleSound();
          this.render();
        },
        onViewDiscard: () => {
          const state = this.engine.getState();
          this.modalManager.showDiscardPileModal(this.engine.deck.discardPile);
        }
      }
    );

    this.modalManager = new ModalManager({
      onStartNewGame: (config) => {
        this.localPlayerId = 1;
        this.net.cleanup();
        this.engine.startNewGame(config);
      },
      onHostRoom: () => this.handleHostRoom(),
      onJoinRoom: (code) => this.handleJoinRoom(code)
    });
  }

  initNetworkEvents() {
    this.net.callbacks.onConnected = ({ isHost }) => {
      if (isHost) {
        // Host sends initial state sync to guest
        this.net.broadcastState(this.engine.getState());
      }
    };

    this.net.callbacks.onAction = (action) => {
      if (action.type === 'SELECT_CARD') {
        this.engine.selectCard(action.cardIndex);
      } else if (action.type === 'EXECUTE_MOVE') {
        this.engine.executeMove(action.r, action.c);
      } else if (action.type === 'DISCARD_DEAD') {
        this.engine.discardDeadCard(action.cardIndex);
      }

      if (this.net.isHost) {
        this.net.broadcastState(this.engine.getState());
      }
    };

    this.net.callbacks.onStateSync = (state) => {
      this.engine.loadState(state);
      this.render();
    };
  }

  handleTileClick(r, c) {
    const state = this.engine.getState();
    if (state.winner) return;

    // Check if it's local player's turn
    if (state.currentPlayer.id !== this.localPlayerId) return;

    if (state.selectedCardIndex === null) return;

    const validTargets = state.validTargets || [];
    const isValid = validTargets.some(t => t.r === r && t.c === c);

    if (isValid) {
      const target = validTargets.find(t => t.r === r && t.c === c);
      if (target.isRemoval) {
        sounds.playChipRemove();
      } else {
        sounds.playChipPlace();
      }

      if (state.gameMode === 'online' && !this.net.isHost) {
        this.net.sendAction('EXECUTE_MOVE', { r, c });
      } else {
        this.engine.executeMove(r, c);
        if (state.gameMode === 'online') {
          this.net.broadcastState(this.engine.getState());
        }
      }
    }
  }

  handleCardSelect(cardIndex) {
    sounds.playCardSelect();
    const state = this.engine.getState();

    if (state.gameMode === 'online' && !this.net.isHost) {
      this.net.sendAction('SELECT_CARD', { cardIndex });
    } else {
      this.engine.selectCard(cardIndex);
      if (state.gameMode === 'online') {
        this.net.broadcastState(this.engine.getState());
      }
    }
  }

  handleDiscardDeadCard(cardIndex) {
    sounds.playDeadCard();
    const state = this.engine.getState();

    if (state.gameMode === 'online' && !this.net.isHost) {
      this.net.sendAction('DISCARD_DEAD', { cardIndex });
    } else {
      this.engine.discardDeadCard(cardIndex);
      if (state.gameMode === 'online') {
        this.net.broadcastState(this.engine.getState());
      }
    }
  }

  async handleHostRoom() {
    try {
      this.localPlayerId = 1;
      this.engine.startNewGame({ numPlayers: 2, gameMode: 'online' });
      const roomCode = await this.net.createRoom();
      this.modalManager.showRoomShareModal(roomCode);
    } catch (err) {
      alert('Could not create room. Please check internet connection.');
    }
  }

  async handleJoinRoom(code) {
    try {
      this.localPlayerId = 2;
      await this.net.joinRoom(code);
      alert(`Connected to Room ${code}! You are Player 2.`);
    } catch (err) {
      alert(`Could not join room ${code}. Make sure code is correct and host is waiting.`);
    }
  }

  onEngineStateChange(state) {
    this.render();

    // Check Victory
    if (state.winner) {
      sounds.playSequenceWin();
      this.modalManager.showVictoryModal(state.winner, () => {
        this.engine.startNewGame({
          numPlayers: state.numPlayers,
          gameMode: state.gameMode,
          aiDifficulty: state.aiDifficulty
        });
      });
      return;
    }

    // Check if current turn belongs to AI Bot
    if (state.gameMode === 'ai' && state.currentPlayer.isAI) {
      setTimeout(() => {
        const move = SequenceAI.getBestMove(this.engine, state.aiDifficulty);
        if (move) {
          if (move.action === 'discard_dead') {
            sounds.playDeadCard();
            this.engine.discardDeadCard(move.cardIndex);
          } else if (move.action === 'play') {
            this.engine.selectCard(move.cardIndex);
            setTimeout(() => {
              if (move.target.isRemoval) {
                sounds.playChipRemove();
              } else {
                sounds.playChipPlace();
              }
              this.engine.executeMove(move.target.r, move.target.c);
            }, 400);
          }
        }
      }, 600);
    }
  }

  render() {
    const state = this.engine.getState();
    this.boardRenderer.render(state);
    this.handRenderer.render(state, this.localPlayerId);
    this.statusRenderer.render(state, sounds.enabled);
  }
}

// Instantiate App when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new SequenceApp();
});
