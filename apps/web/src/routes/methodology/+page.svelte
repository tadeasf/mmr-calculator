<svelte:head>
  <title>Methodology — three-tier MMR estimator</title>
  <meta name="description" content="Three-tier methodology: LP win behavior, lobby composition analysis, and inverse-variance combination. Real confidence intervals, not fake precision." />
</svelte:head>

<article class="max-w-[820px] mx-auto px-6 pt-16 pb-24">
  <div class="flex items-center gap-3 mb-8">
    <span class="label-mono">[ doc · 01 ]</span>
    <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
    <span class="label-mono">methodology</span>
  </div>

  <h1 class="display-serif text-[56px] sm:text-[72px] text-[var(--color-ink)] leading-[0.95] mb-6">
    How the estimate works.
  </h1>
  <p class="text-[var(--color-ink-muted)] text-lg leading-relaxed mb-12">
    Three independent signals, combined with inverse-variance weighting. Each signal carries its own
    confidence interval — the final estimate inherits both, then adds an irreducible-noise floor.
  </p>

  <section class="mb-16">
    <div class="flex items-baseline gap-4 mb-4">
      <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T1</span>
      <h2 class="display-serif text-3xl text-[var(--color-ink)]">LP win behavior</h2>
    </div>
    <p class="text-[var(--color-ink-muted)] leading-relaxed mb-5">
      The simplest signal: how is the matchmaker treating you relative to a 50% target win rate?
      Deviation from 50%, scaled by sample size, is a noisy but unbiased estimate of how far your
      MMR sits from your bracket's median.
    </p>
    <pre class="surface-deep p-5 font-mono text-sm text-[var(--color-ink-muted)] mb-4 overflow-x-auto"><span class="text-[var(--color-ink)]">gap</span> = K × (winrate − 0.5) × √n
<span class="text-[var(--color-ink-faint)]">σ</span>   = max(60, 200 / √n)</pre>
    <p class="text-[var(--color-ink-faint)] text-sm leading-relaxed">
      K = 200, calibrated against accounts with known peak MMR. Below 11 games, σ ≥ 60 — the
      signal is too noisy to reduce uncertainty further. Above 100 games it stabilises around
      σ ≈ 20. Apex tier accounts skip Tier 1 entirely; LP loses meaning at the top of the ladder.
    </p>
  </section>

  <section class="mb-16">
    <div class="flex items-baseline gap-4 mb-4">
      <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T2</span>
      <h2 class="display-serif text-3xl text-[var(--color-ink)]">Lobby composition</h2>
    </div>
    <p class="text-[var(--color-ink-muted)] leading-relaxed mb-5">
      The strong signal. We pull up to 20 recent ranked games. For every other participant we
      look up <em class="not-italic font-serif text-[var(--color-ink)]">their current rank</em>,
      convert it to MMR, and aggregate into a recency-weighted lobby average. Opponents weigh
      more than teammates because matchmaking targets opponent skill.
    </p>
    <pre class="surface-deep p-5 font-mono text-sm text-[var(--color-ink-muted)] mb-4 overflow-x-auto"><span class="text-[var(--color-ink)]">weight(d)</span>      = e^(−d / 14)            <span class="text-[var(--color-ink-faint)]"># days-ago decay</span>
<span class="text-[var(--color-ink)]">opp_weight</span>     = 0.6
<span class="text-[var(--color-ink)]">team_weight</span>    = 0.4
<span class="text-[var(--color-ink)]">μ₂</span> = Σ wᵢ · lobbyMmrᵢ / Σ wᵢ</pre>
    <p class="text-[var(--color-ink-faint)] text-sm leading-relaxed">
      A game from 14 days ago counts at ≈37% of a game from today. Lobbies with more than 2
      unranked participants are skipped — they distort the average. σ is set from effective
      sample size, so sparse data correctly inflates uncertainty. Apex accounts get σ × 1.5 to
      reflect the wider rank spread of high-MMR lobbies.
    </p>
  </section>

  <section class="mb-16">
    <div class="flex items-baseline gap-4 mb-4">
      <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T3</span>
      <h2 class="display-serif text-3xl text-[var(--color-ink)]">Combining the signals</h2>
    </div>
    <p class="text-[var(--color-ink-muted)] leading-relaxed mb-5">
      Each tier produces a (μ, σ) pair. Inverse-variance weighting gives more weight to whichever
      tier is more confident for this specific account. New players with sparse history lean on
      Tier 1; steady-state mid-rank accounts lean on Tier 2.
    </p>
    <pre class="surface-deep p-5 font-mono text-sm text-[var(--color-ink-muted)] mb-4 overflow-x-auto"><span class="text-[var(--color-ink)]">w₁</span> = 1 / σ₁²    <span class="text-[var(--color-ink)]">w₂</span> = 1 / σ₂²
<span class="text-[var(--color-ink)]">μ</span>  = (w₁ · μ₁ + w₂ · μ₂) / (w₁ + w₂)
<span class="text-[var(--color-ink)]">σ</span>  = √(1 / (w₁ + w₂))           <span class="text-[var(--color-ink-faint)]"># floored at 40</span></pre>
    <p class="text-[var(--color-ink-faint)] text-sm leading-relaxed">
      σ is floored at 40 to prevent overconfident estimates. The 90% confidence interval is
      <span class="numeric text-[var(--color-ink)]">μ ± 1.645σ</span>.
    </p>
  </section>

  <section class="mb-16">
    <h2 class="display-serif text-3xl text-[var(--color-ink)] mb-6">Confidence levels</h2>
    <div class="surface divide-y divide-[var(--color-rule)]">
      <div class="flex items-start gap-5 p-5">
        <span class="chip chip-good w-20 justify-center shrink-0">high</span>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          σ ≤ 60 with Tier 2 available. Tight agreement between signals — the estimate is your
          best public-data approximation of Riot's internal MMR.
        </p>
      </div>
      <div class="flex items-start gap-5 p-5">
        <span class="chip chip-warn w-20 justify-center shrink-0">medium</span>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          σ between 60 and 100, Tier 2 present. A meaningful CI range. Use the midpoint with caution.
        </p>
      </div>
      <div class="flex items-start gap-5 p-5">
        <span class="chip chip-bad w-20 justify-center shrink-0">low</span>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
          σ &gt; 100, or Tier 2 has fewer than 3 valid lobbies. The point estimate is our best
          guess; treat it as a rough indication, not a number to argue about.
        </p>
      </div>
    </div>
  </section>

  <section class="mb-16">
    <h2 class="display-serif text-3xl text-[var(--color-ink)] mb-6">Rank conversion</h2>
    <p class="text-[var(--color-ink-muted)] leading-relaxed mb-5">
      Ranks map onto MMR via a fixed ladder: Iron IV = 400, each division +100, each tier +400.
      Apex tiers use LP directly (Master = 2,400 + LP). Calibrated to within ±50 MMR for Diamond
      and below.
    </p>
    <div class="surface overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b border-[var(--color-rule)]">
          <tr>
            <th class="text-left p-3 label-mono">rank</th>
            <th class="text-right p-3 label-mono">mmr floor</th>
          </tr>
        </thead>
        <tbody>
          {#each [['Iron IV', 400], ['Bronze IV', 800], ['Silver IV', 1000], ['Gold IV', 1200], ['Platinum IV', 1400], ['Emerald IV', 1600], ['Diamond IV', 1800], ['Master', 2000]] as [label, mmr]}
            <tr class="border-t border-[var(--color-rule)] hover:bg-[var(--color-surface-2)] transition-colors">
              <td class="p-3 text-[var(--color-ink)]">{label}</td>
              <td class="p-3 text-right numeric text-[var(--color-ink-muted)]">{mmr}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="mb-16">
    <h2 class="display-serif text-3xl text-[var(--color-ink)] mb-6">LP efficiency</h2>
    <p class="text-[var(--color-ink-muted)] leading-relaxed mb-5">
      When estimated MMR exceeds visible rank, the LP system compensates: more LP per win, less
      taken per loss. We approximate the expected gain/loss from the gap.
    </p>
    <pre class="surface-deep p-5 font-mono text-sm text-[var(--color-ink-muted)] mb-4 overflow-x-auto"><span class="text-[var(--color-ink)]">avgLpGain</span> ≈ 20 + gap × 0.03
<span class="text-[var(--color-ink)]">avgLpLoss</span> ≈ 20 − gap × 0.03</pre>
    <p class="text-[var(--color-ink-faint)] text-sm leading-relaxed">
      The break-even winrate tells you: at what WR does LP go up? If LP rewards you, the bar is
      lower than 50%. If it punishes you, higher.
    </p>
  </section>

  <section>
    <h2 class="display-serif text-3xl text-[var(--color-ink)] mb-6">What this isn't</h2>
    <ul class="space-y-3 text-sm">
      <li class="flex items-start gap-3 text-[var(--color-ink-muted)]">
        <span class="text-[var(--color-bad)] mt-0.5 numeric">✗</span>
        <span>Not a winrate multiplier. We don't take WR and multiply by a magic number.</span>
      </li>
      <li class="flex items-start gap-3 text-[var(--color-ink-muted)]">
        <span class="text-[var(--color-bad)] mt-0.5 numeric">✗</span>
        <span>Not Riot's internal MMR readout. We can't read their database.</span>
      </li>
      <li class="flex items-start gap-3 text-[var(--color-ink-muted)]">
        <span class="text-[var(--color-bad)] mt-0.5 numeric">✗</span>
        <span>Not fake precision. <span class="numeric text-[var(--color-ink)]">2,147</span> is a made-up number; we show the range.</span>
      </li>
      <li class="flex items-start gap-3 text-[var(--color-ink-muted)] pt-3 border-t border-[var(--color-rule)]">
        <span class="text-[var(--color-good)] mt-0.5 numeric">✓</span>
        <span>An honest estimate with a calibrated 90% confidence interval, updated every time you play.</span>
      </li>
    </ul>
  </section>
</article>
