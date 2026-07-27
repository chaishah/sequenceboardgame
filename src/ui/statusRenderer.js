/**
 * Game Header & Status Bar Renderer (Minimal In-Game Focus View)
 */

import { SEQUENCES_TO_WIN } from '../game/constants.js';

export class StatusRenderer {
  constructor(containerElement, handlers) {
    this.container = containerElement;
    this.handlers = handlers; // { onOpenMenu, onToggleSound }
  }

  render(state, isSoundEnabled) {
    this.container.innerHTML = '';

    const seqNeeded = SEQUENCES_TO_WIN[state.numPlayers] || 2;
    const curPlayer = state.currentPlayer;

    const focusBar = document.createElement('div');
    focusBar.className = 'focus-top-bar';

    // Center Turn Indicator Pill
    const turnPill = document.createElement('div');
    turnPill.className = 'floating-turn-pill';

    if (state.winner) {
      turnPill.innerHTML = `
        <span class="pill-avatar">${state.winner.avatar || '🏆'}</span>
        <span class="pill-text"><strong>${state.winner.name} Wins!</strong> (${state.winner.sequencesCount}/${seqNeeded} Seq)</span>
      `;
    } else if (curPlayer) {
      turnPill.innerHTML = `
        <span class="pill-avatar">${curPlayer.avatar || '👤'}</span>
        <span class="pill-text"><strong>${curPlayer.name}'s Turn</strong> (${curPlayer.sequencesCount}/${seqNeeded} Seq)</span>
      `;
      turnPill.style.borderColor = curPlayer.hex;
    }

    // Right Menu Gear Button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'floating-gear-btn';
    menuBtn.title = 'Game Options & Rules';
    menuBtn.innerHTML = '⚙️';
    menuBtn.addEventListener('click', () => this.handlers.onOpenMenu());

    focusBar.appendChild(turnPill);
    focusBar.appendChild(menuBtn);

    this.container.appendChild(focusBar);
  }
}
