/**
 * Player Hand Cards Renderer (Visual King, Queen, Jack & Ace Illustrations)
 */

import { parseCard } from '../game/constants.js';

export class HandRenderer {
  constructor(containerElement, onCardSelect, onDiscardDeadCard, isCardDeadCheck, onSortHand) {
    this.container = containerElement;
    this.onCardSelect = onCardSelect;
    this.onDiscardDeadCard = onDiscardDeadCard;
    this.isCardDeadCheck = isCardDeadCheck;
    this.onSortHand = onSortHand || (() => {});
    this.hoveredCardCode = null;
  }

  setHoveredCard(cardCode) {
    this.hoveredCardCode = cardCode;
  }

  getRankIcon(rank) {
    switch (rank) {
      case 'K': return '👑'; // King Crown
      case 'Q': return '👸'; // Queen Tiara
      case 'J': return '🗡️'; // Jack Sword/Knight
      case 'A': return '⚜️'; // Ace Crest
      default: return null;
    }
  }

  render(state, localPlayerId = 1) {
    this.container.innerHTML = '';

    const curPlayer = state.currentPlayer;
    if (!curPlayer) return;

    const isLocalTurn = curPlayer.id === localPlayerId;
    const activePlayer = state.players.find(p => p.id === localPlayerId) || curPlayer;

    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'hand-panel-inner';

    const headerEl = document.createElement('div');
    headerEl.className = 'hand-header-bar';
    headerEl.innerHTML = `
      <div class="hand-title">
        <span class="player-avatar-small">${activePlayer.avatar || '👤'}</span>
        <strong>Your Cards</strong> (${activePlayer.hand.length})
      </div>
      <div class="hand-actions">
        <button class="btn-sort-hand" title="Sort Hand Cards">
          🔀 Sort Cards
        </button>
      </div>
    `;

    headerEl.querySelector('.btn-sort-hand').addEventListener('click', () => {
      this.onSortHand();
    });

    const handCardsEl = document.createElement('div');
    handCardsEl.className = 'hand-cards-wrapper';

    activePlayer.hand.forEach((cardCode, idx) => {
      const parsed = parseCard(cardCode);
      const isSelected = isLocalTurn && state.selectedCardIndex === idx;
      const isDead = this.isCardDeadCheck(cardCode);
      const isHoverMatch = this.hoveredCardCode && (cardCode === this.hoveredCardCode || parsed.isTwoEyed);

      const cardEl = document.createElement('div');
      cardEl.className = `playing-card suit-${parsed.suit} color-${parsed.color}`;
      if (isSelected) cardEl.classList.add('selected');
      if (isDead) cardEl.classList.add('dead-card');
      if (parsed.isJack) cardEl.classList.add('jack-card');
      if (isHoverMatch) cardEl.classList.add('hover-match');

      const rankIcon = this.getRankIcon(parsed.rank);

      let badgeHtml = '';
      if (parsed.isTwoEyed) {
        badgeHtml = `<div class="card-badge wild-badge">WILD ★</div>`;
      } else if (parsed.isOneEyed) {
        badgeHtml = `<div class="card-badge remove-badge">REMOVE ✖</div>`;
      } else if (isDead) {
        badgeHtml = `<div class="card-badge dead-badge">DEAD ☠</div>`;
      }

      const centerArtHtml = rankIcon
        ? `<div class="card-center-illustration">
             <span class="center-rank-icon">${rankIcon}</span>
             <span class="center-suit-symbol">${parsed.suitSymbol}</span>
           </div>`
        : `<div class="card-center-suit">${parsed.suitSymbol}</div>`;

      cardEl.innerHTML = `
        <div class="card-corner top-left">
          <span class="card-rank">${parsed.rank}</span>
          <span class="card-suit">${parsed.suitSymbol}</span>
        </div>
        ${badgeHtml}
        ${centerArtHtml}
        <div class="card-corner bottom-right">
          <span class="card-rank">${parsed.rank}</span>
          <span class="card-suit">${parsed.suitSymbol}</span>
        </div>
      `;

      if (isDead && isLocalTurn) {
        const swapBtn = document.createElement('button');
        swapBtn.className = 'btn-swap-dead';
        swapBtn.innerHTML = 'Discard & Draw ↻';
        swapBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onDiscardDeadCard(idx);
        });
        cardEl.appendChild(swapBtn);
      }

      cardEl.addEventListener('click', () => {
        if (isLocalTurn && !curPlayer.isAI) {
          this.onCardSelect(idx);
        }
      });

      handCardsEl.appendChild(cardEl);
    });

    wrapperEl.appendChild(headerEl);
    wrapperEl.appendChild(handCardsEl);
    this.container.appendChild(wrapperEl);
  }
}
