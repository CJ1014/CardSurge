'use strict';
// ── DOM App ───────────────────────────────────────────────────────

const { createDeck, shuffle, cardColor, scoreHand, pickCard } = window.CardSurge;

// ── State ─────────────────────────────────────────────────────────

let G = {}; // game state

function newGame(difficulty, startingChips, anteAmount) {
  G = {
    difficulty,
    startingChips,
    anteAmount,
    playerChips: startingChips,
    aiChips: startingChips,
    pot: 0,
    round: 0,
    history: [],
    playerHand: [],
    aiHand: [],
    deck: [],
    available: [],
    picking: false,
  };
}

// ── Screen helpers ────────────────────────────────────────────────

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Card rendering ────────────────────────────────────────────────

function makeCard(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card ${cardColor(card)} deal-in`;
  if (opts.pickable) el.classList.add('pickable'); // no visual distinction beyond hover CSS
  if (opts.disabled) el.classList.add('disabled');

  const rank = card.rank;
  const suit = card.suit;

  el.innerHTML = `
    <div class="c-tl"><span class="c-rank">${rank}</span><span class="c-suit-sm">${suit}</span></div>
    <div class="c-center">${suit}</div>
    <div class="c-br"><span class="c-rank">${rank}</span><span class="c-suit-sm">${suit}</span></div>
  `;

  if (opts.onClick) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', opts.onClick);
  }

  // Remove animation class after it fires so it doesn't replay
  el.addEventListener('animationend', () => el.classList.remove('deal-in'), { once: true });
  return el;
}

function renderCards(containerId, cards, opts = {}) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  for (const card of cards) {
    el.appendChild(makeCard(card, opts));
  }
}

// ── HUD updates ───────────────────────────────────────────────────

function updateHUD() {
  document.getElementById('hd-round').textContent = G.round;
  document.getElementById('hd-pot').textContent   = G.pot + ' chips';
  document.getElementById('hd-you').textContent   = G.playerChips;
  document.getElementById('hd-ai').textContent    = G.aiChips;
}

function updateLiveScores() {
  const ps = scoreHand(G.playerHand);
  const as = scoreHand(G.aiHand);
  const you = document.getElementById('you-score-live');
  const ai  = document.getElementById('ai-score-live');
  you.textContent = G.playerHand.length ? ps.total + ' pts' : '';
  ai.textContent  = G.aiHand.length    ? as.total + ' pts' : '';
}

// ── Round flow ────────────────────────────────────────────────────

function startRound() {
  G.round++;
  G.playerHand = [];
  G.aiHand = [];
  G.deck = shuffle(createDeck());

  const ante = Math.min(G.anteAmount, G.playerChips, G.aiChips);
  G.playerChips -= ante;
  G.aiChips -= ante;
  G.pot = ante * 2;

  show('screen-game');
  updateHUD();
  document.getElementById('player-hand').innerHTML = '';
  document.getElementById('ai-hand').innerHTML = '';
  document.getElementById('you-score-live').textContent = '';
  document.getElementById('ai-score-live').textContent = '';

  nextPick();
}

function nextPick() {
  if (G.playerHand.length === 5) {
    setTimeout(showRoundResult, 300);
    return;
  }

  // Deal 2 new available cards
  G.available = G.deck.splice(0, 2);
  renderAvailable(true);
  setPrompt('Your pick!', false);
}

function renderAvailable(pickable) {
  const el = document.getElementById('avail-cards');
  el.innerHTML = '';
  for (let i = 0; i < G.available.length; i++) {
    const card = G.available[i];
    const cardEl = makeCard(card, {
      onClick: pickable ? () => onPlayerPick(card) : null,
    });
    el.appendChild(cardEl);
  }
}

function onPlayerPick(card) {
  if (!G.picking) return;
  G.picking = false;

  // Disable remaining available cards
  renderAvailable(false);

  G.playerHand.push(card);
  G.available = G.available.filter(c => c !== card);

  // Re-render player hand
  renderCards('player-hand', G.playerHand);
  updateLiveScores();

  setPrompt('AI is thinking…', true);

  // AI picks after a short delay
  setTimeout(doAIPick, 700);
}

function doAIPick() {
  const aiCard = pickCard(G.difficulty, G.available, G.aiHand, G.playerHand);
  G.aiHand.push(aiCard);
  G.available = [];

  renderCards('ai-hand', G.aiHand);
  updateLiveScores();

  // Clear available area
  document.getElementById('avail-cards').innerHTML = '';

  nextPick();
}

function setPrompt(text, waiting) {
  const el = document.getElementById('pick-prompt');
  el.textContent = text;
  el.classList.toggle('waiting', waiting);
  G.picking = !waiting;
}

// ── Round result ──────────────────────────────────────────────────

function showRoundResult() {
  const ps = scoreHand(G.playerHand);
  const as = scoreHand(G.aiHand);

  let winner;
  if      (ps.total > as.total) winner = 'player';
  else if (as.total > ps.total) winner = 'ai';
  else if (ps.tiebreaker > as.tiebreaker) winner = 'player';
  else if (as.tiebreaker > ps.tiebreaker) winner = 'ai';
  else winner = 'tie';

  const potWon = G.pot;
  const ante   = G.anteAmount;
  const net    = potWon - ante;

  if (winner === 'player') {
    G.playerChips += potWon;
  } else if (winner === 'ai') {
    G.aiChips += potWon;
  } else {
    G.playerChips += ante;
    G.aiChips += ante;
  }
  G.pot = 0;

  // History
  const bestPattern = ps.patterns.length
    ? ps.patterns.reduce((a, b) => a.points > b.points ? a : b).name
    : null;
  G.history.push({
    round: G.round, result: winner,
    playerScore: ps.total, aiScore: as.total,
    playerBestPattern: bestPattern,
  });

  // Render result screen
  const banner = document.getElementById('result-banner');
  if (winner === 'player') {
    banner.textContent = 'You Win!';
    banner.className = 'result-banner win';
  } else if (winner === 'ai') {
    banner.textContent = 'AI Wins';
    banner.className = 'result-banner lose';
  } else {
    banner.textContent = 'Tie!';
    banner.className = 'result-banner tie';
  }

  renderCards('res-player-cards', G.playerHand);
  renderCards('res-ai-cards', G.aiHand);

  document.getElementById('res-player-score').textContent = ps.total + ' pts';
  document.getElementById('res-ai-score').textContent     = as.total + ' pts';

  renderPatterns('res-player-patterns', ps.patterns);
  renderPatterns('res-ai-patterns', as.patterns);

  // Chip summary
  const summary = document.getElementById('chip-summary');
  if (winner === 'player') {
    summary.textContent = `You won the pot! Net gain: +${net} chip${net !== 1 ? 's' : ''}`;
    summary.className = 'chip-summary win-chip';
  } else if (winner === 'ai') {
    summary.textContent = `AI won the pot. Net loss: −${net} chip${net !== 1 ? 's' : ''}`;
    summary.className = 'chip-summary lose-chip';
  } else {
    summary.textContent = 'Tie — antes returned to both players.';
    summary.className = 'chip-summary tie-chip';
  }

  document.getElementById('res-you-chips').textContent = G.playerChips;
  document.getElementById('res-ai-chips').textContent  = G.aiChips;

  // Show/hide next button depending on whether game is over
  const isOver = G.playerChips <= 0 || G.aiChips <= 0;
  document.getElementById('btn-next').style.display = isOver ? 'none' : '';

  show('screen-result');
}

function renderPatterns(id, patterns) {
  const el = document.getElementById(id);
  el.innerHTML = '';
  if (!patterns.length) {
    el.innerHTML = '<li style="color:rgba(122,154,122,0.5)">No patterns</li>';
    return;
  }
  for (const p of patterns) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="pts">+${p.points}</span> ${p.name}`;
    el.appendChild(li);
  }
}

// ── Game over ─────────────────────────────────────────────────────

function showGameOver() {
  const winner = G.playerChips > 0 ? 'player' : 'ai';

  const title = document.getElementById('over-title');
  if (winner === 'player') {
    title.textContent = 'You Win!';
    title.className = 'over-title win';
  } else {
    title.textContent = 'AI Wins';
    title.className = 'over-title lose';
  }

  document.getElementById('over-sub').textContent =
    `${G.round} round${G.round !== 1 ? 's' : ''} played  ·  Final chips — You: ${G.playerChips}  AI: ${G.aiChips}`;

  // History list
  const hist = document.getElementById('over-history');
  hist.innerHTML = '';
  for (const r of G.history) {
    const row = document.createElement('div');
    row.className = 'history-row';
    const badge = r.result === 'player' ? 'W' : r.result === 'ai' ? 'L' : 'T';
    const best = r.playerBestPattern || 'no pattern';
    row.innerHTML = `
      <span class="badge ${badge}">${badge}</span>
      <span>Round ${r.round}</span>
      <span style="color:var(--white)">You: ${r.playerScore}pts</span>
      <span style="color:var(--muted);font-size:0.75rem">(${best})</span>
      <span style="margin-left:auto">AI: ${r.aiScore}pts</span>
    `;
    hist.appendChild(row);
  }

  // Stats
  const wins   = G.history.filter(r => r.result === 'player').length;
  const losses = G.history.filter(r => r.result === 'ai').length;
  const ties   = G.history.filter(r => r.result === 'tie').length;
  const scores = G.history.map(r => r.playerScore);
  const avg    = scores.length ? (scores.reduce((a, b) => a + b) / scores.length).toFixed(1) : 0;
  const best   = scores.length ? Math.max(...scores) : 0;

  document.getElementById('over-stats').innerHTML =
    `<b>${wins}W</b> / ${losses}L / ${ties}T &nbsp;·&nbsp; Avg: <b>${avg}pts</b> &nbsp;·&nbsp; Best hand: <b>${best}pts</b>`;

  show('screen-over');
}

// ── Event wiring ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Difficulty selector
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Start game
  document.getElementById('btn-deal').addEventListener('click', () => {
    const difficulty    = document.querySelector('.diff-btn.active').dataset.d;
    const startingChips = parseInt(document.getElementById('chips-input').value) || 40;
    const anteAmount    = parseInt(document.getElementById('ante-input').value)  || 1;
    newGame(difficulty, startingChips, anteAmount);
    startRound();
  });

  // Next round
  document.getElementById('btn-next').addEventListener('click', () => {
    if (G.playerChips <= 0 || G.aiChips <= 0) {
      showGameOver();
    } else {
      startRound();
    }
  });

  // Quit
  document.getElementById('btn-quit').addEventListener('click', () => {
    showGameOver();
  });

  // Play again
  document.getElementById('btn-again').addEventListener('click', () => {
    show('screen-start');
  });
});
