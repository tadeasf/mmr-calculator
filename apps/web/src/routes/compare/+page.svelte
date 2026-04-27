<script lang="ts">
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

type SummonerInput = { riotId: string; tag: string; region: string };
type MmrResult = {
  summoner: { riotId: string; tag: string; region: string };
  rank?: { tier: string; division: string; lp: number };
  mmr?: {
    mu: number;
    ci90: [number, number];
    sigma: number;
    confidence: 'high' | 'medium' | 'low';
  };
  unranked?: true;
};

let a = $state<SummonerInput>({ riotId: '', tag: '', region: 'euw' });
let b = $state<SummonerInput>({ riotId: '', tag: '', region: 'euw' });
let queue = $state('solo');
let results = $state<{ a: MmrResult | null; b: MmrResult | null } | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

async function fetchOne(s: SummonerInput): Promise<MmrResult | null> {
  const p = new URLSearchParams({ riotId: s.riotId, tag: s.tag, region: s.region, queue });
  const res = await fetch(`/api/v1/mmr?${p}`);
  if (!res.ok) return null;
  return res.json() as Promise<MmrResult>;
}

async function compare() {
  if (!a.riotId || !a.tag || !b.riotId || !b.tag) return;
  loading = true;
  error = null;
  try {
    const [ra, rb] = await Promise.all([fetchOne(a), fetchOne(b)]);
    results = { a: ra, b: rb };
  } catch {
    error = 'Failed to fetch one or both players.';
  } finally {
    loading = false;
  }
}

function confidenceBadge(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40';
  if (c === 'medium') return 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40';
  return 'bg-red-900/40 text-red-400 border border-red-700/40';
}

function mmrDiff(): string {
  if (!results?.a?.mmr || !results?.b?.mmr) return '';
  const diff = results.a.mmr.mu - results.b.mmr.mu;
  return `${diff > 0 ? '+' : ''}${diff} MMR`;
}
</script>

<svelte:head>
  <title>Compare MMR — Two Players Side by Side</title>
  <meta name="description" content="Compare the MMR estimates of two League of Legends players side by side." />
</svelte:head>

<div class="max-w-[1100px] mx-auto px-6 py-12">
  <h1 class="text-2xl font-semibold text-zinc-50 mb-2">Compare players</h1>
  <p class="text-zinc-400 mb-8 text-sm">Estimate two players' MMR and show the gap.</p>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    {#each [{ label: 'Player A', val: a }, { label: 'Player B', val: b }] as { label, val }}
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p class="text-zinc-500 text-xs uppercase tracking-wide mb-3">{label}</p>
        <div class="flex gap-2 mb-3">
          <input
            type="text"
            bind:value={val.riotId}
            placeholder="Riot ID"
            class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-50 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <span class="self-center text-zinc-500">#</span>
          <input
            type="text"
            bind:value={val.tag}
            placeholder="TAG"
            class="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-50 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
          />
        </div>
        <select
          bind:value={val.region}
          class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-50 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        >
          {#each REGIONS as r}
            <option value={r.value}>{r.label}</option>
          {/each}
        </select>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-4 mb-8">
    <select
      bind:value={queue}
      class="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-50 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
    >
      <option value="solo">Solo/Duo</option>
      <option value="flex">Flex</option>
    </select>

    <button
      onclick={compare}
      disabled={loading || !a.riotId || !a.tag || !b.riotId || !b.tag}
      class="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-zinc-950 font-semibold rounded-lg text-sm transition-colors"
    >
      {loading ? 'Loading…' : 'Compare'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-950/30 border border-red-800/40 rounded-xl p-6">
      <p class="text-red-400 text-sm">{error}</p>
    </div>
  {/if}

  {#if results}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {#each [{ key: 'a', player: results.a, label: 'Player A' }, { key: 'b', player: results.b, label: 'Player B' }] as { label, player }}
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p class="text-zinc-500 text-xs uppercase tracking-wide mb-3">{label}</p>
          {#if !player}
            <p class="text-red-400 text-sm">Failed to fetch.</p>
          {:else if player.unranked}
            <p class="text-zinc-400 text-sm">Unranked in this queue.</p>
          {:else if player.mmr}
            <p class="text-zinc-300 text-sm mb-1">{player.summoner.riotId}#{player.summoner.tag}</p>
            <p class="text-4xl font-bold text-zinc-50 mb-1">{player.mmr.mu}</p>
            <p class="text-zinc-500 text-xs mb-3">CI: {player.mmr.ci90[0]}–{player.mmr.ci90[1]}</p>
            {#if player.rank}
              <p class="text-zinc-400 text-xs">
                {player.rank.tier.charAt(0) + player.rank.tier.slice(1).toLowerCase()}
                {['MASTER','GRANDMASTER','CHALLENGER'].includes(player.rank.tier.toUpperCase()) ? '' : player.rank.division}
                · {player.rank.lp} LP
              </p>
            {/if}
            <span class="mt-3 inline-block px-2 py-0.5 rounded text-xs {confidenceBadge(player.mmr.confidence)}">
              {player.mmr.confidence}
            </span>
          {/if}
        </div>
      {/each}
    </div>

    {#if results.a?.mmr && results.b?.mmr}
      {@const diff = results.a.mmr.mu - results.b.mmr.mu}
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <p class="text-zinc-500 text-xs uppercase tracking-wide mb-2">MMR gap</p>
        <p class="text-3xl font-bold {diff === 0 ? 'text-zinc-50' : diff > 0 ? 'text-emerald-400' : 'text-red-400'}">
          {mmrDiff()}
        </p>
        <p class="text-zinc-500 text-xs mt-2">
          {Math.abs(diff) <= 50
            ? 'Effectively the same MMR range'
            : Math.abs(diff) <= 150
              ? 'Small but meaningful gap'
              : 'Significant MMR difference'}
        </p>
      </div>
    {/if}
  {/if}
</div>
