<script lang="ts">
const FAQ = [
  {
    q: 'What does Climb Lab actually tell me?',
    a: "The rank you can realistically reach this season at your current pace, the games it'll take, and where matchmaking quality is helping or hurting. Outputs are rank brackets and ETAs — never a fake-precise rating number.",
  },
  {
    q: 'Why is my confidence interval so wide?',
    a: "Wide CI means we don't have enough data to be precise. This happens when: you have very few ranked games, your recent games had many unranked participants (which we skip), or your LP behavior has been inconsistent. Play more games in the same queue to tighten the projection.",
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
    q: 'Why does my projected ceiling differ from my visible rank?',
    a: "If the projected ceiling sits above your visible rank, recent lobby quality suggests you're playing against a stronger field than your rank reflects — climb is likely. If it sits below, the matchmaker is matching you with a slightly easier field than your rank, suggesting recent performance hasn't kept pace. Common after hotstreaks or a slump.",
  },
  {
    q: 'Is this affiliated with Riot Games?',
    a: "No. Climb Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games. All League of Legends trademarks are property of Riot Games, Inc. Data is accessed through the public Riot Games API under their developer terms.",
  },
  {
    q: 'How accurate is the projection, really?',
    a: 'The 90% CI is calibrated to contain the realistic ceiling 90% of the time, assuming matchmaking quality stays roughly consistent with the last 20 games. Accuracy degrades for: very new accounts (provisional matchmaking), ARAM-only players (separate queue), and accounts with fewer than ~10 ranked games. The confidence chip tells you how much to trust each specific projection.',
  },
  {
    q: "My LP gain/loss doesn't match the predicted efficiency.",
    a: "LP gain is also affected by provisional status, seasonal adjustments, and Riot's internal variance. Our LP efficiency model is an approximation from observed gain/loss, not a readout of Riot's formula. Directionally correct; not exact.",
  },
  {
    q: 'Does this work for Flex queue?',
    a: 'Yes — pick Flex when you query. Flex matchmaking is tracked separately from Solo/Duo. Lobby composition still applies, though Flex lobbies have wider rank spreads, so confidence often lands at medium or low.',
  },
  {
    q: 'Why no skill-rating number on the result page?',
    a: 'By design. The internal estimate is a (μ, σ) pair, but exposing it as a single number creates the illusion of precision — and Riot has been clear that its internal matchmaking values are intentionally not public. Climb Lab returns rank-bracket forecasts and ETAs, which are more honest and more useful.',
  },
];
</script>

<svelte:head>
  <title>FAQ — Climb Lab</title>
  <meta name="description" content="Things people actually ask about Climb Lab: confidence intervals, data freshness, accuracy bounds, and how the climb forecast differs from a single skill-rating readout." />
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
