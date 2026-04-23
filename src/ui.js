'use strict';

const { cardColor } = require('./deck');

// ANSI color helpers
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN  = '\x1b[36m';
const YELLOW = '\x1b[33m';

function colorCard(card) {
  const label = `${card.rank}${card.suit}`;
  return cardColor(card) === 'red' ? `${RED}${label}${RESET}` : label;
}

function colorCards(cards) {
  return cards.map(colorCard).join('  ');
}

function header(text) {
  const line = '─'.repeat(60);
  console.log(`\n${BOLD}${line}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${BOLD}${line}${RESET}`);
}

function divider() {
  console.log(`${DIM}${'─'.repeat(60)}${RESET}`);
}

function printRoundHeader(state) {
  header(`ROUND ${state.round}  |  Pot: ${state.pot} chips`);
  console.log(`  ${CYAN}You${RESET}:  ${state.playerChips} chips`);
  console.log(`  ${YELLOW}AI${RESET}:   ${state.aiChips} chips`);
  divider();
}

function printPickState(state, available) {
  const pickNum = state.playerHand.length + state.aiHand.length + 1;
  console.log(`\n${BOLD}─── Pick ${pickNum} of 10 ───${RESET}`);
  console.log(`  Available:  ${colorCards(available)}`);
  console.log(`  Your hand:  ${state.playerHand.length ? colorCards(state.playerHand) : '(empty)'}`);
  console.log(`  AI hand:    ${state.aiHand.length ? colorCards(state.aiHand) : '(empty)'}`);
}

function printAIPick(card, reason, debug) {
  console.log(`  ${YELLOW}AI picks:${RESET} ${colorCard(card)}`);
  if (debug && reason) {
    console.log(`  ${DIM}  reason: ${reason}${RESET}`);
  }
}

function printRoundResult(playerHand, aiHand, playerScore, aiScore, playerChips, aiChips, pot, result) {
  header('ROUND RESULTS');

  console.log(`  ${CYAN}Your hand:${RESET}   ${colorCards(playerHand)}`);
  console.log(`    Score: ${BOLD}${playerScore.total}${RESET} pts`);
  if (playerScore.patterns.length) {
    for (const p of playerScore.patterns) {
      console.log(`      + ${p.name}: ${p.points} pts`);
    }
  } else {
    console.log(`      (no patterns)`);
  }
  console.log(`    Tiebreaker: ${playerScore.tiebreaker}`);

  divider();

  console.log(`  ${YELLOW}AI hand:${RESET}     ${colorCards(aiHand)}`);
  console.log(`    Score: ${BOLD}${aiScore.total}${RESET} pts`);
  if (aiScore.patterns.length) {
    for (const p of aiScore.patterns) {
      console.log(`      + ${p.name}: ${p.points} pts`);
    }
  } else {
    console.log(`      (no patterns)`);
  }
  console.log(`    Tiebreaker: ${aiScore.tiebreaker}`);

  divider();

  if (result === 'player') {
    console.log(`  ${GREEN}${BOLD}You win this round! +${pot} chips${RESET}`);
  } else if (result === 'ai') {
    console.log(`  ${RED}${BOLD}AI wins this round. -${pot} chips${RESET}`);
  } else {
    console.log(`  ${BOLD}Tie! Pot returned.${RESET}`);
  }

  console.log(`\n  ${CYAN}Your chips:${RESET} ${playerChips}  |  ${YELLOW}AI chips:${RESET} ${aiChips}`);
}

function printGameOver(winner, rounds, playerChips, aiChips, history) {
  header('GAME OVER');
  if (winner === 'player') {
    console.log(`  ${GREEN}${BOLD}YOU WIN THE GAME!${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}AI WINS THE GAME!${RESET}`);
  }
  console.log(`\n  Rounds played: ${rounds}`);
  console.log(`  Final chips — You: ${playerChips}  AI: ${aiChips}`);

  if (history && history.length) {
    divider();
    console.log(`  ${BOLD}Round History:${RESET}`);
    let playerWins = 0, aiWins = 0, ties = 0;
    for (const r of history) {
      const mark = r.result === 'player' ? `${GREEN}W${RESET}` : r.result === 'ai' ? `${RED}L${RESET}` : `${DIM}T${RESET}`;
      const bestHand = r.playerBestPattern || '(no pattern)';
      console.log(`    Round ${r.round}: [${mark}] You: ${r.playerScore} pts (${bestHand})  AI: ${r.aiScore} pts`);
      if (r.result === 'player') playerWins++;
      else if (r.result === 'ai') aiWins++;
      else ties++;
    }
    divider();
    console.log(`  Wins: ${playerWins}  Losses: ${aiWins}  Ties: ${ties}`);

    const scores = history.map(r => r.playerScore);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const best = Math.max(...scores);
    console.log(`  Avg score per round: ${avg}  |  Best hand score: ${best}`);
  }
  divider();
}

function printWelcome() {
  console.clear();
  console.log(`${BOLD}${CYAN}`);
  console.log(`  ██████╗ █████╗ ██████╗ ██████╗     ███████╗██╗   ██╗██████╗  ██████╗ ███████╗`);
  console.log(`  ██╔════╝██╔══██╗██╔══██╗██╔══██╗    ██╔════╝██║   ██║██╔══██╗██╔════╝ ██╔════╝`);
  console.log(`  ██║     ███████║██████╔╝██║  ██║    ███████╗██║   ██║██████╔╝██║  ███╗█████╗  `);
  console.log(`  ██║     ██╔══██║██╔══██╗██║  ██║    ╚════██║██║   ██║██╔══██╗██║   ██║██╔══╝  `);
  console.log(`  ╚██████╗██║  ██║██║  ██║██████╔╝    ███████║╚██████╔╝██║  ██║╚██████╔╝███████╗`);
  console.log(`   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝`);
  console.log(`${RESET}`);
  console.log(`  Pick cards, build patterns, outplay the AI.`);
  console.log(`  Each round: 5 picks from a shared pool. Best hand wins the pot.`);
  divider();
}

module.exports = {
  colorCard, colorCards, header, divider,
  printRoundHeader, printPickState, printAIPick,
  printRoundResult, printGameOver, printWelcome
};
