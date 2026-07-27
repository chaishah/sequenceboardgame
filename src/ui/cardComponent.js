/**
 * Unified Casino Playing Card Visual Component
 * Used identically for both 10x10 Board Grid Tiles & Player Hand Cards for 100% visual consistency!
 */

import { parseCard } from '../game/constants.js';

export function getRankIcon(rank) {
  switch (rank) {
    case 'K': return '👑';
    case 'Q': return '👸';
    case 'J': return '🗡️';
    case 'A': return '⚜️';
    default: return null;
  }
}

/**
 * Renders card face HTML for a cardCode ('6D', 'AH', etc.)
 */
export function createCardFaceHTML(cardCode, { isBoardTile = false } = {}) {
  if (cardCode === 'WILD') {
    return `
      <div class="corner-star">★</div>
      <div class="corner-label">WILD</div>
    `;
  }

  const parsed = parseCard(cardCode);
  const rankIcon = getRankIcon(parsed.rank);

  let badgeHtml = '';
  if (!isBoardTile) {
    if (parsed.isTwoEyed) {
      badgeHtml = `<div class="card-badge wild-badge">WILD ★</div>`;
    } else if (parsed.isOneEyed) {
      badgeHtml = `<div class="card-badge remove-badge">REMOVE ✖</div>`;
    }
  }

  const centerArtHtml = rankIcon
    ? `<div class="card-center-illustration">
         <span class="center-rank-icon">${rankIcon}</span>
         <span class="center-suit-symbol">${parsed.suitSymbol}</span>
       </div>`
    : `<div class="card-center-suit">${parsed.suitSymbol}</div>`;

  return `
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
}
