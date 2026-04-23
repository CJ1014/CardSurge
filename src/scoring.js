'use strict';

const { cardValue, cardColor, RANK_VALUES } = require('./deck');

function rankCounts(hand) {
  const counts = {};
  for (const card of hand) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  return counts;
}

function suitCounts(hand) {
  const counts = {};
  for (const card of hand) {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
  }
  return counts;
}

function scorePairs(hand) {
  const counts = rankCounts(hand);
  const groups = Object.values(counts).sort((a, b) => b - a);
  const patterns = [];

  // Find all meaningful groupings
  const threes = groups.filter(c => c === 3).length;
  const twos = groups.filter(c => c === 2).length;
  const fours = groups.filter(c => c === 4).length;

  if (fours > 0) {
    patterns.push({ name: '4 of a kind', points: 80 });
  } else if (threes > 0 && twos > 0) {
    patterns.push({ name: 'Full house', points: 100 });
  } else if (threes > 0) {
    patterns.push({ name: '3 of a kind', points: 50 });
  } else if (twos >= 2) {
    patterns.push({ name: '2 pairs', points: 40 });
  } else if (twos === 1) {
    patterns.push({ name: '1 pair', points: 15 });
  }

  return patterns;
}

function scoreRuns(hand) {
  // Get unique numeric values; ace can be 1 or 14
  const vals = hand.map(c => cardValue(c));
  let uniqueVals = [...new Set(vals)].sort((a, b) => a - b);

  // Also try ace as low (value 1)
  const hasAce = vals.includes(14);
  let candidates = [uniqueVals];
  if (hasAce) {
    const withAceLow = [...new Set(uniqueVals.map(v => v === 14 ? 1 : v))].sort((a, b) => a - b);
    candidates.push(withAceLow);
  }

  let bestRun = 0;
  for (const vs of candidates) {
    let run = 1;
    for (let i = 1; i < vs.length; i++) {
      if (vs[i] === vs[i - 1] + 1) {
        run++;
      } else if (vs[i] !== vs[i - 1]) {
        bestRun = Math.max(bestRun, run);
        run = 1;
      }
    }
    bestRun = Math.max(bestRun, run);
  }

  if (bestRun >= 5) return [{ name: '5-card run', points: 35 }];
  if (bestRun === 4) return [{ name: '4-card run', points: 20 }];
  if (bestRun === 3) return [{ name: '3-card run', points: 10 }];
  return [];
}

function scoreSuitPower(hand) {
  const counts = suitCounts(hand);
  const max = Math.max(...Object.values(counts));
  if (max >= 5) return [{ name: '5 same suit', points: 50 }];
  if (max === 4) return [{ name: '4 same suit', points: 25 }];
  if (max === 3) return [{ name: '3 same suit', points: 10 }];
  return [];
}

function scoreColorBonus(hand) {
  const allRed = hand.every(c => cardColor(c) === 'red');
  const allBlack = hand.every(c => cardColor(c) === 'black');
  if (allRed || allBlack) return [{ name: 'Color bonus (all same color)', points: 20 }];
  return [];
}

function tiebreaker(hand) {
  let pts = 0;
  for (const card of hand) {
    if (['J', 'Q', 'K'].includes(card.rank)) pts += 1;
    if (card.rank === 'A') pts += 2;
  }
  return pts;
}

function scoreHand(hand) {
  if (hand.length === 0) return { total: 0, tiebreaker: 0, patterns: [] };

  const patterns = [
    ...scorePairs(hand),
    ...scoreRuns(hand),
    ...scoreSuitPower(hand),
    ...scoreColorBonus(hand),
  ];

  const total = patterns.reduce((sum, p) => sum + p.points, 0);
  return { total, tiebreaker: tiebreaker(hand), patterns };
}

// Returns a score for a partial/full hand (used by AI for evaluation)
function evaluatePartialHand(hand) {
  return scoreHand(hand);
}

module.exports = { scoreHand, evaluatePartialHand, rankCounts, suitCounts, tiebreaker };
