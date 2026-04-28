<script lang="ts">
import { goto } from '$app/navigation';

let riotId = $state('');
let tag = $state('');
let region = $state('euw');
let queue = $state('solo');

const REGIONS = [
  { value: 'na', label: 'NA' },
  { value: 'euw', label: 'EUW' },
  { value: 'eune', label: 'EUNE' },
  { value: 'kr', label: 'KR' },
  { value: 'br', label: 'BR' },
  { value: 'jp', label: 'JP' },
  { value: 'oce', label: 'OCE' },
  { value: 'ru', label: 'RU' },
  { value: 'tr', label: 'TR' },
  { value: 'lan', label: 'LAN' },
  { value: 'las', label: 'LAS' },
];

function onSubmit(e: SubmitEvent) {
  e.preventDefault();
  if (!riotId.trim() || !tag.trim()) return;
  goto(
    `/summoner/${region}/${encodeURIComponent(riotId.trim())}-${encodeURIComponent(tag.trim())}?queue=${queue}`,
  );
}
</script>

<svelte:head>
  <title>Climb Lab — ranked-progression forecasts for League of Legends</title>
  <meta name="description" content="See the rank you can realistically reach this season, the games it'll take at your current pace, and where matchmaking is treating you fairly. Public-data forecast with calibrated confidence intervals." />
</svelte:head>

<div class="max-w-[1180px] mx-auto px-6 pt-16 pb-24">
  <section class="relative">
    <div class="grid grid-cols-12 gap-8 items-end">
      <div class="col-span-12 lg:col-span-7">
        <div class="flex items-center gap-3 mb-6 rise" style="animation-delay: 0ms">
          <span class="label-mono">[ instrument · 01 ]</span>
          <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
          <span class="label-mono">ranked trajectory forecast</span>
        </div>

        <h1 class="display-serif text-[64px] sm:text-[88px] lg:text-[112px] text-[var(--color-ink)] mb-2 rise" style="animation-delay: 80ms">
          How far can you
          <span class="text-[var(--color-signal-strong)]">climb</span>
          this season?
        </h1>

        <p class="text-[15px] text-[var(--color-ink-muted)] leading-[1.7] max-w-xl mt-8 rise" style="animation-delay: 200ms">
          A forecast of the rank you can realistically reach, given your current rank, recent
          opponents, and LP pace. We pull your last 20 ranked games, look up the
          <em class="font-serif text-[var(--color-ink)] not-italic">current rank of every other participant</em>, weight opponents over teammates,
          and project games-to-target with a calibrated confidence interval — never a fake-precise rating number.
        </p>
      </div>

      <div class="col-span-12 lg:col-span-5 rise" style="animation-delay: 320ms">
        <div class="surface p-6 relative tick-rule">
          <div class="flex items-baseline justify-between mb-4">
            <span class="label-mono">specimen forecast</span>
            <span class="label-mono">euw · solo</span>
          </div>

          <p class="label-mono mb-2">[ projected ceiling ]</p>
          <p class="display-serif text-3xl text-[var(--color-ink)] leading-tight mb-1">Diamond IV</p>
          <p class="numeric text-xs text-[var(--color-ink-faint)] mb-6">
            confidence high &nbsp;·&nbsp; CI<sub class="numeric">90</sub> Emerald II — Diamond III
          </p>

          <div class="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-rule)]">
            <div>
              <p class="label-mono mb-1">eta</p>
              <p class="numeric text-sm text-[var(--color-ink)]">≈ 38<span class="text-[var(--color-ink-faint)]"> games</span></p>
            </div>
            <div>
              <p class="label-mono mb-1">days</p>
              <p class="numeric text-sm text-[var(--color-ink)]">≈ 8</p>
            </div>
            <div>
              <p class="label-mono mb-1">lp pace</p>
              <p class="numeric text-sm text-[var(--color-ink)]">+2.4<span class="text-[var(--color-ink-faint)]"> /game</span></p>
            </div>
          </div>

          <span class="absolute -top-2 -right-2 chip chip-signal">demo</span>
        </div>
      </div>
    </div>
  </section>

  <section class="mt-20 rise" style="animation-delay: 420ms">
    <div class="flex items-center gap-3 mb-6">
      <span class="label-mono">[ query · 02 ]</span>
      <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
      <span class="label-mono">enter target</span>
    </div>

    <form onsubmit={onSubmit} class="surface p-6 sm:p-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div class="lg:col-span-5">
          <label class="block label-mono-strong mb-2" for="riot-id">riot · id</label>
          <input
            id="riot-id"
            type="text"
            bind:value={riotId}
            placeholder="Faker"
            autocomplete="off"
            class="field w-full"
          />
        </div>

        <div class="lg:col-span-2">
          <label class="block label-mono-strong mb-2" for="tag">tag</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] font-mono text-sm">#</span>
            <input
              id="tag"
              type="text"
              bind:value={tag}
              placeholder="KR1"
              autocomplete="off"
              class="field w-full pl-7 uppercase"
            />
          </div>
        </div>

        <div class="lg:col-span-2">
          <label class="block label-mono-strong mb-2" for="region">region</label>
          <select id="region" bind:value={region} class="field w-full">
            {#each REGIONS as r}
              <option value={r.value} class="bg-[var(--color-surface-2)]">{r.label}</option>
            {/each}
          </select>
        </div>

        <div class="lg:col-span-2">
          <label class="block label-mono-strong mb-2" for="queue">queue</label>
          <select id="queue" bind:value={queue} class="field w-full">
            <option value="solo" class="bg-[var(--color-surface-2)]">Solo / Duo</option>
            <option value="flex" class="bg-[var(--color-surface-2)]">Flex 5v5</option>
          </select>
        </div>

        <div class="lg:col-span-1">
          <button type="submit" class="btn-primary w-full">Run →</button>
        </div>
      </div>

      <p class="label-mono mt-6 leading-relaxed">
        cold lookups take 30–120s — we batch Riot calls across multiple Worker invocations to stay under free-tier subrequest limits.
      </p>
    </form>
  </section>

  <section class="mt-20">
    <div class="flex items-center gap-3 mb-8">
      <span class="label-mono">[ method · 03 ]</span>
      <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
      <span class="label-mono">three independent signals</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--color-rule)] surface overflow-hidden">
      <article class="bg-[var(--color-surface-1)] p-6 sm:p-7">
        <div class="flex items-baseline justify-between mb-4">
          <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T1</span>
          <span class="label-mono">cost: 1 call</span>
        </div>
        <h3 class="display-serif text-2xl text-[var(--color-ink)] mb-3">Win behavior</h3>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">
          Deviation from a 50% win rate, scaled by sample size. Cheap, always available, σ stays large until n is high.
        </p>
        <code class="block text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-sm px-3 py-2">
          Δ = K × (wr − 0.5) × √n
        </code>
      </article>

      <article class="bg-[var(--color-surface-1)] p-6 sm:p-7">
        <div class="flex items-baseline justify-between mb-4">
          <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T2</span>
          <span class="label-mono">cost: ~180 calls</span>
        </div>
        <h3 class="display-serif text-2xl text-[var(--color-ink)] mb-3">Lobby composition</h3>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">
          Current rank of all 9 other participants in your last 20 games. Opponents weighted 0.6 vs teammates 0.4. Recency-decayed at exp(−d/14).
        </p>
        <code class="block text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-sm px-3 py-2">
          μ₂ = Σ wᵢ · lobbyRatingᵢ
        </code>
      </article>

      <article class="bg-[var(--color-surface-1)] p-6 sm:p-7">
        <div class="flex items-baseline justify-between mb-4">
          <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T3</span>
          <span class="label-mono">cost: 0</span>
        </div>
        <h3 class="display-serif text-2xl text-[var(--color-ink)] mb-3">Inverse-variance forecast</h3>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">
          Combine T1 and T2 with weights wᵢ = 1/σᵢ², then convert into a games-to-target projection. The confident tier dominates; final σ floored at 40 — irreducible matchmaker noise.
        </p>
        <code class="block text-xs font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-sm px-3 py-2">
          σ = √(1 / Σ 1/σᵢ²)
        </code>
      </article>
    </div>
  </section>

  <section class="mt-24 max-w-3xl">
    <div class="flex items-center gap-3 mb-6">
      <span class="label-mono">[ note · 04 ]</span>
      <span class="h-px w-16 bg-[var(--color-rule)]"></span>
    </div>
    <p class="display-serif text-[40px] sm:text-[52px] text-[var(--color-ink)] leading-[1.05]">
      We show you a <span class="text-[var(--color-signal-strong)]">rank range</span>, not <span class="line-through decoration-[var(--color-bad)]/60">a fake-precise number</span>.
    </p>
    <p class="text-[15px] text-[var(--color-ink-muted)] leading-relaxed mt-6">
      The honest answer to "where am I really?" is a rank bracket with a stated confidence — and an
      ETA to your goal at your current LP pace. Climb Lab returns rank-bracket projections,
      <em class="not-italic font-serif text-[var(--color-ink)]">never</em> a single rating value, because
      the underlying skill changes day to day, lobby to lobby.
      <a href="/methodology" class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4 decoration-1">Read the methodology →</a>
    </p>
  </section>
</div>
