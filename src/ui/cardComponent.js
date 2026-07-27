/**
 * Unified Casino Playing Card Visual Component (Emoji-Free & Clean Suit Symbols)
 * Used identically for both 10x10 Board Grid Tiles & Player Hand Cards!
 */

import { parseCard } from '../game/constants.js';

/**
 * Renders card face HTML for a cardCode ('6D', 'AH', etc.)
 * Clean typography without any emojis!
 */
export function createCardFaceHTML(cardCode, { isBoardTile = false } = {}) {
  if (cardCode === 'WILD') {
    return `
      <div class="corner-star">★</div>
      <div class="corner-label">FREE</div>
    `;
  }

  const parsed = parseCard(cardCode);

  let badgeHtml = '';
  if (!isBoardTile) {
    if (parsed.isTwoEyed) {
      badgeHtml = `<div class="card-badge wild-badge">WILD</div>`;
    } else if (parsed.isOneEyed) {
      badgeHtml = `<div class="card-badge remove-badge">REMOVE</div>`;
    }
  }

  return `
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
}
