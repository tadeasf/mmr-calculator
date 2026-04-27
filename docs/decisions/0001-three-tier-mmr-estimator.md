# ADR-0001: Three-tier inverse-variance MMR estimator

## Status

Accepted

## Context

Existing MMR tools (AussyELO, RankedKings, NoobHours) take a player's visible rank and
multiply their win rate against a scalar constant. This produces a number that is entirely
determined by visible rank — it cannot distinguish a player whose MMR matches their rank from
one whose MMR is 400 points higher. The signal is weak and the output is fake-precise.

We need something that (a) uses the strongest available signal and (b) is honest about
uncertainty.

## Decision

We use a three-tier estimator:

**Tier 1 — Win behavior** (cheap, from league-v4 only):
Computes the gap between estimated MMR and visible rank from the deviation of a player's
win rate from 50%, scaled by sqrt(n) for sample confidence. Cost: 1 API call.

**Tier 2 — Lobby composition** (expensive but most informative):
For each of the player's last 20 ranked games, we look up the current rank of all 9 other
participants and compute a weighted lobby average. Opponents are weighted 0.6 vs teammates
0.4 (opponents are a tighter MMR signal). Recency-decays at exp(-days/14). Discards games
with >2 unranked participants. Cost: up to ~180 API calls, heavily mitigated by the D1
ranked_entries cache.

**Tier 3 — Inverse-variance combination**:
Both tiers produce (mu, sigma) estimates. We combine via w = 1/sigma^2, which
automatically weights the more confident estimate. The resulting 90% CI is displayed to the
user. sigma is floored at 40 MMR to reflect irreducible matchmaking noise.

## Consequences

- **Better accuracy**: Tier 2 is the only publicly available MMR signal that doesn't rely
  on the player's own rank. For steady-state accounts (20+ games), it dominates the
  estimate.
- **Higher API cost**: Cold requests touch ~200 Riot API endpoints. With a dev key (100
  req/2 min) this is throttle-limited. The D1 ranked_entries cache (24h TTL) means repeat
  checks of popular players are near-free.
- **Honest uncertainty**: A new player or sparse account gets a wide CI rather than a
  fake-confident number. This is a feature, not a bug.
- **Future upgrade path**: Tier 1 upgrades to true LP-delta inversion once 7+ days of
  daily snapshots exist for the account. The code path is ready; it just needs a flag check
  on snapshot count.
