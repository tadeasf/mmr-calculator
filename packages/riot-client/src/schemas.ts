import { z } from 'zod';

export const AccountSchema = z.object({
  puuid: z.string(),
  gameName: z.string(),
  tagLine: z.string(),
});

export const LeagueEntrySchema = z.object({
  leagueId: z.string().optional(),
  queueType: z.string(),
  tier: z.string(),
  rank: z.string(),
  summonerId: z.string().optional(),
  leaguePoints: z.number(),
  wins: z.number(),
  losses: z.number(),
  hotStreak: z.boolean().optional(),
  veteran: z.boolean().optional(),
  freshBlood: z.boolean().optional(),
  inactive: z.boolean().optional(),
});

export const LeagueEntriesSchema = z.array(LeagueEntrySchema);

export const MatchParticipantSchema = z.object({
  puuid: z.string(),
  teamId: z.number(),
  teamPosition: z.string().optional(),
  win: z.boolean(),
  kills: z.number().optional(),
  deaths: z.number().optional(),
  assists: z.number().optional(),
});

export const MatchInfoSchema = z.object({
  gameId: z.number(),
  queueId: z.number(),
  gameStartTimestamp: z.number(),
  gameDuration: z.number(),
  participants: z.array(MatchParticipantSchema),
});

export const MatchSchema = z.object({
  metadata: z.object({
    matchId: z.string(),
    participants: z.array(z.string()),
  }),
  info: MatchInfoSchema,
});

export const MatchIdsSchema = z.array(z.string());

export type Account = z.infer<typeof AccountSchema>;
export type LeagueEntry = z.infer<typeof LeagueEntrySchema>;
export type MatchParticipant = z.infer<typeof MatchParticipantSchema>;
export type Match = z.infer<typeof MatchSchema>;
