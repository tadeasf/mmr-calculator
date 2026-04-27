# Methodology

The estimator returns `(mu, sigma)` — a mean MMR and standard deviation. The 90%
confidence interval shown to users is `mu ± 1.645 * sigma`.

## Tier 1 — Win behavior

Cheap signal derived from `league-v4` only. Cost: **1 API call**.

The matchmaker drives most accounts toward a 50% win rate. The deviation from 50%, scaled
by sample size, is a noisy but unbiased estimate of how far the player's MMR sits from the
matchmaker's target for their bracket.

```
delta_mmr  = k * (winrate - 0.5) * sqrt(n)
mu_tier1   = rank_baseline + delta_mmr
sigma_tier1 = base_sigma / sqrt(n)
```

Where `n` is games played in the current split, `k` is a tuning constant calibrated
against known accounts, and `rank_baseline` is the median MMR for the player's visible
tier/division.

This tier is fast and always available, but its sigma stays large unless `n` is high.
It is the *only* signal for accounts under ~20 games this split.

## Tier 2 — Lobby composition

The strong signal. Cost: up to ~180 Riot API calls per cold request, mitigated by D1.

For each of the player's last 20 ranked solo/duo games:

1. Fetch the match via `match-v5`.
2. For all 9 other participants, look up their current ranked entry.
3. Convert each participant's rank to MMR via the `tier/division/lp → MMR` map.
4. Compute a weighted lobby average:
   - Opponents: weight `0.6`
   - Teammates: weight `0.4`
   - Recency decay: `exp(-days_since_match / 14)`
5. Discard games with more than 2 unranked participants — they distort the lobby average
   too much.

Per-match lobby MMR estimates are aggregated:

```
mu_tier2    = weighted_mean(lobby_estimates)
sigma_tier2 = weighted_stdev(lobby_estimates) / sqrt(games_used)
```

For steady-state accounts (20+ ranked games this split), Tier 2 dominates the combined
estimate. For smurfs and decaying accounts it correctly produces wider intervals because
match-to-match lobby variance grows.

## Tier 3 — Inverse-variance combination

Both tiers produce `(mu, sigma)`. We combine via:

```
w_i      = 1 / sigma_i^2
mu_final = (w_1 * mu_1 + w_2 * mu_2) / (w_1 + w_2)
sigma_final = sqrt(1 / (w_1 + w_2))
```

This automatically gives more weight to the more confident tier. We then floor `sigma_final`
at **40 MMR** to reflect irreducible matchmaking noise — no estimator should claim a
±20 MMR interval on a public-data signal.

## What the floor protects against

Without the sigma floor, the estimator would happily report ±15 MMR intervals on accounts
with hundreds of recent games. Riot's matchmaker itself fluctuates by more than that on a
day-to-day basis. The floor encodes the honesty of "we don't know to that precision, even
with infinite data."

## Future tier — LP-delta inversion

The cron job at `30 0 * * *` snapshots ranked entries daily. Once 7+ days of snapshots
exist for an account, observed `(LP_delta, opponent_rank)` pairs let us solve for MMR
directly via the matchmaker's LP gain function. The code path is structured for this — it
just needs a snapshot-count gate, which today is the missing piece.
