/**
 * Sequence Board Renderer Module
 */

import { BOARD_LAYOUT, parseCard, SUIT_SYMBOLS } from '../game/constants.js';

export class BoardRenderer {
  constructor(containerElement, onTileClick) {
    this.container = containerElement;
    this.onTileClick = onTileClick;
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
        tileEl.className = 'board-tile';
        tileEl.dataset.r = r;
        tileEl.dataset.c = c;

        const cardCode = BOARD_LAYOUT[r][c];

        if (cardCode === 'WILD') {
          tileEl.classList.add('corner-wild');
          tileEl.innerHTML = `
            <div class="corner-star">★</div>
            <div class="corner-label">FREE</div>
          `;
        } else {
          const parsed = parseCard(cardCode);
          tileEl.classList.add(`suit-${parsed.suit}`, `color-${parsed.color}`);

          tileEl.innerHTML = `
            <div class="tile-rank">${parsed.rank}</div>
            <div class="tile-suit">${parsed.suitSymbol}</div>
            <div class="tile-watermark">${parsed.suitSymbol}</div>
            <div class="chip-container"></div>
          `;
        }

        tileEl.addEventListener('click', () => {
          this.onTileClick(r, c);
        });

        this.tileElements[r][c] = tileEl;
        gridEl.appendChild(tileEl);
      }
    }

    this.container.appendChild(gridEl);
  }

  render(state) {
    const { grid, validTargets, winningSequences, lockedCells } = state;

    // Reset highlights & chips
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const tileEl = this.tileElements[r][c];
        tileEl.classList.remove('valid-target', 'removal-target', 'sequence-winning-tile', 'locked-tile');

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

    // Highlight Valid Targets
    if (validTargets && validTargets.length > 0) {
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

    // Highlight Winning Sequences
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

    // Highlight Locked Tiles
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
