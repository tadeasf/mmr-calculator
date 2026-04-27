<script lang="ts">
import type { PageData } from './$types';

type MmrApiResult = {
  unranked?: true;
  summoner: { puuid: string; riotId: string; tag: string; region: string };
  rank?: { tier: string; division: string; lp: number; wins: number; losses: number };
  mmr?: {
    mu: number;
    ci90: [number, number];
    sigma: number;
    lobbiesUsed: number;
    confidence: 'high' | 'medium' | 'low';
    computedAt: number;
    refreshing?: boolean;
  };
  tier1?: { gapMu: number; gapSigma: number; sampleSize: number } | null;
  tier2?: { mu: number; sigma: number; lobbies: unknown[] } | null;
  lpEfficiency?: { avgLpGain: number; avgLpLoss: number; breakEvenWinrate: number };
  promoPredictor?: {
    nextRankLabel: string;
    gamesEstimate: number;
    confidence: 'high' | 'medium' | 'low';
  } | null;
  smurfFlag?: { score: number; reasons: string[] };
  fairnessScore?: {
    teamMmrSpread: number;
    enemyMmrSpread: number;
    verdict: 'balanced' | 'unfavorable' | 'favorable';
  };
  message?: string;
};

const { data }: { data: PageData } = $props();
const region = $derived(data.region);
const riotId = $derived(data.riotId);
const tag = $derived(data.tag);
const queue = $derived(data.queue);

let result = $state<MmrApiResult | null>(null);
let error = $state<string | null>(null);
let loading = $state(true);
let refreshing = $state(false);

async function loadData(fresh = false) {
  loading = true;
  error = null;
  try {
    const params = new URLSearchParams({ riotId, tag, region, queue });
    if (fresh) params.set('fresh', 'true');
    const res = await fetch(`/api/v1/mmr?${params}`);
    const data = await res.json();
    if (!res.ok) {
      error = data?.message ?? `Error ${res.status}`;
    } else {
      result = data as MmrApiResult;
      if (result.mmr?.refreshing) {
        refreshing = true;
        setTimeout(() => loadData(), 8_000);
      } else {
        refreshing = false;
      }
    }
  } catch {
    error = 'Network error. Please try again.';
  } finally {
    loading = false;
  }
}

loadData();

function tierColor(tier: string): string {
  const t = tier.toUpperCase();
  if (t === 'IRON') return 'text-zinc-400';
  if (t === 'BRONZE') return 'text-amber-700';
  if (t === 'SILVER') return 'text-zinc-300';
  if (t === 'GOLD') return 'text-yellow-400';
  if (t === 'PLATINUM') return 'text-teal-400';
  if (t === 'EMERALD') return 'text-emerald-400';
  if (t === 'DIAMOND') return 'text-blue-400';
  if (t === 'MASTER') return 'text-purple-400';
  if (t === 'GRANDMASTER') return 'text-red-400';
  if (t === 'CHALLENGER') return 'text-yellow-300';
  return 'text-zinc-50';
}

function confidenceBadge(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40';
  if (c === 'medium') return 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40';
  return 'bg-red-900/40 text-red-400 border border-red-700/40';
}

function verdictBadge(v: 'balanced' | 'unfavorable' | 'favorable') {
  if (v === 'balanced') return 'text-zinc-400';
  if (v === 'favorable') return 'text-emerald-400';
  return 'text-red-400';
}

function formatWinrate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

function mmrLabel(mu: number): string {
  if (mu < 800) return 'Iron';
  if (mu < 1000) return 'Bronze';
  if (mu < 1200) return 'Silver';
  if (mu < 1400) return 'Gold';
  if (mu < 1600) return 'Platinum';
  if (mu < 1800) return 'Emerald';
  if (mu < 2000) return 'Diamond';
  if (mu < 2400) return 'Master';
  if (mu < 2800) return 'Grandmaster';
  return 'Challenger';
}
</script>

<svelte:head>
  <title>{riotId}#{tag} MMR — {region.toUpperCase()} {queue === 'flex' ? 'Flex' : 'Solo/Duo'}</title>
  <meta name="description" content="MMR estimate for {riotId}#{tag} on {region.toUpperCase()}. Real confidence intervals using lobby composition analysis." />
</svelte:head>

<div class="max-w-[1100px] mx-auto px-6 py-12">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-2 text-sm text-zinc-500 mb-8">
    <a href="/" class="hover:text-zinc-300 transition-colors">Home</a>
    <span>/</span>
    <span class="text-zinc-400">{riotId}#{tag}</span>
    <span class="text-zinc-700 text-xs uppercase ml-2">{region} · {queue}</span>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-32 gap-4">
      <div class="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
      <p class="text-zinc-400">Fetching ranked data…</p>
    </div>

  {:else if error}
    <div class="bg-red-950/30 border border-red-800/40 rounded-xl p-8 text-center">
      <p class="text-red-400 text-lg">{error}</p>
      <button
        onclick={() => loadData()}
        class="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
      >
        Retry
      </button>
    </div>

  {:else if result?.unranked}
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
      <p class="text-zinc-300 text-lg">{result.summoner.riotId}#{result.summoner.tag} has no ranked data in {queue === 'flex' ? 'Flex' : 'Solo/Duo'}.</p>
      <p class="text-zinc-500 mt-2">Play at least 5 placement games to see your MMR estimate.</p>
    </div>

  {:else if result?.mmr && result?.rank}
    {@const mmr = result.mmr}
    {@const rank = result.rank}
    {@const winrate = formatWinrate(rank.wins, rank.losses)}

    {#if refreshing}
      <div class="flex items-center gap-2 bg-zinc-900/60 border border-zinc-700 rounded-lg px-4 py-2 mb-6 text-sm text-zinc-400">
        <div class="w-3 h-3 rounded-full border border-cyan-500 border-t-transparent animate-spin"></div>
        Refreshing in background — showing cached data
      </div>
    {/if}

    <!-- Main result card -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- MMR estimate -->
      <div class="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-2xl font-semibold text-zinc-50">{result.summoner.riotId}<span class="text-zinc-500">#{result.summoner.tag}</span></h1>
            <p class="text-zinc-500 text-sm mt-0.5">{region.toUpperCase()} · {queue === 'flex' ? 'Flex 5v5' : 'Solo/Duo'}</p>
          </div>
          <button
            onclick={() => loadData(true)}
            class="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-400 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div class="flex items-end gap-4 mb-2">
          <span class="text-6xl font-bold text-zinc-50 tabular-nums">{mmr.mu}</span>
          <span class="text-zinc-500 text-lg mb-2">MMR</span>
        </div>

        <p class="text-zinc-500 text-sm mb-6">
          90% CI: <span class="text-zinc-300">{mmr.ci90[0]}–{mmr.ci90[1]}</span>
          &nbsp;·&nbsp;
          <span class="font-medium text-zinc-300">{mmrLabel(mmr.mu)}</span> range
        </p>

        <div class="flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium {confidenceBadge(mmr.confidence)}">
            {mmr.confidence} confidence
          </span>
          {#if mmr.lobbiesUsed > 0}
            <span class="px-2.5 py-1 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
              {mmr.lobbiesUsed} {mmr.lobbiesUsed === 1 ? 'lobby' : 'lobbies'} analyzed
            </span>
          {/if}
          {#if result.smurfFlag && result.smurfFlag.score >= 3}
            <span class="px-2.5 py-1 rounded-full text-xs bg-orange-950/40 text-orange-400 border border-orange-700/40">
              ⚠ smurf signals
            </span>
          {/if}
        </div>
      </div>

      <!-- Current rank card -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p class="text-zinc-500 text-xs uppercase tracking-wide mb-4">Current Rank</p>
        <div class="mb-4">
          <p class="text-2xl font-semibold {tierColor(rank.tier)}">
            {rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase()}
            {#if !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier.toUpperCase())}
              {rank.division}
            {/if}
          </p>
          <p class="text-zinc-400 text-lg">{rank.lp} LP</p>
        </div>
        <div class="text-sm text-zinc-500 space-y-1">
          <div class="flex justify-between">
            <span>W/L</span>
            <span class="text-zinc-300">{rank.wins}W {rank.losses}L</span>
          </div>
          <div class="flex justify-between">
            <span>Winrate</span>
            <span class="text-zinc-300">{winrate}</span>
          </div>
          <div class="flex justify-between">
            <span>MMR gap</span>
            <span class="{mmr.mu - rank.lp > 30 ? 'text-emerald-400' : mmr.mu - rank.lp < -30 ? 'text-red-400' : 'text-zinc-300'}">
              {mmr.mu > 0 ? (mmr.mu - rank.lp > 0 ? '+' : '') + Math.round(mmr.mu - rank.lp) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- LP Efficiency + Promo Predictor -->
    {#if result.lpEfficiency || result.promoPredictor}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {#if result.lpEfficiency}
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p class="text-zinc-500 text-xs uppercase tracking-wide mb-4">LP Efficiency</p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-zinc-400">Avg LP gain</span>
                <span class="text-emerald-400">+{result.lpEfficiency.avgLpGain}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-zinc-400">Avg LP loss</span>
                <span class="text-red-400">{result.lpEfficiency.avgLpLoss}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-zinc-400">Break-even WR</span>
                <span class="text-zinc-300">{Math.round(result.lpEfficiency.breakEvenWinrate * 100)}%</span>
              </div>
            </div>
            {#if result.lpEfficiency.breakEvenWinrate > 0.52}
              <p class="text-xs text-yellow-400/80 mt-3">LP system thinks you're below your true MMR — you're earning less per win.</p>
            {:else if result.lpEfficiency.breakEvenWinrate < 0.48}
              <p class="text-xs text-emerald-400/80 mt-3">LP system rewards you more per win than loss — you're likely above your true MMR.</p>
            {/if}
          </div>
        {/if}

        {#if result.promoPredictor}
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p class="text-zinc-500 text-xs uppercase tracking-wide mb-4">Promo Predictor</p>
            <p class="text-zinc-300 text-sm mb-2">
              Next: <span class="font-semibold text-zinc-50">{result.promoPredictor.nextRankLabel}</span>
            </p>
            {#if result.promoPredictor.gamesEstimate === 0}
              <p class="text-emerald-400 text-sm">You're at or above this threshold already.</p>
            {:else}
              <p class="text-zinc-400 text-sm">
                ~<span class="text-zinc-50 font-medium">{result.promoPredictor.gamesEstimate}</span> games at 55% WR
              </p>
            {/if}
            <span class="mt-3 inline-block px-2 py-0.5 rounded text-xs {confidenceBadge(result.promoPredictor.confidence)}">
              {result.promoPredictor.confidence} confidence
            </span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Tier breakdown -->
    {#if result.tier1 || result.tier2}
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <p class="text-zinc-500 text-xs uppercase tracking-wide mb-4">Signal Breakdown</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {#if result.tier1}
            <div>
              <p class="text-zinc-400 font-medium mb-2">Tier 1 — Win behavior</p>
              <div class="space-y-1 text-zinc-500">
                <div class="flex justify-between">
                  <span>MMR gap signal</span>
                  <span class="text-zinc-300">{result.tier1.gapMu > 0 ? '+' : ''}{result.tier1.gapMu}</span>
                </div>
                <div class="flex justify-between">
                  <span>Uncertainty (σ)</span>
                  <span class="text-zinc-300">{result.tier1.gapSigma}</span>
                </div>
                <div class="flex justify-between">
                  <span>Sample size</span>
                  <span class="text-zinc-300">{result.tier1.sampleSize} games</span>
                </div>
              </div>
            </div>
          {/if}
          {#if result.tier2}
            <div>
              <p class="text-zinc-400 font-medium mb-2">Tier 2 — Lobby composition</p>
              <div class="space-y-1 text-zinc-500">
                <div class="flex justify-between">
                  <span>Lobby MMR estimate</span>
                  <span class="text-zinc-300">{result.tier2.mu}</span>
                </div>
                <div class="flex justify-between">
                  <span>Uncertainty (σ)</span>
                  <span class="text-zinc-300">{result.tier2.sigma}</span>
                </div>
                <div class="flex justify-between">
                  <span>Lobbies used</span>
                  <span class="text-zinc-300">{result.tier2.lobbies.length}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Fairness score -->
    {#if result.fairnessScore}
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <p class="text-zinc-500 text-xs uppercase tracking-wide mb-4">Lobby Fairness</p>
        <div class="flex items-center gap-3 mb-4">
          <span class="text-lg font-medium {verdictBadge(result.fairnessScore.verdict)}">
            {result.fairnessScore.verdict.charAt(0).toUpperCase() + result.fairnessScore.verdict.slice(1)}
          </span>
          <span class="text-zinc-500 text-sm">across last {mmr.lobbiesUsed} games</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm text-zinc-500">
          <div class="flex justify-between">
            <span>Your team spread</span>
            <span class="text-zinc-300">{result.fairnessScore.teamMmrSpread} MMR</span>
          </div>
          <div class="flex justify-between">
            <span>Enemy spread</span>
            <span class="text-zinc-300">{result.fairnessScore.enemyMmrSpread} MMR</span>
          </div>
        </div>
      </div>
    {/if}

    <p class="text-xs text-zinc-600 mt-4">
      Computed at {new Date(mmr.computedAt).toLocaleString()} · σ = {mmr.sigma} ·
      <a href="/methodology" class="underline hover:text-zinc-400 transition-colors">How this works</a>
    </p>
  {/if}
</div>
