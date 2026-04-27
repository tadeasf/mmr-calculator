import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const summoners = sqliteTable(
  'summoners',
  {
    puuid: text('puuid').primaryKey(),
    region: text('region').notNull(),
    riotId: text('riot_id').notNull(),
    tagLine: text('tag_line').notNull(),
    lastSeen: integer('last_seen').notNull(),
  },
  (t) => ({
    riotIdIdx: index('summoners_riot_id_idx').on(t.riotId, t.tagLine, t.region),
  }),
);

export const rankedEntries = sqliteTable(
  'ranked_entries',
  {
    puuid: text('puuid').notNull(),
    queue: text('queue').notNull(),
    tier: text('tier').notNull(),
    division: text('division').notNull(),
    lp: integer('lp').notNull(),
    wins: integer('wins').notNull(),
    losses: integer('losses').notNull(),
    fetchedAt: integer('fetched_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puuid, t.queue] }),
    fetchedIdx: index('ranked_fetched_idx').on(t.fetchedAt),
  }),
);

export const matchSummaries = sqliteTable(
  'match_summaries',
  {
    matchId: text('match_id').primaryKey(),
    region: text('region').notNull(),
    queue: integer('queue').notNull(),
    startedAt: integer('started_at').notNull(),
    duration: integer('duration').notNull(),
    // [{ puuid, teamId, role, win }]
    participantsJson: text('participants_json').notNull(),
    fetchedAt: integer('fetched_at').notNull(),
  },
  (t) => ({
    startedIdx: index('matches_started_idx').on(t.startedAt),
  }),
);

export const playerMatches = sqliteTable(
  'player_matches',
  {
    puuid: text('puuid').notNull(),
    matchId: text('match_id').notNull(),
    startedAt: integer('started_at').notNull(),
    win: integer('win').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puuid, t.matchId] }),
    lookupIdx: index('player_matches_idx').on(t.puuid, t.startedAt),
  }),
);

export const mmrEstimates = sqliteTable(
  'mmr_estimates',
  {
    puuid: text('puuid').notNull(),
    queue: text('queue').notNull(),
    mmrMu: real('mmr_mu').notNull(),
    mmrSigma: real('mmr_sigma').notNull(),
    tier1Mu: real('tier1_mu'),
    tier1Sigma: real('tier1_sigma'),
    tier2Mu: real('tier2_mu'),
    tier2Sigma: real('tier2_sigma'),
    lobbiesUsed: integer('lobbies_used').notNull(),
    computedAt: integer('computed_at').notNull(),
    resultJson: text('result_json').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puuid, t.queue] }),
  }),
);

export const mmrSnapshots = sqliteTable(
  'mmr_snapshots',
  {
    puuid: text('puuid').notNull(),
    queue: text('queue').notNull(),
    day: text('day').notNull(),
    mmrMu: real('mmr_mu').notNull(),
    mmrSigma: real('mmr_sigma').notNull(),
    tier: text('tier').notNull(),
    division: text('division').notNull(),
    lp: integer('lp').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.puuid, t.queue, t.day] }),
    timelineIdx: index('snapshots_timeline_idx').on(t.puuid, t.queue, t.day),
  }),
);

export const trackedAccounts = sqliteTable('tracked_accounts', {
  puuid: text('puuid').primaryKey(),
  addedAt: integer('added_at').notNull(),
  lastEstimatedAt: integer('last_estimated_at'),
  checkCount: integer('check_count').notNull().default(0),
});
