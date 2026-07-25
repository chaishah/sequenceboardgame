/**
 * Player Hand Cards Renderer
 */

import { parseCard, getCardName } from '../game/constants.js';

export class HandRenderer {
  constructor(containerElement, onCardSelect, onDiscardDeadCard, isCardDeadCheck) {
    this.container = containerElement;
    this.onCardSelect = onCardSelect;
    this.onDiscardDeadCard = onDiscardDeadCard;
    this.isCardDeadCheck = isCardDeadCheck;
  }

  render(state, localPlayerId = 1) {
    this.container.innerHTML = '';

    const curPlayer = state.currentPlayer;
    if (!curPlayer) return;

    // Is it local player's turn or are we viewing hand?
    const isLocalTurn = curPlayer.id === localPlayerId;
    const activePlayer = state.players.find(p => p.id === localPlayerId) || curPlayer;

    const handContainer = document.createElement('div');
    handContainer.className = 'hand-cards-wrapper';

    activePlayer.hand.forEach((cardCode, idx) => {
      const parsed = parseCard(cardCode);
      const isSelected = isLocalTurn && state.selectedCardIndex === idx;
      const isDead = this.isCardDeadCheck(cardCode);

      const cardEl = document.createElement('div');
      cardEl.className = `playing-card suit-${parsed.suit} color-${parsed.color}`;
      if (isSelected) cardEl.classList.add('selected');
      if (isDead) cardEl.classList.add('dead-card');
      if (parsed.isJack) cardEl.classList.add('jack-card');

      let badgeHtml = '';
      if (parsed.isTwoEyed) {
        badgeHtml = `<div class="card-badge wild-badge">WILD ★</div>`;
      } else if (parsed.isOneEyed) {
        badgeHtml = `<div class="card-badge remove-badge">REMOVE ✖</div>`;
      } else if (isDead) {
        badgeHtml = `<div class="card-badge dead-badge">DEAD ☠</div>`;
      }

      cardEl.innerHTML = `
        <div class="card-corner top-left">
          <span class="card-rank">${parsed.rank}</span>
          <span class="card-suit">${parsed.suitSymbol}</span>
        </div>
        ${badgeHtml}
        <div class="card-center-suit">${parsed.suitSymbol}</div>
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

      handContainer.appendChild(cardEl);
    });

    this.container.appendChild(handContainer);
  }
}
