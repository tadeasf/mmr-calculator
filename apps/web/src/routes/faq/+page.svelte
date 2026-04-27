<script lang="ts">
const FAQ = [
  {
    q: 'Why does your number differ from other MMR sites?',
    a: "Most sites use a winrate-based multiplier — they take your WR, multiply by a constant, call it MMR. That's not how Riot's matchmaker works. Our number comes from the people in your lobbies, not a formula applied to your stats page.",
  },
  {
    q: 'Why is my confidence interval so wide?',
    a: "Wide CI means we don't have enough data to be precise. This happens when: you have very few ranked games, your recent games had many unranked participants (which we skip), or your LP behavior has been inconsistent. Play more games in the same queue to tighten the estimate.",
  },
  {
    q: 'Why does the page say "Pulling your match history" for so long?',
    a: "A cold lookup makes ~200 Riot API calls. Cloudflare's free tier caps a single Worker invocation at 50 outbound requests, so we chunk the work across multiple Durable Object alarms. Each alarm is a fresh subrequest budget. The progress bar reflects real per-match progress.",
  },
  {
    q: 'How fresh is the data?',
    a: 'Results are cached for 1 hour by default. A "Refresh" button on the result page kicks off a fresh job that re-pulls your last 20 games directly from Riot. Cached results render instantly.',
  },
  {
    q: 'Why does my MMR seem lower than my visible rank?',
    a: "If estimated MMR sits below your visible rank MMR, the lobby data suggests you're being matched with players a tick below your rank. This is common after a hotstreak that pushed you up faster than the matchmaker followed — typical in early-season placements.",
  },
  {
    q: 'What does the "smurf signals" badge mean?',
    a: "A combination of very high winrate, few games, and a large MMR-vs-rank gap can indicate a smurf. The badge appears when the score crosses a threshold. It doesn't prove smurfing — some players are just on a streak — but the LP system probably hasn't caught up yet, so estimates may shift a lot game-to-game.",
  },
  {
    q: 'Is this affiliated with Riot Games?',
    a: 'No. This tool uses the Riot Games API under their developer terms and is not endorsed by or affiliated with Riot Games. All League of Legends trademarks are property of Riot Games, Inc.',
  },
  {
    q: 'How accurate is the estimate, really?',
    a: "The 90% CI is calibrated to contain the true MMR 90% of the time, assuming Riot's matchmaking uses MMR the way we model it. Accuracy degrades for: very new accounts (provisional MMR), ARAM-only players (separate ladder), and accounts with fewer than ~10 games. The confidence chip tells you how much to trust each specific estimate.",
  },
  {
    q: "My LP gain/loss doesn't match the predicted efficiency.",
    a: "LP gain is also affected by provisional status, seasonal adjustments, and Riot's internal variance. Our LP efficiency is an approximation from the MMR gap, not a readout of Riot's formula. Directionally correct; not exact.",
  },
  {
    q: 'Does this work for Flex queue?',
    a: 'Yes — pick Flex when you query. Flex MMR is tracked separately from Solo/Duo. Lobby composition still applies, though Flex lobbies have wider rank spreads, so confidence often lands at medium or low.',
  },
];
</script>

<svelte:head>
  <title>FAQ — MMR Estimator</title>
  <meta name="description" content="Things people actually ask: confidence intervals, data freshness, accuracy bounds, and how this differs from winrate-multiplier MMR sites." />
</svelte:head>

<div class="max-w-[820px] mx-auto px-6 pt-16 pb-24">
  <div class="flex items-center gap-3 mb-8">
    <span class="label-mono">[ doc · 02 ]</span>
    <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
    <span class="label-mono">FAQ</span>
  </div>

  <h1 class="display-serif text-[56px] sm:text-[72px] text-[var(--color-ink)] leading-[0.95] mb-6">
    Things people actually ask.
  </h1>
  <p class="text-[var(--color-ink-muted)] text-lg leading-relaxed mb-12">
    Direct answers, no marketing copy. If you want the math, that's on
    <a href="/methodology" class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4">methodology</a>.
  </p>

  <div class="surface divide-y divide-[var(--color-rule)]">
    {#each FAQ as { q, a }, i}
      <details class="group">
        <summary class="cursor-pointer list-none p-5 flex items-start gap-4 hover:bg-[var(--color-surface-2)] transition-colors">
          <span class="numeric label-mono pt-0.5 shrink-0">[{(i + 1).toString().padStart(2, '0')}]</span>
          <span class="display-serif text-xl text-[var(--color-ink)] flex-1 leading-tight">{q}</span>
          <span class="numeric text-[var(--color-ink-faint)] group-open:rotate-90 transition-transform shrink-0 mt-1">▸</span>
        </summary>
        <div class="px-5 pb-5 pl-[3.25rem]">
          <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">{a}</p>
        </div>
      </details>
    {/each}
  </div>
</div>
