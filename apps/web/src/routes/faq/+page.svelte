<svelte:head>
  <title>FAQ — MMR Estimator</title>
  <meta name="description" content="Frequently asked questions about MMR estimation, confidence intervals, and how this tool differs from other MMR checkers." />
</svelte:head>

<div class="max-w-[780px] mx-auto px-6 py-16">
  <h1 class="text-3xl font-semibold text-zinc-50 mb-3">FAQ</h1>
  <p class="text-zinc-400 mb-12">Things people actually ask.</p>

  <div class="space-y-8">
    <div>
      <h3 class="text-zinc-200 font-medium mb-2">Why does your number differ from other MMR sites?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        Most MMR sites use a winrate-based multiplier — they take your win rate, multiply by some constant, and call it your MMR. That's not how Riot's matchmaking works. We use lobby composition: who you're actually being matched against. Our number comes from the people in your games, not a formula applied to your stats page.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">Why is my confidence interval so wide?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        Wide CI means we don't have enough data to be precise. This happens when: you have very few ranked games, your recent games had many unranked participants (which we skip), or your LP behavior has been inconsistent. Play more games in the same queue to improve the estimate.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">What does "refreshing" mean?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        Another request already started computing your MMR. We're showing you cached data while it finishes. The page will automatically reload once the fresh estimate is ready (usually within 15–30 seconds).
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">How fresh is the data?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        Results are cached for 1 hour by default. If you've played games recently, use the Refresh button to force a fresh computation. Fresh computation pulls the last 20 ranked games directly from Riot's API.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">Why does my MMR seem lower than my rank?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        If your estimated MMR is lower than your visible rank MMR, it means the lobby data suggests you're being matched with players below your rank level. This can happen after a hotstreak that pushed you up faster than your MMR followed — common in early season placement games.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">What does the "smurf signals" badge mean?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        A combination of very high winrate, few games, and a large MMR gap relative to visible rank can indicate a smurf account. The badge appears when at least 3 signals align. It doesn't prove smurfing — some players are just on a streak — but the estimate may be less reliable for accounts with this badge because the LP system hasn't caught up yet.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">Is this affiliated with Riot Games?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        No. This tool uses the Riot Games API under their developer terms but is not endorsed by or affiliated with Riot Games. All League of Legends trademarks are property of Riot Games, Inc.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">How accurate is the estimate, really?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        The 90% confidence interval is calibrated to contain the true MMR 90% of the time — assuming Riot's matchmaking is using MMR the way we model it. In practice, accuracy degrades for: very new accounts (Riot uses provisional MMR), players who primarily play ARAM (rank MMR and game MMR are separate), and accounts with very few games (n &lt; 10). The confidence level badge tells you how much to trust any specific estimate.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">My LP gain/loss doesn't match the estimate.</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        LP gain is also affected by provisional status, seasonal adjustments, and Riot's own internal variance. Our LP efficiency is an approximation from the MMR gap, not a readout of Riot's internal LP formula. It's directionally correct but not exact.
      </p>
    </div>

    <div>
      <h3 class="text-zinc-200 font-medium mb-2">Does this work for Flex queue?</h3>
      <p class="text-zinc-400 text-sm leading-relaxed">
        Yes — select Flex when searching. Flex MMR is tracked separately from Solo/Duo in our system. Lobby composition analysis applies to both. Note that Flex lobbies often have larger rank spreads, which tends to push the confidence level to medium or low.
      </p>
    </div>
  </div>
</div>
