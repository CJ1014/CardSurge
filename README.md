# Card Surge

A terminal card game where you build the best 5-card hand from a shared pool, trying to outscore — and outmaneuver — an AI opponent across multiple rounds.

## Quick Start

```bash
node index.js
```

For AI reasoning output:

```bash
node index.js --debug
```

Run the test suite:

```bash
node test.js
```

---

## How to Play

### Setup

At the start you choose:
- **Difficulty**: `easy`, `medium`, or `hard`
- **Starting chips**: how many chips each player begins with (default: 40)
- **Ante**: chips each player puts into the pot before each round (default: 1)

### Each Round

1. Both players pay the ante into the pot
2. **5 picking turns** happen in sequence:
   - Two cards are dealt face-up from a shuffled deck
   - **You pick first** — enter `1` or `2` to choose a card
   - **The AI picks** the remaining card automatically
3. After all 10 cards are picked (5 each), both hands are scored
4. The higher score wins the entire pot
5. On a tie, the player with more face-card points wins (J/Q/K = 1 pt each, A = 2 pts)

### Winning the Game

The game ends when a player reaches 0 chips. The other player wins.

You can also quit early after any round — final chip counts decide the winner.

---

## Scoring

Patterns **stack** — a single hand can score multiple bonuses simultaneously.

### Pairs & Groups

| Pattern | Points |
|---|---|
| 1 pair | 15 |
| 2 pairs | 40 |
| 3 of a kind | 50 |
| Full house (3 + 2) | 100 |
| 4 of a kind | 80 |

### Runs (consecutive ranks)

| Pattern | Points |
|---|---|
| 3-card run | 10 |
| 4-card run | 20 |
| 5-card run | 35 |

Ace plays **high** (10-J-Q-K-A) or **low** (A-2-3-4-5) automatically — whichever scores better.

### Suit Power

| Pattern | Points |
|---|---|
| 3 cards same suit | 10 |
| 4 cards same suit | 25 |
| 5 cards same suit | 50 |

### Color Bonus

| Pattern | Points |
|---|---|
| All 5 cards same color (all red or all black) | 20 |

### Stacking Example

Hand: `5♠ 6♠ 7♠ 5♥ 6♥`

- 1 pair (fives): **15 pts**
- 1 pair (sixes): combined with above → **2 pairs: 40 pts**
- 3-card run (5-6-7): **10 pts**
- 3 same suit (spades): **10 pts**

**Total: 60 pts**

---

## AI Difficulty

### Easy
Picks a random card from the two available each turn. No strategy.

### Medium
Evaluates which card improves its own hand most (pairs, runs, suit clusters), with partial weight given to blocking cards the opponent needs.

### Hard
Full lookahead with opponent modeling:
- Scores every possible pick against the current hand
- Estimates future potential of the resulting hand
- Tracks what patterns the opponent is building and blocks high-value completions
- Adjusts blocking aggressiveness based on who is ahead on points

Run with `--debug` to see the Hard AI's pick-by-pick reasoning.

---

## Card Display

Cards are shown as rank + suit symbol side by side: `A♠  10♥  K♦  3♣`

Red suits (♥ ♦) are displayed in red. Black suits (♠ ♣) are in normal text.

---

## Options & Customization

| Flag | Effect |
|---|---|
| `--debug` | Show AI reasoning for each pick |

Starting chips and ante amount are configurable at the start of each game session. Both can be set to any positive integer.

---

## Project Structure

```
index.js          Entry point and game loop
src/
  deck.js         Deck creation, shuffling, card utilities
  scoring.js      Hand evaluation — all patterns, stacking, tiebreaker
  ai.js           Easy / Medium / Hard AI pick logic
  game.js         Round flow, chip accounting, state management
  ui.js           Terminal rendering, ANSI colors
test.js           29 unit tests (scoring, deck, AI scenarios)
```
