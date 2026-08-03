/**
 * Sequence Board Renderer Module (Emoji-Free & Translucent Chips)
 */

import { BOARD_LAYOUT, parseCard } from '../game/constants.js';
import { createCardFaceHTML } from './cardComponent.js';

export class BoardRenderer {
  constructor(containerElement, onTileClick, onTileHover) {
    this.container = containerElement;
    this.onTileClick = onTileClick;
    this.onTileHover = onTileHover || (() => {});
    this.tileElements = Array(10).fill(null).map(() => Array(10).fill(null));
    this.initBoard();
  }

  initBoard() {
    this.container.innerHTML = '';
    const gridEl = document.createElement('div');
    gridEl.className = 'sequence-board-grid';

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'board-tile playing-card';
        tileEl.dataset.r = r;
        tileEl.dataset.c = c;

        const cardCode = BOARD_LAYOUT[r][c];

        if (cardCode === 'WILD') {
          tileEl.classList.add('corner-wild');
          tileEl.innerHTML = createCardFaceHTML('WILD', { isBoardTile: true });
        } else {
          const parsed = parseCard(cardCode);
          tileEl.classList.add(`suit-${parsed.suit}`, `color-${parsed.color}`);

          tileEl.innerHTML = `
            ${createCardFaceHTML(cardCode, { isBoardTile: true })}
            <div class="chip-container"></div>
            <div class="last-move-marker"></div>
          `;
        }

        tileEl.addEventListener('click', (e) => {
          e.preventDefault();
          this.onTileClick(r, c);
        });

        tileEl.addEventListener('mouseenter', () => {
          this.onTileHover(r, c, cardCode);
        });

        tileEl.addEventListener('mouseleave', () => {
          this.onTileHover(null, null, null);
        });

        this.tileElements[r][c] = tileEl;
        gridEl.appendChild(tileEl);
      }
    }

    this.container.appendChild(gridEl);
  }

  render(state, localPlayerId = 1) {
    const { grid, validTargets, winningSequences, lockedCells, lastMove, currentPlayer } = state;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const tileEl = this.tileElements[r][c];
        tileEl.classList.remove('valid-target', 'removal-target', 'sequence-winning-tile', 'locked-tile', 'last-move-tile');

        const chipContainer = tileEl.querySelector('.chip-container');
        if (chipContainer) {
          chipContainer.innerHTML = '';
          const occupantId = grid[r][c];
          if (occupantId !== null) {
            const playerConfig = state.players.find(p => p.id === occupantId);
            if (playerConfig) {
              const chipEl = document.createElement('div');
              chipEl.className = `chip ${playerConfig.chipClass}`;
              chipContainer.appendChild(chipEl);
            }
          }
        }
      }
    }

    if (lastMove && lastMove.target) {
      const lastTile = this.tileElements[lastMove.target.r][lastMove.target.c];
      if (lastTile) {
        lastTile.classList.add('last-move-tile');
      }
    }

    // Target Highlights are ONLY shown on the local player's screen when it is currently their turn!
    const isLocalTurn = currentPlayer && currentPlayer.id === localPlayerId;
    if (isLocalTurn && validTargets && validTargets.length > 0) {
      validTargets.forEach(t => {
        const tileEl = this.tileElements[t.r][t.c];
        if (tileEl) {
          if (t.isRemoval) {
            tileEl.classList.add('removal-target');
          } else {
            tileEl.classList.add('valid-target');
          }
        }
      });
    }

    if (winningSequences && winningSequences.length > 0) {
      winningSequences.forEach(seq => {
        seq.line.forEach(cell => {
          const tileEl = this.tileElements[cell.r][cell.c];
          if (tileEl) {
            tileEl.classList.add('sequence-winning-tile');
          }
        });
      });
    }

    if (lockedCells && lockedCells.length > 0) {
      lockedCells.forEach(cellStr => {
        const [r, c] = cellStr.split(',').map(Number);
        const tileEl = this.tileElements[r][c];
        if (tileEl) {
          tileEl.classList.add('locked-tile');
        }
      });
    }
  }
}
