'use strict';

const { scoreHand, rankCounts, suitCounts } = require('./scoring');
const { cardValue, cardColor } = require('./deck');

// Easy: pure random pick
function easyPick(available, _aiHand, _playerHand, _debug) {
  const idx = Math.floor(Math.random() * available.length);
  return { card: available[idx], reason: 'Random pick' };
}

// Medium: basic greedy — pick the card that maximizes AI score, with simple blocking
function mediumPick(available, aiHand, playerHand, debug) {
  let bestScore = -1;
  let bestCard = available[0];
  let bestReason = '';

  for (const card of available) {
    const hypothetical = [...aiHand, card];
    const { total } = scoreHand(hypothetical);

    // Bonus: check if this card would complete a pair/run for player (blocking)
    const playerHypo = [...playerHand, card];
    const { total: playerScore } = scoreHand(playerHypo);
    const blockValue = playerScore * 0.4; // partial weight for blocking

    const value = total + blockValue;
    if (value > bestScore) {
      bestScore = value;
      bestCard = card;
      bestReason = `Score ${total} (block value ${blockValue.toFixed(1)})`;
    }
  }

  if (debug) console.log(`  [AI Medium] Picked ${bestCard.rank}${bestCard.suit}: ${bestReason}`);
  return { card: bestCard, reason: bestReason };
}

// Hard: full lookahead, opponent modeling, strategic flexibility
function hardPick(available, aiHand, playerHand, debug) {
  const remaining = aiHand.length;
  // picks left after this one
  const picksLeft = 4 - remaining;

  let bestValue = -Infinity;
  let bestCard = available[0];
  let bestReason = '';

  for (const card of available) {
    const hypothetical = [...aiHand, card];
    const { total: myScore } = scoreHand(hypothetical);

    // Project future value: rough estimate of how good the hand could become
    const futureBonus = estimateFuturePotential(hypothetical, available.filter(c => c !== card), picksLeft);

    // Opponent blocking: how much does taking this card deny the player?
    const playerHypo = [...playerHand, card];
    const { total: playerWithCard } = scoreHand(playerHypo);
    const { total: playerWithout } = scoreHand(playerHand);
    const blockDelta = playerWithCard - playerWithout;

    // Adaptive weighting: late in game, block more aggressively if player is ahead
    const { total: currentPlayerScore } = scoreHand(playerHand);
    const { total: currentMyScore } = scoreHand(aiHand);
    const blockWeight = currentPlayerScore > currentMyScore ? 0.7 : 0.35;

    const value = myScore + futureBonus * 0.5 + blockDelta * blockWeight;

    if (value > bestValue) {
      bestValue = value;
      bestCard = card;
      bestReason = `my=${myScore} future~${futureBonus.toFixed(1)} block=${blockDelta} weight=${blockWeight}`;
    }
  }

  if (debug) console.log(`  [AI Hard] Picked ${bestCard.rank}${bestCard.suit}: ${bestReason}`);
  return { card: bestCard, reason: bestReason };
}

// Estimates best-case future score gain from remaining picks
function estimateFuturePotential(currentHand, pool, picksLeft) {
  if (picksLeft <= 0 || pool.length === 0) return 0;

  // Try the top N combinations greedily
  let best = 0;
  const sample = pool.slice(0, Math.min(pool.length, 8));

  for (const card of sample) {
    const hypo = [...currentHand, card];
    const { total } = scoreHand(hypo);
    if (total > best) best = total;
  }

  const { total: current } = scoreHand(currentHand);
  return Math.max(0, best - current);
}

function pickCard(difficulty, available, aiHand, playerHand, debug = false) {
  switch (difficulty) {
    case 'easy':   return easyPick(available, aiHand, playerHand, debug);
    case 'medium': return mediumPick(available, aiHand, playerHand, debug);
    case 'hard':   return hardPick(available, aiHand, playerHand, debug);
    default:       return easyPick(available, aiHand, playerHand, debug);
  }
}

module.exports = { pickCard };
