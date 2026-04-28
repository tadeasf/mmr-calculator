<svelte:head>
  <title>Privacy — Climb Lab</title>
  <meta name="description" content="What Climb Lab stores, why, and how to delete it." />
</svelte:head>

<article class="max-w-[820px] mx-auto px-6 pt-16 pb-24">
  <div class="flex items-center gap-3 mb-8">
    <span class="label-mono">[ doc · 04 ]</span>
    <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
    <span class="label-mono">privacy</span>
  </div>

  <h1 class="display-serif text-[56px] sm:text-[72px] text-[var(--color-ink)] leading-[0.95] mb-6">
    Privacy notice.
  </h1>
  <p class="text-[var(--color-ink-muted)] text-lg leading-relaxed mb-12">
    Climb Lab is a free, non-commercial tool. We store the minimum data required to compute a climb
    forecast, nothing more.
  </p>

  <section class="mb-12">
    <h2 class="display-serif text-2xl text-[var(--color-ink)] mb-4">What we store</h2>
    <ul class="space-y-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
      <li class="flex items-start gap-3"><span class="text-[var(--color-signal-strong)] mt-1">·</span><span><strong class="text-[var(--color-ink)]">Riot account identifier (PUUID)</strong> for accounts looked up through Climb Lab. Required to fetch ranked entries and match history.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-signal-strong)] mt-1">·</span><span><strong class="text-[var(--color-ink)]">Riot ID + tagline + region</strong> as supplied in the lookup form, so cached forecasts can be retrieved quickly.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-signal-strong)] mt-1">·</span><span><strong class="text-[var(--color-ink)]">Ranked entries</strong> (tier, division, LP, wins, losses) per queue, fetched from Riot's <a class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4" href="https://developer.riotgames.com">League V4</a> endpoint.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-signal-strong)] mt-1">·</span><span><strong class="text-[var(--color-ink)]">Match summaries</strong> (match ID, queue, timestamps, participant PUUIDs) for the last 20 ranked games. Used for lobby-composition analysis.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-signal-strong)] mt-1">·</span><span><strong class="text-[var(--color-ink)]">Computed forecasts</strong> (rank-bracket projection, ETAs) cached for 1 hour to reduce Riot API load.</span></li>
    </ul>
  </section>

  <section class="mb-12">
    <h2 class="display-serif text-2xl text-[var(--color-ink)] mb-4">What we don't store</h2>
    <ul class="space-y-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
      <li class="flex items-start gap-3"><span class="text-[var(--color-bad)] mt-1">×</span><span>No email addresses, passwords, IP addresses, or device identifiers.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-bad)] mt-1">×</span><span>No tracking cookies, analytics scripts, or third-party trackers.</span></li>
      <li class="flex items-start gap-3"><span class="text-[var(--color-bad)] mt-1">×</span><span>No game performance details beyond what's required for lobby-composition analysis (kill counts, items, runes are not stored).</span></li>
    </ul>
  </section>

  <section class="mb-12">
    <h2 class="display-serif text-2xl text-[var(--color-ink)] mb-4">Where the data lives</h2>
    <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
      All data is stored in Cloudflare D1 (SQLite) and Cloudflare KV, both running inside Cloudflare's
      edge network. No personal data leaves Cloudflare's infrastructure.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="display-serif text-2xl text-[var(--color-ink)] mb-4">Deletion</h2>
    <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
      To request deletion of your account's stored records, email
      <a class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4" href="mailto:tadeas@tadeasfort.dev">tadeas@tadeasfort.dev</a>
      with your Riot ID + tagline + region. Records are removed within 7 days. You may also request that
      your account be excluded from future lookups.
    </p>
  </section>

  <section>
    <h2 class="display-serif text-2xl text-[var(--color-ink)] mb-4">Riot Games' role</h2>
    <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
      Climb Lab queries Riot Games' public developer APIs under the
      <a class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4" href="https://developer.riotgames.com/terms">Riot Games API Terms of Service</a>.
      Riot Games' own privacy practices apply to the underlying account data —
      <a class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4" href="https://www.riotgames.com/en/privacy-notice">Riot privacy notice</a>.
    </p>
  </section>
</article>
