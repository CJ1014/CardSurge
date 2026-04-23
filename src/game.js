'use strict';

const { createDeck, shuffle, cardLabel } = require('./deck');
const { scoreHand } = require('./scoring');
const { pickCard } = require('./ai');
const ui = require('./ui');

function createGameState(difficulty, startingChips, anteAmount, debug) {
  return {
    difficulty,
    debug,
    startingChips,
    anteAmount,
    playerChips: startingChips,
    aiChips: startingChips,
    pot: 0,
    round: 0,
    history: [],
    deck: [],
    playerHand: [],
    aiHand: [],
    available: [],
  };
}

function payAntes(state) {
  state.playerChips -= state.anteAmount;
  state.aiChips -= state.anteAmount;
  state.pot = state.anteAmount * 2;
}

function dealAvailable(state) {
  // Deal 2 new face-up cards from the deck
  const cards = state.deck.splice(0, 2);
  state.available = cards;
}

function determineRoundWinner(playerScore, aiScore) {
  if (playerScore.total > aiScore.total) return 'player';
  if (aiScore.total > playerScore.total) return 'ai';
  // Tiebreaker
  if (playerScore.tiebreaker > aiScore.tiebreaker) return 'player';
  if (aiScore.tiebreaker > playerScore.tiebreaker) return 'ai';
  return 'tie';
}

function awardPot(state, winner) {
  if (winner === 'player') {
    state.playerChips += state.pot;
  } else if (winner === 'ai') {
    state.aiChips += state.pot;
  } else {
    // Tie: return antes
    state.playerChips += state.anteAmount;
    state.aiChips += state.anteAmount;
  }
  state.pot = 0;
}

async function runPickingRound(state, nextLine) {
  // 5 picks total: player picks, then AI picks, 5 times
  for (let pick = 0; pick < 5; pick++) {
    dealAvailable(state);

    ui.printPickState(state, state.available);

    // Player picks
    const playerCard = await promptPlayerPick(state.available, nextLine);
    state.playerHand.push(playerCard);
    state.available = state.available.filter(c => c !== playerCard);
    console.log(`  ${'\x1b[36m'}You picked:${'\x1b[0m'} ${ui.colorCard(playerCard)}`);

    // AI picks from remaining
    const { card: aiCard, reason } = pickCard(
      state.difficulty,
      state.available,
      state.aiHand,
      state.playerHand,
      state.debug
    );
    state.aiHand.push(aiCard);
    state.available = state.available.filter(c => c !== aiCard);
    ui.printAIPick(aiCard, reason, state.debug);
  }
}

async function promptPlayerPick(available, nextLine) {
  const labels = available.map((c, i) => `${i + 1}: ${ui.colorCard(c)}`).join('   ');
  process.stdout.write(`\n  Pick a card [${labels}]: `);
  const line = await nextLine();
  const input = line.trim();
  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= available.length) {
    return available[num - 1];
  }
  const match = available.find(c => cardLabel(c).toLowerCase() === input.toLowerCase());
  if (match) return match;
  console.log(`  Invalid choice. Picking first available card.`);
  return available[0];
}

async function playRound(state, nextLine) {
  state.round++;
  state.playerHand = [];
  state.aiHand = [];
  state.deck = shuffle(createDeck());

  if (state.playerChips < state.anteAmount || state.aiChips < state.anteAmount) {
    // One player can't afford ante — they go all-in
    const actualAnte = Math.min(state.playerChips, state.aiChips, state.anteAmount);
    state.playerChips -= actualAnte;
    state.aiChips -= actualAnte;
    state.pot = actualAnte * 2;
  } else {
    payAntes(state);
  }

  ui.printRoundHeader(state);

  await runPickingRound(state, nextLine);

  const playerScore = scoreHand(state.playerHand);
  const aiScore = scoreHand(state.aiHand);
  const winner = determineRoundWinner(playerScore, aiScore);
  const potWon = state.pot;

  awardPot(state, winner);

  ui.printRoundResult(
    state.playerHand, state.aiHand,
    playerScore, aiScore,
    state.playerChips, state.aiChips,
    potWon, state.anteAmount, winner
  );

  const bestPattern = playerScore.patterns.length
    ? playerScore.patterns.reduce((a, b) => a.points > b.points ? a : b).name
    : null;

  state.history.push({
    round: state.round,
    result: winner,
    playerScore: playerScore.total,
    aiScore: aiScore.total,
    playerBestPattern: bestPattern,
    playerHand: [...state.playerHand],
    aiHand: [...state.aiHand],
  });

  return winner;
}

function isGameOver(state) {
  return state.playerChips <= 0 || state.aiChips <= 0;
}

function gameWinner(state) {
  if (state.playerChips <= 0) return 'ai';
  if (state.aiChips <= 0) return 'player';
  return null;
}

module.exports = { createGameState, playRound, isGameOver, gameWinner };
