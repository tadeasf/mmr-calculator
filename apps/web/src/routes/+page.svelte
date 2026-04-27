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
  <title>MMR Estimator — honest matchmaking-rating analytics for League of Legends</title>
  <meta name="description" content="A three-tier inverse-variance estimator. Win behavior, lobby composition, and combined confidence intervals — no winrate multipliers, no fake-precise numbers." />
</svelte:head>

<div class="max-w-[1180px] mx-auto px-6 pt-16 pb-24">
  <section class="relative">
    <div class="grid grid-cols-12 gap-8 items-end">
      <div class="col-span-12 lg:col-span-7">
        <div class="flex items-center gap-3 mb-6 rise" style="animation-delay: 0ms">
          <span class="label-mono">[ instrument · 01 ]</span>
          <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
          <span class="label-mono">three-tier estimator</span>
        </div>

        <h1 class="display-serif text-[64px] sm:text-[88px] lg:text-[112px] text-[var(--color-ink)] mb-2 rise" style="animation-delay: 80ms">
          What's your
          <span class="text-[var(--color-signal-strong)]">actual</span>
          MMR?
        </h1>

        <p class="text-[15px] text-[var(--color-ink-muted)] leading-[1.7] max-w-xl mt-8 rise" style="animation-delay: 200ms">
          Not a winrate multiplier with extra steps. We pull your last 20 ranked games, look up the
          <em class="font-serif text-[var(--color-ink)] not-italic">current rank of every other participant</em>, weight opponents over teammates,
          and combine that with your LP behavior. Output: <span class="numeric text-[var(--color-ink)]">μ ± σ</span> with a calibrated 90% confidence interval — not a single fake-precise number.
        </p>
      </div>

      <div class="col-span-12 lg:col-span-5 rise" style="animation-delay: 320ms">
        <div class="surface p-6 relative tick-rule">
          <div class="flex items-baseline justify-between mb-4">
            <span class="label-mono">specimen output</span>
            <span class="label-mono">euw · solo</span>
          </div>

          <div class="flex items-baseline gap-3 mb-1">
            <span class="numeric text-[56px] text-[var(--color-ink)] leading-none">2,148</span>
            <span class="numeric text-[var(--color-ink-faint)] text-sm">MMR</span>
          </div>
          <p class="numeric text-xs text-[var(--color-ink-faint)] mb-6">
            CI<sub class="numeric">90</sub> 2,068 — 2,228 &nbsp;·&nbsp; σ = 49
          </p>

          <div class="relative h-7 mb-6">
            <div class="absolute inset-x-0 top-1/2 h-px bg-[var(--color-rule)]"></div>
            <div class="absolute top-1/2 left-[24%] right-[24%] h-2 -mt-1 bg-[var(--color-signal-strong)]/15 border-l border-r border-[var(--color-signal-strong)]"></div>
            <div class="absolute top-1/2 left-1/2 w-[2px] h-5 -mt-2.5 -ml-px bg-[var(--color-signal-strong)]"></div>
            <div class="absolute -bottom-0.5 left-[24%] label-mono numeric -translate-x-1/2">2068</div>
            <div class="absolute -bottom-0.5 right-[24%] label-mono numeric translate-x-1/2">2228</div>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-rule)]">
            <div>
              <p class="label-mono mb-1">tier 1 · win</p>
              <p class="numeric text-sm text-[var(--color-ink)]">+38<span class="text-[var(--color-ink-faint)]"> ±62</span></p>
            </div>
            <div>
              <p class="label-mono mb-1">tier 2 · lobby</p>
              <p class="numeric text-sm text-[var(--color-ink)]">2154<span class="text-[var(--color-ink-faint)]"> ±55</span></p>
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
          μ₂ = Σ wᵢ · lobbyMmrᵢ
        </code>
      </article>

      <article class="bg-[var(--color-surface-1)] p-6 sm:p-7">
        <div class="flex items-baseline justify-between mb-4">
          <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T3</span>
          <span class="label-mono">cost: 0</span>
        </div>
        <h3 class="display-serif text-2xl text-[var(--color-ink)] mb-3">Inverse-variance</h3>
        <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-4">
          Combine T1 and T2 with weights wᵢ = 1/σᵢ². Confident tier dominates. Final σ floored at 40 MMR — irreducible matchmaker noise.
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
      We show you <span class="text-[var(--color-signal-strong)]">2,148 ± 80</span>, not <span class="line-through decoration-[var(--color-bad)]/60">2,147</span>.
    </p>
    <p class="text-[15px] text-[var(--color-ink-muted)] leading-relaxed mt-6">
      Anyone showing you a single fake-precise MMR number is making it up. The number changes day to day,
      lobby to lobby, depending on who Riot's matchmaker pairs you with. The honest answer is a range with
      a stated confidence — and that's what this tool returns.
      <a href="/methodology" class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4 decoration-1">Read the methodology →</a>
    </p>
  </section>
</div>
