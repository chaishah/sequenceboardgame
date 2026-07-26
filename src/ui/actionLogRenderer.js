/**
 * Real-Time Action Log Ticker Module
 */

import { getCardName } from '../game/constants.js';

export class ActionLogRenderer {
  constructor(containerElement) {
    this.container = containerElement;
    this.logs = [];
    this.collapsed = true;
    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="action-log-wrapper ${this.collapsed ? 'collapsed' : ''}">
        <div class="action-log-header">
          <div class="log-title">
            📜 <span class="log-title-text">Move History</span>
            <span class="log-badge" id="log-count-badge">0</span>
          </div>
          <button class="btn-toggle-log" id="btn-toggle-log">▼</button>
        </div>
        <div class="action-log-body" id="action-log-body">
          <div class="log-empty-msg">Game started. Make your first move!</div>
        </div>
      </div>
    `;

    const wrapper = this.container.querySelector('.action-log-wrapper');
    const toggleBtn = this.container.querySelector('#btn-toggle-log');
    const header = this.container.querySelector('.action-log-header');

    header.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      wrapper.classList.toggle('collapsed', this.collapsed);
      toggleBtn.innerText = this.collapsed ? '▲' : '▼';
    });
  }

  addLog(entry) {
    // entry: { player, card, action, target, prevOwner }
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    this.render();
  }

  clear() {
    this.logs = [];
    this.render();
  }

  render() {
    const bodyEl = this.container.querySelector('#action-log-body');
    const badgeEl = this.container.querySelector('#log-count-badge');
    if (!bodyEl) return;

    badgeEl.innerText = this.logs.length;

    if (this.logs.length === 0) {
      bodyEl.innerHTML = '<div class="log-empty-msg">Game started. Make your first move!</div>';
      return;
    }

    bodyEl.innerHTML = this.logs.map(log => {
      const cardName = log.card ? getCardName(log.card) : '';
      let actionText = '';

      if (log.action === 'place') {
        actionText = `played <strong>${cardName}</strong> → placed chip at [Row ${log.target.r + 1}, Col ${log.target.c + 1}]`;
      } else if (log.action === 'remove') {
        actionText = `played <strong>One-Eyed Jack</strong> ✖ → removed opponent chip at [Row ${log.target.r + 1}, Col ${log.target.c + 1}]`;
      } else if (log.action === 'dead_discard') {
        actionText = `discarded Dead Card ☠ <strong>${cardName}</strong> & drew a new card`;
      } else if (log.action === 'sequence') {
        actionText = `🎉 Completed a 5-in-a-row Sequence!`;
      }

      const playerAvatar = log.playerAvatar || '👤';
      const playerName = log.playerName || `Player ${log.player}`;
      const playerHex = log.playerHex || '#3b82f6';

      return `
        <div class="log-item">
          <span class="log-avatar">${playerAvatar}</span>
          <span class="log-player-name" style="color: ${playerHex}">${playerName}</span>
          <span class="log-text">${actionText}</span>
        </div>
      `;
    }).join('');
  }
}
