/**
 * Sequence Board Game Sequence Detection Engine
 */

import { SEQUENCE_LENGTH, BOARD_LAYOUT } from './constants.js';

/**
 * Checks if a specific cell counts as belonging to player `playerId`.
 * Corner WILD tiles count as belonging to ANY player.
 */
export function cellBelongsToPlayer(gridState, r, c, playerId) {
  if (r < 0 || r >= 10 || c < 0 || c >= 10) return false;
  if (BOARD_LAYOUT[r][c] === 'WILD') return true;
  return gridState[r][c] === playerId;
}

/**
 * Finds all 5-in-a-row sequences on the board for all players.
 * Returns: {
 *   sequences: Map(playerId -> Array of { lineCoords: [{r,c}...], key: string }),
 *   lockedCells: Set of "r,c" strings representing cells inside completed sequences
 * }
 */
export function evaluateBoardSequences(gridState) {
  const playerSequences = { 1: [], 2: [], 3: [] };
  const lockedCells = new Set();

  const directions = [
    { dr: 0, dc: 1, name: 'horizontal' },
    { dr: 1, dc: 0, name: 'vertical' },
    { dr: 1, dc: 1, name: 'diag-down-right' },
    { dr: 1, dc: -1, name: 'diag-down-left' }
  ];

  for (let playerId = 1; playerId <= 3; playerId++) {
    const foundLines = [];

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        for (const dir of directions) {
          const line = [];
          let valid = true;

          for (let i = 0; i < SEQUENCE_LENGTH; i++) {
            const nr = r + dir.dr * i;
            const nc = c + dir.dc * i;

            if (!cellBelongsToPlayer(gridState, nr, nc, playerId)) {
              valid = false;
              break;
            }
            line.push({ r: nr, c: nc });
          }

          if (valid) {
            // Create unique line signature
            const key = line.map(p => `${p.r},${p.c}`).join('|');
            if (!foundLines.some(l => l.key === key)) {
              foundLines.push({ playerId, line, key });
            }
          }
        }
      }
    }

    // Now, apply Sequence overlap rules:
    // In Sequence rules: two 5-chip sequences can share 1 common chip, but cannot share 2+ chips in the exact same line.
    // Filter out redundant sub-lines if a 9-in-a-row creates overlapping sequences properly.
    const validPlayerSequences = filterOverlappingSequences(foundLines);
    playerSequences[playerId] = validPlayerSequences;

    // Mark locked cells
    validPlayerSequences.forEach(seq => {
      seq.line.forEach(cell => {
        if (BOARD_LAYOUT[cell.r][cell.c] !== 'WILD') {
          lockedCells.add(`${cell.r},${cell.c}`);
        }
      });
    });
  }

  return {
    sequences: playerSequences,
    lockedCells
  };
}

/**
 * Filters overlapping lines according to official Sequence board game rules.
 * Two distinct sequences can share at most 1 common chip.
 */
function filterOverlappingSequences(lines) {
  if (lines.length <= 1) return lines;

  const selected = [];

  // Sort lines: prefer lines with fewer WILD corners first or canonical order
  for (const candidate of lines) {
    let canAdd = true;
    for (const existing of selected) {
      // Count shared non-corner cells
      const sharedCells = candidate.line.filter(c1 => 
        existing.line.some(c2 => c1.r === c2.r && c1.c === c2.c)
      );

      // Official Rule: Two sequences of the same player may share 1 common chip, but NOT 2 or more.
      if (sharedCells.length > 1) {
        canAdd = false;
        break;
      }
    }
    if (canAdd) {
      selected.push(candidate);
    }
  }

  return selected;
}

/**
 * Checks if a specific cell (r, c) is locked inside a completed sequence.
 */
export function isCellLocked(lockedCellsSet, r, c) {
  return lockedCellsSet.has(`${r},${c}`);
}
