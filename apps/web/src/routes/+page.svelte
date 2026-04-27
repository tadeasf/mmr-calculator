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
  <title>MMR Estimator — Honest League of Legends MMR Calculator</title>
  <meta name="description" content="Estimate your League of Legends hidden MMR with confidence intervals. Three-tier methodology using LP behavior and lobby composition analysis." />
</svelte:head>

<div class="max-w-[1100px] mx-auto px-6 py-20">
  <div class="max-w-xl mx-auto text-center">
    <h1 class="text-4xl font-semibold tracking-tight text-zinc-50 mb-4">
      What's your actual MMR?
    </h1>
    <p class="text-zinc-400 mb-10 text-lg leading-relaxed">
      Not a winrate multiplier with a fake number. A real estimate with a real confidence interval,
      using who you're actually playing against.
    </p>

    <form onsubmit={onSubmit} class="space-y-4">
      <div class="flex gap-2">
        <input
          type="text"
          bind:value={riotId}
          placeholder="Riot ID"
          class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <span class="self-center text-zinc-500 text-lg">#</span>
        <input
          type="text"
          bind:value={tag}
          placeholder="TAG"
          class="w-28 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-50 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
        />
      </div>

      <div class="flex gap-2">
        <select
          bind:value={region}
          class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {#each REGIONS as r}
            <option value={r.value}>{r.label}</option>
          {/each}
        </select>

        <select
          bind:value={queue}
          class="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="solo">Solo/Duo</option>
          <option value="flex">Flex</option>
        </select>
      </div>

      <button
        type="submit"
        class="w-full bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-semibold rounded-lg px-6 py-3 transition-colors"
      >
        Estimate MMR
      </button>
    </form>
  </div>

  <div class="grid grid-cols-3 gap-6 mt-24 text-sm text-zinc-400">
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="text-zinc-50 font-medium mb-2">Three signals, combined</h3>
      <p>Win behavior + who you're playing against + inverse-variance weighting. Not a winrate display with extra steps.</p>
    </div>
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="text-zinc-50 font-medium mb-2">Honest confidence range</h3>
      <p>We show 2,150 ± 80, not 2,147. The range is a 90% confidence interval. Anyone showing you a fake-precise number is making it up.</p>
    </div>
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 class="text-zinc-50 font-medium mb-2">Daily timeline</h3>
      <p>MMR tracked over time. See if you're climbing, stuck, or the gap to your visible rank is closing.</p>
    </div>
  </div>
</div>
