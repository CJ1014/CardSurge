'use strict';

const { cardColor } = require('./deck');

// ANSI color helpers
const RED    = '\x1b[31m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';

// ─── Card art ────────────────────────────────────────────────────────────────

const CARD_W   = 9;   // visual width of one rendered card (┌───────┐)
const CARD_GAP = ' '; // space between side-by-side cards

// Returns a 7-line array of strings for one card
function cardLines(card) {
  const r = card.rank;
  const s = card.suit;
  const isRed = cardColor(card) === 'red';
  const C = isRed ? RED : '';
  const R = isRed ? RESET : '';

  // Content is 7 visual chars between the │ borders
  const top = r.padEnd(2) + '     '; // rank top-left, padded to 7
  const bot = '     ' + r.padStart(2); // rank bottom-right, padded to 7
  const mid = `  ${s}    `;           // suit centered-ish in 7 chars

  return [
    `${C}┌───────┐${R}`,
    `${C}│${top}│${R}`,
    `${C}│       │${R}`,
    `${C}│${mid}│${R}`,
    `${C}│       │${R}`,
    `${C}│${bot}│${R}`,
    `${C}└───────┘${R}`,
  ];
}

// Returns a 7-line array for a face-down card back
function cardBackLines() {
  return [
    '┌───────┐',
    '│░░░░░░░│',
    '│░░░░░░░│',
    '│░░░░░░░│',
    '│░░░░░░░│',
    '│░░░░░░░│',
    '└───────┘',
  ];
}

// Prints a row of cards side by side, with optional pick-number labels above
function printCardRow(cards, labels, indent) {
  indent = indent || '  ';
  const allLines = cards.map(c => (c === null ? cardBackLines() : cardLines(c)));

  if (labels) {
    const labelRow = labels.map((lbl, i) => {
      const s = lbl != null ? `[${lbl}]` : '   ';
      // Center the label within CARD_W chars
      const pad = Math.floor((CARD_W - s.length) / 2);
      const padded = ' '.repeat(pad) + s + ' '.repeat(CARD_W - s.length - pad);
      return i < labels.length - 1 ? padded + CARD_GAP : padded;
    }).join('');
    console.log(indent + labelRow);
  }

  for (let row = 0; row < 7; row++) {
    console.log(indent + allLines.map(l => l[row]).join(CARD_GAP));
  }
}

// ─── Inline helpers (compact display) ────────────────────────────────────────

function colorCard(card) {
  const label = `${card.rank}${card.suit}`;
  return cardColor(card) === 'red' ? `${RED}${label}${RESET}` : label;
}

function colorCards(cards) {
  return cards.map(colorCard).join('  ');
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function header(text) {
  const line = '═'.repeat(62);
  console.log(`\n${BOLD}${line}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${BOLD}${line}${RESET}`);
}

function divider() {
  console.log(`${DIM}${'─'.repeat(62)}${RESET}`);
}

// ─── Screen functions ─────────────────────────────────────────────────────────

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
  console.log(`  Each round: 5 picks from a shared pool — best hand wins the pot.`);
  divider();
}

function printRoundHeader(state) {
  header(`ROUND ${state.round}   ·   Pot: ${state.pot} chip${state.pot !== 1 ? 's' : ''}`);
  console.log(`  ${CYAN}You${RESET}: ${state.playerChips} chips    ${YELLOW}AI${RESET}: ${state.aiChips} chips`);
  divider();
}

function printPickState(state, available) {
  const pickNum = state.playerHand.length + state.aiHand.length + 1;
  console.log(`\n${BOLD}  ─── Pick ${pickNum} of 10 ───${RESET}`);

  // Available cards: full card art with pick labels
  console.log(`\n  ${BOLD}Choose a card:${RESET}`);
  printCardRow(available, available.map((_, i) => i + 1), '    ');

  // Current hands: compact inline display
  const yourHand  = state.playerHand.length ? colorCards(state.playerHand) : `${DIM}(empty)${RESET}`;
  const theirHand = state.aiHand.length     ? colorCards(state.aiHand)     : `${DIM}(empty)${RESET}`;
  console.log(`\n  ${CYAN}Your hand${RESET}:  ${yourHand}`);
  console.log(`  ${YELLOW}AI hand${RESET}:    ${theirHand}`);
}

function printAIPick(card, reason, debug) {
  console.log(`  ${YELLOW}AI picks:${RESET}  ${colorCard(card)}`);
  if (debug && reason) {
    console.log(`  ${DIM}  reason: ${reason}${RESET}`);
  }
}

function printRoundResult(playerHand, aiHand, playerScore, aiScore, playerChips, aiChips, pot, ante, result) {
  header('ROUND RESULTS');

  // Player hand
  console.log(`  ${CYAN}${BOLD}Your hand${RESET}`);
  printCardRow(playerHand, null, '  ');
  console.log(`  Score: ${BOLD}${playerScore.total}${RESET} pts`);
  if (playerScore.patterns.length) {
    for (const p of playerScore.patterns) {
      console.log(`    ${GREEN}+${p.points}${RESET}  ${p.name}`);
    }
  } else {
    console.log(`    ${DIM}(no patterns)${RESET}`);
  }
  console.log(`  Tiebreaker: ${playerScore.tiebreaker}`);

  divider();

  // AI hand
  console.log(`  ${YELLOW}${BOLD}AI hand${RESET}`);
  printCardRow(aiHand, null, '  ');
  console.log(`  Score: ${BOLD}${aiScore.total}${RESET} pts`);
  if (aiScore.patterns.length) {
    for (const p of aiScore.patterns) {
      console.log(`    ${RED}+${p.points}${RESET}  ${p.name}`);
    }
  } else {
    console.log(`    ${DIM}(no patterns)${RESET}`);
  }
  console.log(`  Tiebreaker: ${aiScore.tiebreaker}`);

  divider();

  // Result with clear chip accounting
  const net = pot - ante; // ante already paid, so net gain = pot - your own ante
  if (result === 'player') {
    console.log(`  ${GREEN}${BOLD}You win this round!${RESET}`);
    console.log(`  ${DIM}Pot: ${pot} chips (you paid ${ante} ante + AI's ${ante} ante)${RESET}`);
    console.log(`  ${GREEN}Net gain: +${net} chip${net !== 1 ? 's' : ''}${RESET}`);
  } else if (result === 'ai') {
    console.log(`  ${RED}${BOLD}AI wins this round.${RESET}`);
    console.log(`  ${DIM}Pot: ${pot} chips (you paid ${ante} ante + AI's ${ante} ante)${RESET}`);
    console.log(`  ${RED}Net loss: -${net} chip${net !== 1 ? 's' : ''}${RESET}`);
  } else {
    console.log(`  ${BOLD}Tie! Antes returned to both players.${RESET}`);
  }

  console.log(`\n  ${CYAN}You${RESET}: ${playerChips} chips    ${YELLOW}AI${RESET}: ${aiChips} chips`);
}

function printGameOver(winner, rounds, playerChips, aiChips, history) {
  header('GAME OVER');
  if (winner === 'player') {
    console.log(`  ${GREEN}${BOLD}YOU WIN THE GAME!${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}AI WINS THE GAME.${RESET}`);
  }
  console.log(`\n  Rounds played: ${rounds}`);
  console.log(`  Final chips — ${CYAN}You${RESET}: ${playerChips}   ${YELLOW}AI${RESET}: ${aiChips}`);

  if (history && history.length) {
    divider();
    console.log(`  ${BOLD}Round-by-round history:${RESET}`);
    let wins = 0, losses = 0, ties = 0;
    for (const r of history) {
      const mark = r.result === 'player'
        ? `${GREEN}W${RESET}` : r.result === 'ai'
        ? `${RED}L${RESET}` : `${DIM}T${RESET}`;
      const best = r.playerBestPattern || 'no pattern';
      console.log(`    Round ${String(r.round).padStart(2)}: [${mark}]  You: ${String(r.playerScore).padStart(3)} pts (${best})   AI: ${String(r.aiScore).padStart(3)} pts`);
      if (r.result === 'player') wins++;
      else if (r.result === 'ai') losses++;
      else ties++;
    }
    divider();
    console.log(`  Record: ${GREEN}${wins}W${RESET} / ${RED}${losses}L${RESET} / ${DIM}${ties}T${RESET}`);
    const scores = history.map(r => r.playerScore);
    const avg  = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const best = Math.max(...scores);
    console.log(`  Avg score: ${avg} pts/round   Best hand: ${best} pts`);
  }
  divider();
}

module.exports = {
  colorCard, colorCards, header, divider,
  printWelcome, printRoundHeader, printPickState,
  printAIPick, printRoundResult, printGameOver,
};
