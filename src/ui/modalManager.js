/**
 * Modal Dialogs Manager
 * Handles New Game, Multi-Device Room creation & QR Code, Rules, and Victory popups.
 */

import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { parseCard } from '../game/constants.js';

export class ModalManager {
  constructor(handlers) {
    this.handlers = handlers; // { onStartNewGame, onHostRoom, onJoinRoom }
    this.activeModal = null;
  }

  closeModal() {
    const existing = document.getElementById('active-seq-modal');
    if (existing) existing.remove();
    this.activeModal = null;
  }

  showNewGameModal(currentConfig = {}) {
    this.closeModal();

    const modalEl = document.createElement('div');
    modalEl.id = 'active-seq-modal';
    modalEl.className = 'modal-backdrop';

    modalEl.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h2>🎴 Sequence Game Setup</h2>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="mode-tabs">
            <button class="tab-btn active" data-tab="ai">🤖 vs AI Bot (Single Player)</button>
            <button class="tab-btn" data-tab="online">📱 Multi-Device Online (P2P)</button>
          </div>

          <div class="tab-content" id="tab-ai-content">
            <div class="form-group">
              <label>AI Difficulty:</label>
              <div class="btn-group-toggle" id="ai-diff-toggle">
                <button class="toggle-btn" data-val="easy">Easy</button>
                <button class="toggle-btn active" data-val="medium">Medium</button>
                <button class="toggle-btn" data-val="hard">Hard</button>
              </div>
            </div>

            <div class="form-group">
              <label>Number of Players:</label>
              <div class="btn-group-toggle" id="ai-players-toggle">
                <button class="toggle-btn active" data-val="2">2 Players (7 cards)</button>
                <button class="toggle-btn" data-val="3">3 Players (6 cards)</button>
              </div>
            </div>

            <button class="btn-primary btn-block" id="btn-start-ai">Start Playing vs AI 🎮</button>
          </div>

          <div class="tab-content hidden" id="tab-online-content">
            <div class="online-section">
              <h3>Create a New Room</h3>
              <p class="section-desc">Host a game and share the 4-digit code or QR code with a friend on their phone or tablet.</p>
              <button class="btn-primary btn-block" id="btn-host-room">Create Room & Get Code 📶</button>
            </div>

            <hr class="modal-divider" />

            <div class="online-section">
              <h3>Join Existing Room</h3>
              <p class="section-desc">Enter the 4-digit Room Code shared by the host:</p>
              <div class="input-join-group">
                <input type="text" id="input-room-code" placeholder="e.g. 7492" maxlength="6" autocomplete="off" />
                <button class="btn-secondary" id="btn-join-room">Join Game 🚀</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Setup Tab switching
    const tabs = modalEl.querySelectorAll('.tab-btn');
    const aiContent = modalEl.querySelector('#tab-ai-content');
    const onlineContent = modalEl.querySelector('#tab-online-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'ai') {
          aiContent.classList.remove('hidden');
          onlineContent.classList.add('hidden');
        } else {
          aiContent.classList.add('hidden');
          onlineContent.classList.remove('hidden');
        }
      });
    });

    // Setup Toggle groups
    this.setupToggleGroup(modalEl, '#ai-diff-toggle');
    this.setupToggleGroup(modalEl, '#ai-players-toggle');

    // Close button
    modalEl.querySelector('.modal-close-btn').addEventListener('click', () => this.closeModal());

    // Start AI Game
    modalEl.querySelector('#btn-start-ai').addEventListener('click', () => {
      const diff = modalEl.querySelector('#ai-diff-toggle .active').dataset.val;
      const numPlayers = parseInt(modalEl.querySelector('#ai-players-toggle .active').dataset.val, 10);
      this.closeModal();
      this.handlers.onStartNewGame({ numPlayers, gameMode: 'ai', aiDifficulty: diff });
    });

    // Host Room
    modalEl.querySelector('#btn-host-room').addEventListener('click', () => {
      this.closeModal();
      this.handlers.onHostRoom();
    });

    // Join Room
    modalEl.querySelector('#btn-join-room').addEventListener('click', () => {
      const code = modalEl.querySelector('#input-room-code').value.trim();
      if (code) {
        this.closeModal();
        this.handlers.onJoinRoom(code);
      }
    });
  }

  showRoomShareModal(roomCode) {
    this.closeModal();

    const modalEl = document.createElement('div');
    modalEl.id = 'active-seq-modal';
    modalEl.className = 'modal-backdrop';

    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

    modalEl.innerHTML = `
      <div class="modal-card room-share-card">
        <div class="modal-header">
          <h2>📱 Play Across Devices</h2>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body text-center">
          <p>Share this Room Code or scan the QR Code on another phone/tablet to join:</p>
          
          <div class="room-code-display">
            <span class="code-label">ROOM CODE:</span>
            <span class="code-value">${roomCode}</span>
          </div>

          <div class="qr-canvas-wrapper">
            <canvas id="room-qr-canvas"></canvas>
          </div>

          <div class="share-actions">
            <button class="btn-secondary" id="btn-copy-link">📋 Copy Game Link</button>
          </div>

          <div class="connection-status-msg" id="conn-status-msg">
            <span class="spinner-dot"></span> Waiting for player to connect...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    modalEl.querySelector('.modal-close-btn').addEventListener('click', () => this.closeModal());

    // Generate QR Code onto canvas
    const canvas = modalEl.querySelector('#room-qr-canvas');
    if (canvas) {
      QRCode.toCanvas(canvas, shareUrl, { width: 180, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }, (err) => {
        if (err) console.error('QR code generation error:', err);
      });
    }

    // Copy link
    modalEl.querySelector('#btn-copy-link').addEventListener('click', (e) => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        e.target.innerText = '✅ Link Copied!';
        setTimeout(() => { e.target.innerText = '📋 Copy Game Link'; }, 2000);
      });
    });
  }

  showRulesModal() {
    this.closeModal();

    const modalEl = document.createElement('div');
    modalEl.id = 'active-seq-modal';
    modalEl.className = 'modal-backdrop';

    modalEl.innerHTML = `
      <div class="modal-card rules-card">
        <div class="modal-header">
          <h2>📖 How to Play Sequence</h2>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body rules-body">
          <section class="rules-section">
            <h3>Objective</h3>
            <p>Score <strong>Sequences</strong> (5 connected chips in a row horizontally, vertically, or diagonally). In a 2-player/team game, score <strong>2 Sequences</strong> to win. In a 3-player game, score <strong>1 Sequence</strong> to win.</p>
          </section>

          <section class="rules-section">
            <h3>Basic Gameplay</h3>
            <ol>
              <li>Select a card from your hand.</li>
              <li>Tap a matching highlighted space on the 10x10 board to place your chip.</li>
              <li>Draw a replacement card from the deck. Turn passes to the next player.</li>
            </ol>
          </section>

          <section class="rules-section">
            <h3>Special Cards: Jacks 🃏</h3>
            <div class="jack-rules-grid">
              <div class="jack-rule-box wild-box">
                <h4>★ Two-Eyed Jacks (♣ / ♦)</h4>
                <p><strong>WILD!</strong> Place your chip on ANY empty non-corner space on the board.</p>
              </div>
              <div class="jack-rule-box remove-box">
                <h4>✖ One-Eyed Jacks (♠ / ♥)</h4>
                <p><strong>REMOVAL!</strong> Remove any opponent chip from the board (unless it is locked in a completed sequence).</p>
              </div>
            </div>
          </section>

          <section class="rules-section">
            <h3>Corners & Shared Chips</h3>
            <ul>
              <li><strong>Corner Spaces (★):</strong> The 4 corner spaces are FREE wild spaces that automatically count as a chip for all players!</li>
              <li><strong>Shared Chips:</strong> Two sequences of the same player may share 1 common chip (e.g., 9 chips in a line = 2 sequences).</li>
            </ul>
          </section>

          <section class="rules-section">
            <h3>Dead Cards ☠</h3>
            <p>If you hold a card in your hand where both matching board spaces are already occupied by chips, it is a <strong>Dead Card</strong>. Use the <em>"Discard & Draw"</em> button to turn it in and draw a new card.</p>
          </section>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    modalEl.querySelector('.modal-close-btn').addEventListener('click', () => this.closeModal());
  }

  showDiscardPileModal(discardPile = []) {
    this.closeModal();

    const modalEl = document.createElement('div');
    modalEl.id = 'active-seq-modal';
    modalEl.className = 'modal-backdrop';

    modalEl.innerHTML = `
      <div class="modal-card discard-modal-card">
        <div class="modal-header">
          <h2>🗑️ Discard Pile (${discardPile.length} Cards)</h2>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="discard-grid">
            ${discardPile.length === 0 ? '<p>Discard pile is empty.</p>' : ''}
            ${discardPile.slice().reverse().map(cardCode => {
              const parsed = parseCard(cardCode);
              return `
                <div class="discard-mini-card suit-${parsed.suit} color-${parsed.color}">
                  <span>${parsed.rank}</span>
                  <span>${parsed.suitSymbol}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    modalEl.querySelector('.modal-close-btn').addEventListener('click', () => this.closeModal());
  }

  showVictoryModal(winner, onRestart) {
    this.closeModal();

    // Trigger Canvas Confetti celebration!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    const modalEl = document.createElement('div');
    modalEl.id = 'active-seq-modal';
    modalEl.className = 'modal-backdrop';

    modalEl.innerHTML = `
      <div class="modal-card victory-card">
        <div class="modal-body text-center">
          <div class="victory-icon">🏆</div>
          <h1 class="victory-title">${winner.name} Wins!</h1>
          <p class="victory-sub">Successfully completed the required Sequences to claim victory!</p>
          
          <button class="btn-primary btn-block btn-lg" id="btn-victory-restart">Play Again 🎮</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    modalEl.querySelector('#btn-victory-restart').addEventListener('click', () => {
      this.closeModal();
      onRestart();
    });
  }

  setupToggleGroup(modalEl, selector) {
    const group = modalEl.querySelector(selector);
    if (!group) return;
    const btns = group.querySelectorAll('.toggle-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
}
