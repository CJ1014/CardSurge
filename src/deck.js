'use strict';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_VALUES = Object.fromEntries(RANKS.map((r, i) => [r, i + 2]));

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
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

function cardValue(card) {
  return RANK_VALUES[card.rank];
}

function cardColor(card) {
  return (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
}

function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

function isRed(card) {
  return cardColor(card) === 'red';
}

module.exports = { createDeck, shuffle, cardValue, cardColor, cardLabel, isRed, RANKS, SUITS, RANK_VALUES };
