/**
 * Sequence Board Game AI Bot Engine (Easy, Medium, Hard)
 */

import { BOARD_LAYOUT, parseCard } from './constants.js';
import { evaluateBoardSequences, cellBelongsToPlayer } from './sequenceLogic.js';

export class SequenceAI {
  static getBestMove(gameEngine, difficulty = 'medium') {
    const curPlayer = gameEngine.getCurrentPlayer();
    if (!curPlayer || !curPlayer.isAI) return null;

    // 1. Check if bot has dead cards to discard first
    for (let i = 0; i < curPlayer.hand.length; i++) {
      if (gameEngine.isCardDead(curPlayer.hand[i])) {
        // Discard dead card
        return { action: 'discard_dead', cardIndex: i };
      }
    }

    // 2. Gather all possible (cardIndex, target) moves
    const allMoves = [];

    curPlayer.hand.forEach((cardCode, cardIndex) => {
      const targets = gameEngine.getValidTargetsForCard(cardCode);
      targets.forEach(target => {
        allMoves.push({ cardIndex, cardCode, target });
      });
    });

    if (allMoves.length === 0) return null;

    if (difficulty === 'easy') {
      // Pick random valid move
      const randomIndex = Math.floor(Math.random() * allMoves.length);
      return { action: 'play', ...allMoves[randomIndex] };
    }

    // Rate each candidate move
    const scoredMoves = allMoves.map(move => {
      const score = evaluateMoveScore(gameEngine, curPlayer, move, difficulty);
      return { ...move, score };
    });

    // Sort by score descending
    scoredMoves.sort((a, b) => b.score - a.score);

    // In Medium mode, add a small random factor to top 3 moves to feel natural
    if (difficulty === 'medium' && scoredMoves.length > 1) {
      const topCount = Math.min(3, scoredMoves.length);
      const chosenIndex = Math.floor(Math.random() * topCount);
      return { action: 'play', ...scoredMoves[chosenIndex] };
    }

    // Hard mode: always choose top scored move
    return { action: 'play', ...scoredMoves[0] };
  }
}

/**
 * Heuristic scoring function for a move
 */
function evaluateMoveScore(gameEngine, botPlayer, move, difficulty) {
  const { cardCode, target } = move;
  const { r, c, isRemoval } = target;
  const gridCopy = gameEngine.grid.map(row => [...row]);
  const parsed = parseCard(cardCode);

  let score = 0;

  // Simulate Move on Grid Copy
  if (isRemoval) {
    gridCopy[r][c] = null;
  } else {
    gridCopy[r][c] = botPlayer.id;
  }

  // 1. Check if this move completes a winning sequence for Bot!
  const resAfter = evaluateBoardSequences(gridCopy);
  const botSeqsAfter = (resAfter.sequences[botPlayer.id] || []).length;
  if (botSeqsAfter > botPlayer.sequencesCount) {
    return 100000; // Winning move!
  }

  const humanPlayerId = botPlayer.id === 1 ? 2 : 1;

  // 2. Check if this move blocks a Human Player winning move or 4-in-a-row!
  const humanThreats = countPlayerThreats(gameEngine.grid, humanPlayerId);
  const humanThreatsAfter = countPlayerThreats(gridCopy, humanPlayerId);
  const blockedThreats = humanThreats.count4 - humanThreatsAfter.count4;
  if (blockedThreats > 0) {
    score += 15000 * blockedThreats;
  }

  // Block human 3-in-a-row
  const blocked3 = humanThreats.count3 - humanThreatsAfter.count3;
  if (blocked3 > 0) {
    score += 3000 * blocked3;
  }

  // 3. Evaluate Bot Sequence building gains
  const botThreatsAfter = countPlayerThreats(gridCopy, botPlayer.id);
  score += botThreatsAfter.count4 * 4000;
  score += botThreatsAfter.count3 * 1000;
  score += botThreatsAfter.count2 * 200;

  // 4. Corner Positioning Bonus
  const isNearCorner = (r === 0 || r === 9 || r === 1 || r === 8) && (c === 0 || c === 9 || c === 1 || c === 8);
  if (isNearCorner) {
    score += 400;
  }

  // 5. One-Eyed Jack removal bonus
  if (isRemoval) {
    score += 1200;
  }

  // 6. Two-Eyed Jack penalty if wasted on a low-value move
  if (parsed.isTwoEyed && score < 3000) {
    score -= 2000; // Save Wild Jack for critical moves!
  }

  return score;
}

/**
 * Counts 2-in-a-row, 3-in-a-row, and 4-in-a-row potential sequence threats
 */
function countPlayerThreats(gridState, playerId) {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 }
  ];

  let count4 = 0;
  let count3 = 0;
  let count2 = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      for (const dir of directions) {
        let chipCount = 0;
        let emptyCount = 0;

        for (let i = 0; i < 5; i++) {
          const nr = r + dir.dr * i;
          const nc = c + dir.dc * i;
          if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) {
            chipCount = -100;
            break;
          }

          if (cellBelongsToPlayer(gridState, nr, nc, playerId)) {
            chipCount++;
          } else if (gridState[nr][nc] === null && BOARD_LAYOUT[nr][nc] !== 'WILD') {
            emptyCount++;
          } else {
            chipCount = -100; // Blocked by opponent
            break;
          }
        }

        if (chipCount === 4 && emptyCount === 1) count4++;
        else if (chipCount === 3 && emptyCount === 2) count3++;
        else if (chipCount === 2 && emptyCount === 3) count2++;
      }
    }
  }

  return { count4, count3, count2 };
}
