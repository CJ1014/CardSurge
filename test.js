'use strict';

const { scoreHand } = require('./src/scoring');
const { createDeck, shuffle } = require('./src/deck');
const { pickCard } = require('./src/ai');

let passed = 0;
let failed = 0;

function assert(description, condition, extra = '') {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${description}${extra ? ' — ' + extra : ''}`);
    failed++;
  }
}

function card(rank, suit) {
  return { rank, suit };
}

console.log('\n=== SCORING TESTS ===\n');

// Pairs
{
  // No run (2,5,8 are non-consecutive), mixed colors, mixed suits
  const hand = [card('A','♠'), card('A','♥'), card('2','♦'), card('5','♣'), card('8','♠')];
  const s = scoreHand(hand);
  assert('1 pair = 15 pts', s.total === 15, `got ${s.total}`);
}
{
  const hand = [card('A','♠'), card('A','♥'), card('K','♦'), card('K','♣'), card('J','♠')];
  const s = scoreHand(hand);
  assert('2 pairs = 40 pts', s.total === 40, `got ${s.total}`);
}
{
  const hand = [card('A','♠'), card('A','♥'), card('A','♦'), card('K','♣'), card('J','♠')];
  const s = scoreHand(hand);
  assert('3 of a kind = 50 pts', s.total === 50, `got ${s.total}`);
}
{
  const hand = [card('A','♠'), card('A','♥'), card('A','♦'), card('K','♣'), card('K','♠')];
  const s = scoreHand(hand);
  assert('Full house = 100 pts', s.total === 100, `got ${s.total}`);
}
{
  const hand = [card('7','♠'), card('7','♥'), card('7','♦'), card('7','♣'), card('K','♠')];
  const s = scoreHand(hand);
  assert('4 of a kind = 80 pts', s.total === 80, `got ${s.total}`);
}

// Runs
{
  const hand = [card('3','♠'), card('4','♥'), card('5','♦'), card('K','♣'), card('A','♠')];
  const s = scoreHand(hand);
  assert('3-card run = 10 pts', s.total === 10, `got ${s.total}`);
}
{
  const hand = [card('3','♠'), card('4','♥'), card('5','♦'), card('6','♣'), card('A','♠')];
  const s = scoreHand(hand);
  assert('4-card run = 20 pts', s.total === 20, `got ${s.total}`);
}
{
  const hand = [card('3','♠'), card('4','♥'), card('5','♦'), card('6','♣'), card('7','♠')];
  const s = scoreHand(hand);
  assert('5-card run = 35 pts', s.total === 35, `got ${s.total}`);
}
{
  // Ace-low run: A-2-3-4-5
  const hand = [card('A','♠'), card('2','♥'), card('3','♦'), card('4','♣'), card('5','♠')];
  const s = scoreHand(hand);
  assert('Ace-low 5-card run = 35 pts', s.total === 35, `got ${s.total}`);
}
{
  // Ace-high run: 10-J-Q-K-A
  const hand = [card('10','♠'), card('J','♥'), card('Q','♦'), card('K','♣'), card('A','♠')];
  const s = scoreHand(hand);
  assert('Ace-high 5-card run = 35 pts', s.total === 35, `got ${s.total}`);
}

// Suit power
{
  const hand = [card('A','♠'), card('5','♠'), card('9','♠'), card('K','♦'), card('J','♥')];
  const s = scoreHand(hand);
  assert('3 same suit = 10 pts', s.total === 10, `got ${s.total}`);
}
{
  const hand = [card('A','♠'), card('5','♠'), card('9','♠'), card('K','♠'), card('J','♥')];
  const s = scoreHand(hand);
  assert('4 same suit = 25 pts', s.total === 25, `got ${s.total}`);
}
{
  const hand = [card('A','♠'), card('5','♠'), card('9','♠'), card('K','♠'), card('J','♠')];
  const s = scoreHand(hand);
  assert('5 same suit = 50 pts (+ color bonus = 70)', s.total === 70, `got ${s.total}`);
}

// Color bonus — hands with 2+3 suit split so no suit-power bonus triggers
{
  // All black: 3 spades + 2 clubs, but mixed ranks so no run/pair
  const hand = [card('2','♠'), card('5','♣'), card('9','♠'), card('K','♣'), card('J','♠')];
  const s = scoreHand(hand);
  // 3 same suit (♠) = 10, all black = 20 → 30
  assert('All black = color bonus (20) + 3-suit (10) = 30', s.total === 30, `got ${s.total}`);
}
{
  // Purely 2+2+1 suit split, all black, no suit cluster ≥3
  const hand = [card('2','♠'), card('6','♠'), card('9','♣'), card('K','♣'), card('J','♠')];
  const s = scoreHand(hand);
  // 3 spades = 10, all black = 20 → 30
  assert('All black mixed-suit = 30', s.total === 30, `got ${s.total}`);
}
{
  // All red, 2 hearts + 2 diamonds + 1 heart, mixed ranks: no pure 20-only hand once we have ≥3 same suit
  // Use exact 2+2+1: 2H 2D 1H still leaves 3H ... just confirm the total logic
  const hand = [card('A','♥'), card('5','♦'), card('9','♦'), card('K','♦'), card('J','♥')];
  const s = scoreHand(hand);
  // 3 diamonds = 10, all red = 20 → 30
  assert('All red = color bonus (20) + 3-suit (10) = 30', s.total === 30, `got ${s.total}`);
}

// Stacking patterns
{
  // Pair + all same color; avoid suit cluster ≥3 and avoid runs
  // 2 spades + 2 clubs + 1 spade... hard to avoid 3 same suit with all-black
  // Instead: verify pair + run stacks
  const hand = [card('5','♠'), card('5','♥'), card('3','♦'), card('7','♣'), card('9','♠')];
  const s = scoreHand(hand);
  assert('Pair (15) only = 15 (no run, no suit cluster, mixed color)', s.total === 15, `got ${s.total}`);
}
{
  // 3-card run + 3 same suit (both from same cards possible)
  const hand = [card('5','♠'), card('6','♠'), card('7','♠'), card('K','♦'), card('J','♥')];
  const s = scoreHand(hand);
  assert('3-run (10) + 3-suit (10) = 20', s.total === 20, `got ${s.total}`);
}
{
  // Pair + color bonus: need exactly 2 suits of 2 or 1+1+1+1+... to avoid 3-suit trigger
  // All black, 2♠ 2♣ 1♣, non-run, non-pair-friendly... use 2♠ + 2♣ + 1♠ = 3♠ again
  // Accept that all-black with a pair will also get 3-suit; test combined total
  const hand = [card('A','♠'), card('A','♣'), card('2','♣'), card('6','♣'), card('9','♠')];
  const s = scoreHand(hand);
  // pair(15) + 3clubs(10) + all-black(20) = 45
  assert('Pair + 3-suit + color bonus = 45', s.total === 45, `got ${s.total}`);
}

// Tiebreaker
{
  const hand1 = [card('A','♠'), card('3','♥'), card('5','♦'), card('7','♣'), card('9','♠')];
  const s = scoreHand(hand1);
  assert('Ace tiebreaker = 2', s.tiebreaker === 2, `got ${s.tiebreaker}`);
}
{
  const hand = [card('J','♠'), card('Q','♥'), card('K','♦'), card('A','♣'), card('3','♠')];
  const s = scoreHand(hand);
  assert('J+Q+K+A tiebreaker = 5', s.tiebreaker === 5, `got ${s.tiebreaker}`);
}

// Empty hand
{
  const s = scoreHand([]);
  assert('Empty hand = 0 pts', s.total === 0, `got ${s.total}`);
}

console.log('\n=== DECK TESTS ===\n');
{
  const deck = createDeck();
  assert('Deck has 52 cards', deck.length === 52, `got ${deck.length}`);
  const labels = new Set(deck.map(c => `${c.rank}${c.suit}`));
  assert('All cards unique', labels.size === 52, `got ${labels.size}`);
}
{
  const deck = createDeck();
  const shuffled = shuffle(deck);
  assert('Shuffle preserves 52 cards', shuffled.length === 52);
  // Very unlikely to be in same order
  const same = shuffled.every((c, i) => c.rank === deck[i].rank && c.suit === deck[i].suit);
  assert('Shuffle changes order (probabilistic)', !same);
}

console.log('\n=== AI TESTS ===\n');
{
  const pool = [card('A','♠'), card('A','♥'), card('K','♦')];
  const aiHand = [card('K','♠'), card('K','♥')];
  const playerHand = [];
  // Medium AI should prefer completing a 3-of-a-kind (K♦ -> 3 kings = 50 pts) over pair of aces
  const { card: picked } = pickCard('medium', pool, aiHand, playerHand);
  assert('Medium AI completes 3-of-a-kind', picked.rank === 'K', `picked ${picked.rank}${picked.suit}`);
}
{
  const pool = [card('2','♠'), card('3','♦'), card('7','♥')];
  const aiHand = [];
  const playerHand = [];
  const { card: picked } = pickCard('easy', pool, aiHand, playerHand);
  assert('Easy AI picks a card', pool.includes(picked));
}
{
  // Hard AI: player is one card away from a 5-card run (A-2-3-4-5 = 35pts).
  // Taking 5♠ costs AI nothing (AI hand is junk either way), but blocks player down to 20pts.
  // Taking 9♦ helps AI nothing and lets player complete the run.
  const five = card('5','♠');
  const nine = card('9','♦');
  // AI hand: 4 cards with no pattern and neither 5 nor 9 helps AI meaningfully
  // Choose cards so that neither 5♠ nor 9♦ creates a useful run for AI
  const pool = [five, nine];
  const playerHand = [card('A','♣'), card('2','♥'), card('3','♦'), card('4','♣')];
  const aiHand = [card('Q','♠'), card('Q','♥'), card('Q','♦'), card('K','♠')]; // 3-of-a-kind already locked in = 50
  // With 5: AI=50, Player=35. AI wins regardless.
  // With 9: AI=50, Player=35. Same outcome.
  // Both give same AI score; but blocking 5 reduces player score and is safer.
  // Actually test a scenario where it matters: AI hand is nothing, player is about to beat AI
  // Cleaner: AI has no patterns, player about to score big — AI must block
  const aiHandJunk = [card('2','♠'), card('6','♥'), card('10','♦'), card('K','♣')];
  // aiHandJunk + 5♠: [2,5,6,10,K] = no run, no pattern = 0 pts
  // aiHandJunk + 9♦: [2,6,9,10,K] = no run, no pattern = 0 pts
  // player + 5♠: A-2-3-4-5 = 35 pts; player + 9♦: A-2-3-4 + 9 = 20 pts (4-run only)
  // blockDelta for 5♠ = 35-20 = 15, for 9♦ = 0
  // Hard AI should pick 5♠ to block
  const { card: picked } = pickCard('hard', pool, aiHandJunk, playerHand);
  assert('Hard AI blocks player completing 5-card run', picked === five, `picked ${picked.rank}${picked.suit}`);
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
