<svelte:head>
  <title>How MMR Estimation Works — Methodology</title>
  <meta name="description" content="Three-tier methodology: LP win behavior, lobby composition analysis, and inverse-variance combination. Real confidence intervals, not fake precision." />
</svelte:head>

<div class="max-w-[780px] mx-auto px-6 py-16">
  <h1 class="text-3xl font-semibold text-zinc-50 mb-3">How the estimate works</h1>
  <p class="text-zinc-400 mb-12 text-lg">Three independent signals, combined with inverse-variance weighting. Each signal gets a confidence interval — the final estimate inherits all of them.</p>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">Tier 1 — LP win behavior</h2>
    <p class="text-zinc-400 leading-relaxed mb-4">
      The simplest signal: how are you doing relative to expected 50/50? If you're winning more than you lose, the LP system likely has your MMR set below your actual skill level. The gap signal is:
    </p>
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 font-mono text-sm text-zinc-300 mb-4">
      gap = K × (winrate − 0.5) × √n
    </div>
    <p class="text-zinc-500 text-sm leading-relaxed">
      K = 200. The uncertainty σ = max(60, 200/√n). With fewer than 11 games the signal is highly uncertain (σ ≥ 60). With 100+ games it stabilizes around σ ≈ 20. Apex tier accounts (Master+) skip Tier 1 entirely — LP is meaningless at that range.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">Tier 2 — Lobby composition</h2>
    <p class="text-zinc-400 leading-relaxed mb-4">
      We look at up to 20 recent ranked games. For each lobby we convert every participant's current rank to an MMR value, then weight opponents at 60% and teammates at 40% (matchmaking targets opponent skill). Games further in the past are exponentially down-weighted:
    </p>
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 font-mono text-sm text-zinc-300 mb-4">
      weight(daysAgo) = e<sup class="text-xs">−daysAgo/14</sup>
    </div>
    <p class="text-zinc-500 text-sm leading-relaxed">
      A game from 14 days ago counts at ≈37% of a game from today. Lobbies where more than 2 participants are unranked are skipped. The Tier 2 estimate uses effective sample size to set σ, so sparse recent data properly inflates uncertainty.
    </p>
    <p class="text-zinc-500 text-sm leading-relaxed mt-3">
      Apex tier accounts get σ × 1.5 because high-MMR players frequently appear in mixed-skill lobbies — the lobby signal is less reliable there.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">Combining the signals</h2>
    <p class="text-zinc-400 leading-relaxed mb-4">
      Each tier produces a (μ, σ) pair. We combine them with inverse-variance weighting — signals with smaller uncertainty get more weight:
    </p>
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 font-mono text-sm text-zinc-300 mb-4">
      w₁ = 1/σ₁² &nbsp; w₂ = 1/σ₂²<br />
      μ = (w₁μ₁ + w₂μ₂) / (w₁ + w₂)<br />
      σ = 1 / √(w₁ + w₂)
    </div>
    <p class="text-zinc-500 text-sm leading-relaxed">
      σ is floored at 40 to prevent overconfident estimates. The 90% CI is μ ± 1.645σ.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">Confidence levels</h2>
    <div class="space-y-3 text-sm">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 whitespace-nowrap">high</span>
        <p class="text-zinc-400">σ ≤ 60 and Tier 2 is available. The estimate has tight agreement between signals.</p>
      </div>
      <div class="flex items-start gap-3">
        <span class="mt-0.5 px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 whitespace-nowrap">medium</span>
        <p class="text-zinc-400">σ between 60 and 100 with Tier 2 available. Reasonable estimate, meaningful CI range.</p>
      </div>
      <div class="flex items-start gap-3">
        <span class="mt-0.5 px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-400 border border-red-700/40 whitespace-nowrap">low</span>
        <p class="text-zinc-400">σ &gt; 100, or Tier 2 is unavailable (less than 3 valid lobbies). The number is our best guess, but treat it as a rough indication only.</p>
      </div>
    </div>
  </section>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">LP efficiency</h2>
    <p class="text-zinc-400 leading-relaxed mb-3">
      When your estimated MMR is higher than your visible rank, the LP system compensates by giving you more LP per win and taking less per loss. We estimate the expected LP gain/loss from the gap:
    </p>
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 font-mono text-sm text-zinc-300 mb-3">
      avgLpGain ≈ 20 + gap × 0.03
    </div>
    <p class="text-zinc-500 text-sm">The break-even winrate tells you: at what winrate does your LP go up? If the system already rewards you, the bar is lower than 50%.</p>
  </section>

  <section class="mb-12">
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">Rank conversion</h2>
    <p class="text-zinc-400 leading-relaxed mb-3">
      Ranks map to MMR via a fixed scale. Iron IV = 400, each division adds 100, each tier adds 400. Apex tiers use LP directly (Master = 2400 + LP). This matches known MMR thresholds within ±50 MMR for Diamond and below.
    </p>
    <div class="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-4 text-sm text-zinc-300 overflow-x-auto">
      <table class="w-full text-left">
        <thead><tr class="text-zinc-500 text-xs"><th class="pb-2">Rank</th><th class="pb-2 text-right">MMR floor</th></tr></thead>
        <tbody class="space-y-1">
          {#each [['Iron IV', 400], ['Bronze IV', 800], ['Silver IV', 1000], ['Gold IV', 1200], ['Platinum IV', 1400], ['Emerald IV', 1600], ['Diamond IV', 1800], ['Master', 2000]] as [label, mmr]}
            <tr class="border-t border-zinc-800">
              <td class="py-1.5 text-zinc-400">{label}</td>
              <td class="py-1.5 text-right text-zinc-300">{mmr}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2 class="text-xl font-semibold text-zinc-200 mb-4">What this isn't</h2>
    <ul class="space-y-2 text-zinc-400 text-sm leading-relaxed">
      <li class="flex gap-2"><span class="text-red-400 mt-0.5">✗</span> Not a winrate multiplier. We don't take your win % and multiply by a magic number.</li>
      <li class="flex gap-2"><span class="text-red-400 mt-0.5">✗</span> Not the Riot internal MMR number. We can't read their database. This is an estimate from observable data.</li>
      <li class="flex gap-2"><span class="text-red-400 mt-0.5">✗</span> Not fake precision. 2,147 is a made-up number. We show you the range.</li>
      <li class="flex gap-2"><span class="text-emerald-400 mt-0.5">✓</span> An honest estimate with a real confidence interval, updated as you play.</li>
    </ul>
  </section>
</div>
