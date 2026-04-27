# API reference

All endpoints are mounted under `/api/v1/`. Responses are JSON. Errors follow the shape
`{ "error": string, "code": string }` with appropriate HTTP status codes.

`region` is one of: `euw1`, `eun1`, `na1`, `kr`, `br1`, `la1`, `la2`, `oc1`, `tr1`,
`ru`, `jp1`. `riotId` is the URL-encoded `gameName#tagLine`.

## `GET /api/v1/health`

Liveness probe. Returns `200` with `{ "ok": true, "version": "<sha>" }`.

## `GET /api/v1/mmr`

Primary endpoint. Computes a fresh estimate.

**Query params**

| Name | Required | Description |
| --- | --- | --- |
| `region` | yes | Platform region (see list above) |
| `riotId` | yes | URL-encoded `name#tag` |
| `queue` | no | `solo` (default) or `flex` |

**Response**

```json
{
  "summoner": {
    "puuid": "…",
    "gameName": "…",
    "tagLine": "…",
    "region": "euw1"
  },
  "estimate": {
    "mu": 1842,
    "sigma": 64,
    "ci90": [1737, 1947],
    "tier": "PLATINUM",
    "division": "II"
  },
  "breakdown": {
    "tier1": { "mu": 1810, "sigma": 95, "n_games": 142 },
    "tier2": { "mu": 1855, "sigma": 78, "lobbies_used": 18 }
  },
  "freshness": {
    "computed_at": "2026-04-27T17:00:00Z",
    "from_cache": false
  }
}
```

`from_cache: true` indicates the entire estimate was served from KV without recomputation.

## `GET /api/v1/compare`

Compare two or more accounts side by side.

**Query params**

| Name | Required | Description |
| --- | --- | --- |
| `accounts` | yes | Comma-separated `region:riotId` pairs (1–5) |

**Response**: object keyed by `region:riotId`, each value is the same shape as `/mmr`'s
`estimate` block.

## `GET /api/v1/timeline`

Returns the daily MMR snapshot history for an account, drawn from `mmr_snapshots`.

**Query params**: `region`, `riotId`, optional `days` (default 30, max 180).

**Response**

```json
{
  "summoner": { "puuid": "…", "gameName": "…", "tagLine": "…" },
  "points": [
    { "date": "2026-04-26", "mu": 1810, "sigma": 70 },
    { "date": "2026-04-27", "mu": 1842, "sigma": 64 }
  ]
}
```

## `GET /api/v1/lobby/:matchId`

Diagnostic endpoint — exposes Tier 2's per-match calculation for a single match.

**Path params**: `matchId` (region-prefixed, e.g. `EUW1_7123456789`).

**Response**

```json
{
  "matchId": "EUW1_7123456789",
  "lobby_mu": 1880,
  "weights": {
    "opponents_total": 0.6,
    "teammates_total": 0.4,
    "recency": 0.92
  },
  "participants": [
    { "puuid": "…", "side": "ally", "tier": "GOLD", "division": "I", "lp": 73, "mmr": 1620 }
  ]
}
```

## Rate limiting & errors

The Worker's own rate limit is generous (300 req/min/IP). Riot-side throttling surfaces as
`429` with `Retry-After`. Estimator-specific errors:

| Code | HTTP | Meaning |
| --- | --- | --- |
| `summoner_not_found` | 404 | `account-v1` returned no PUUID |
| `unranked` | 422 | No ranked entry for the requested queue |
| `insufficient_history` | 422 | Fewer than 5 ranked games in the window |
| `riot_upstream` | 502 | Riot API returned 5xx after retries |
