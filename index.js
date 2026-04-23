#!/usr/bin/env node
'use strict';

const readline = require('readline');
const { createGameState, playRound, isGameOver, gameWinner } = require('./src/game');
const ui = require('./src/ui');

const DEBUG = process.argv.includes('--debug');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Queue-based readline: ensures no line events are lost when input is piped
const lineQueue = [];
let lineResolver = null;

rl.on('line', (line) => {
  if (lineResolver) {
    const resolve = lineResolver;
    lineResolver = null;
    resolve(line.trim());
  } else {
    lineQueue.push(line.trim());
  }
});

function nextLine() {
  return new Promise((resolve) => {
    if (lineQueue.length > 0) {
      resolve(lineQueue.shift());
    } else {
      lineResolver = resolve;
    }
  });
}

function ask(question) {
  process.stdout.write(question);
  return nextLine();
}

async function chooseDifficulty() {
  while (true) {
    const ans = await ask('  Choose difficulty [easy/medium/hard]: ');
    const d = ans.toLowerCase();
    if (['easy', 'medium', 'hard'].includes(d)) return d;
    console.log('  Please enter easy, medium, or hard.');
  }
}

async function chooseSettings() {
  const diffAns = await chooseDifficulty();

  const chipsAns = await ask('  Starting chips per player [default: 40]: ');
  const startingChips = parseInt(chipsAns, 10) || 40;

  const anteAns = await ask('  Ante per round [default: 1]: ');
  const anteAmount = parseInt(anteAns, 10) || 1;

  return { difficulty: diffAns, startingChips, anteAmount };
}

async function main() {
  ui.printWelcome();

  const { difficulty, startingChips, anteAmount } = await chooseSettings();
  if (DEBUG) console.log(`  [DEBUG] difficulty=${difficulty} chips=${startingChips} ante=${anteAmount}`);

  const state = createGameState(difficulty, startingChips, anteAmount, DEBUG);

  let continueGame = true;

  while (continueGame && !isGameOver(state)) {
    await playRound(state, nextLine);

    if (isGameOver(state)) break;

    const ans = await ask('\n  Play another round? [y/n]: ');
    if (ans.toLowerCase() !== 'y') {
      continueGame = false;
    }
  }

  const winner = gameWinner(state) || (state.playerChips >= state.aiChips ? 'player' : 'ai');
  ui.printGameOver(winner, state.round, state.playerChips, state.aiChips, state.history);

  rl.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
