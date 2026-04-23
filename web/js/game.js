'use strict';
// ── Pure game logic (no DOM) ──────────────────────────────────────

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];
const RANK_VALUES = Object.fromEntries(RANKS.map((r, i) => [r, i + 2]));

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(card) { return RANK_VALUES[card.rank]; }

function cardColor(card) {
  return (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
}

// ── Scoring ───────────────────────────────────────────────────────

function rankCounts(hand) {
  const c = {};
  for (const card of hand) c[card.rank] = (c[card.rank] || 0) + 1;
  return c;
}

function suitCounts(hand) {
  const c = {};
  for (const card of hand) c[card.suit] = (c[card.suit] || 0) + 1;
  return c;
}

function scorePairs(hand) {
  const counts = rankCounts(hand);
  const groups = Object.values(counts).sort((a, b) => b - a);
  const threes = groups.filter(c => c === 3).length;
  const twos   = groups.filter(c => c === 2).length;
  const fours  = groups.filter(c => c === 4).length;

  if (fours  > 0)            return [{ name: '4 of a Kind',  points: 80  }];
  if (threes > 0 && twos > 0) return [{ name: 'Full House',  points: 100 }];
  if (threes > 0)             return [{ name: '3 of a Kind', points: 50  }];
  if (twos >= 2)              return [{ name: '2 Pairs',     points: 40  }];
  if (twos === 1)             return [{ name: '1 Pair',      points: 15  }];
  return [];
}

function scoreRuns(hand) {
  const vals = hand.map(cardValue);
  let uniqueVals = [...new Set(vals)].sort((a, b) => a - b);
  const candidates = [uniqueVals];
  if (vals.includes(14)) {
    const low = [...new Set(uniqueVals.map(v => v === 14 ? 1 : v))].sort((a, b) => a - b);
    candidates.push(low);
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
  if (bestRun >= 5) return [{ name: '5-Card Run', points: 35 }];
  if (bestRun === 4) return [{ name: '4-Card Run', points: 20 }];
  if (bestRun === 3) return [{ name: '3-Card Run', points: 10 }];
  return [];
}

function scoreSuitPower(hand) {
  const max = Math.max(...Object.values(suitCounts(hand)));
  if (max >= 5) return [{ name: '5 Same Suit', points: 50 }];
  if (max === 4) return [{ name: '4 Same Suit', points: 25 }];
  if (max === 3) return [{ name: '3 Same Suit', points: 10 }];
  return [];
}

function scoreColorBonus(hand) {
  const allRed   = hand.every(c => cardColor(c) === 'red');
  const allBlack = hand.every(c => cardColor(c) === 'black');
  if (allRed || allBlack) return [{ name: 'All Same Color', points: 20 }];
  return [];
}

function tiebreaker(hand) {
  let pts = 0;
  for (const c of hand) {
    if (['J','Q','K'].includes(c.rank)) pts += 1;
    if (c.rank === 'A') pts += 2;
  }
  return pts;
}

function scoreHand(hand) {
  if (!hand || hand.length === 0) return { total: 0, tiebreaker: 0, patterns: [] };
  const patterns = [
    ...scorePairs(hand),
    ...scoreRuns(hand),
    ...scoreSuitPower(hand),
    ...scoreColorBonus(hand),
  ];
  return {
    total: patterns.reduce((s, p) => s + p.points, 0),
    tiebreaker: tiebreaker(hand),
    patterns,
  };
}

// ── AI ────────────────────────────────────────────────────────────

function easyPick(available) {
  return available[Math.floor(Math.random() * available.length)];
}

function mediumPick(available, aiHand, playerHand) {
  let bestVal = -1, bestCard = available[0];
  for (const card of available) {
    const myScore = scoreHand([...aiHand, card]).total;
    const blockScore = scoreHand([...playerHand, card]).total;
    const val = myScore + blockScore * 0.4;
    if (val > bestVal) { bestVal = val; bestCard = card; }
  }
  return bestCard;
}

function estimateFuture(hand, pool, picksLeft) {
  if (picksLeft <= 0 || pool.length === 0) return 0;
  const cur = scoreHand(hand).total;
  let best = cur;
  for (const c of pool.slice(0, 8)) {
    const s = scoreHand([...hand, c]).total;
    if (s > best) best = s;
  }
  return Math.max(0, best - cur);
}

function hardPick(available, aiHand, playerHand) {
  const picksLeft = 4 - aiHand.length;
  const curPlayerScore = scoreHand(playerHand).total;
  const curMyScore = scoreHand(aiHand).total;
  const blockWeight = curPlayerScore > curMyScore ? 0.7 : 0.35;

  let bestVal = -Infinity, bestCard = available[0];
  for (const card of available) {
    const myScore = scoreHand([...aiHand, card]).total;
    const future = estimateFuture([...aiHand, card], available.filter(c => c !== card), picksLeft);
    const blockDelta = scoreHand([...playerHand, card]).total - scoreHand(playerHand).total;
    const val = myScore + future * 0.5 + blockDelta * blockWeight;
    if (val > bestVal) { bestVal = val; bestCard = card; }
  }
  return bestCard;
}

function pickCard(difficulty, available, aiHand, playerHand) {
  if (difficulty === 'easy')   return easyPick(available);
  if (difficulty === 'medium') return mediumPick(available, aiHand, playerHand);
  return hardPick(available, aiHand, playerHand);
}

// ── Exports ───────────────────────────────────────────────────────
window.CardSurge = { createDeck, shuffle, cardColor, scoreHand, pickCard };
