/**
 * Game Header & Status Bar Renderer (Phase 2 Enhanced)
 */

import { SEQUENCES_TO_WIN, parseCard } from '../game/constants.js';

export class StatusRenderer {
  constructor(containerElement, handlers) {
    this.container = containerElement;
    this.handlers = handlers; // { onNewGame, onToggleRules, onToggleSound, onViewDiscard, onViewStats }
  }

  render(state, isSoundEnabled) {
    this.container.innerHTML = '';

    const seqNeeded = SEQUENCES_TO_WIN[state.numPlayers] || 2;
    const curPlayer = state.currentPlayer;

    const barEl = document.createElement('div');
    barEl.className = 'status-bar-wrapper';

    // Left controls: New Game, Rules, Stats, Sound
    const leftGroup = document.createElement('div');
    leftGroup.className = 'status-group left-group';

    const newGameBtn = document.createElement('button');
    newGameBtn.className = 'btn-status-icon';
    newGameBtn.title = 'New Game';
    newGameBtn.innerHTML = '⚙️ <span class="btn-text">New Game</span>';
    newGameBtn.addEventListener('click', () => this.handlers.onNewGame());

    const rulesBtn = document.createElement('button');
    rulesBtn.className = 'btn-status-icon';
    rulesBtn.title = 'Game Rules';
    rulesBtn.innerHTML = '📖 <span class="btn-text">Rules</span>';
    rulesBtn.addEventListener('click', () => this.handlers.onToggleRules());

    const statsBtn = document.createElement('button');
    statsBtn.className = 'btn-status-icon';
    statsBtn.title = 'View Statistics';
    statsBtn.innerHTML = '🏆 <span class="btn-text">Stats</span>';
    statsBtn.addEventListener('click', () => this.handlers.onViewStats());

    const soundBtn = document.createElement('button');
    soundBtn.className = 'btn-status-icon';
    soundBtn.title = 'Toggle Sound';
    soundBtn.innerHTML = isSoundEnabled ? '🔊 <span class="btn-text">Sound On</span>' : '🔇 <span class="btn-text">Sound Off</span>';
    soundBtn.addEventListener('click', () => this.handlers.onToggleSound());

    leftGroup.appendChild(newGameBtn);
    leftGroup.appendChild(rulesBtn);
    leftGroup.appendChild(statsBtn);
    leftGroup.appendChild(soundBtn);

    // Center Group: Turn Indicator & Player Scores
    const centerGroup = document.createElement('div');
    centerGroup.className = 'status-group center-group';

    if (state.winner) {
      centerGroup.innerHTML = `
        <div class="turn-banner winner-banner">
          🏆 <strong>${state.winner.avatar || '👑'} ${state.winner.name} Wins!</strong> (${state.winner.sequencesCount}/${seqNeeded} Sequences)
        </div>
      `;
    } else if (curPlayer) {
      centerGroup.innerHTML = `
        <div class="turn-banner active-turn" style="border-color: ${curPlayer.hex}">
          <span class="player-avatar-mini">${curPlayer.avatar || '👤'}</span>
          <span class="turn-text">${curPlayer.name}'s Turn</span>
        </div>
        <div class="scores-container">
          ${state.players.map(p => `
            <div class="player-score-badge ${p.id === curPlayer.id ? 'active-player-badge' : ''}">
              <span class="score-avatar">${p.avatar || '👤'}</span>
              <span class="score-name">${p.name}:</span>
              <span class="score-val">${p.sequencesCount}/${seqNeeded} Seq</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Right Group: Deck remaining & Top Discard
    const rightGroup = document.createElement('div');
    rightGroup.className = 'status-group right-group';

    const topDiscardCard = state.topDiscard ? parseCard(state.topDiscard) : null;
    const discardText = topDiscardCard ? `${topDiscardCard.rank}${topDiscardCard.suitSymbol}` : 'Empty';

    rightGroup.innerHTML = `
      <div class="deck-counter-badge" title="Cards remaining in Deck">
        🎴 Deck: <strong>${state.deckRemaining}</strong>
      </div>
      <button class="btn-discard-preview" title="View Discard Pile">
        🗑️ Discard: <strong>${discardText}</strong> (${state.discardPileCount})
      </button>
    `;

    rightGroup.querySelector('.btn-discard-preview').addEventListener('click', () => {
      this.handlers.onViewDiscard();
    });

    barEl.appendChild(leftGroup);
    barEl.appendChild(centerGroup);
    barEl.appendChild(rightGroup);

    this.container.appendChild(barEl);
  }
}
