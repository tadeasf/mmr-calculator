<script lang="ts">
import RankEmblem from '$lib/RankEmblem.svelte';
import { mmrToRankLabel, mmrToTier, rankToMmr } from '@mmr-calculator/core';
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
  climbProjection?: {
    ceilingLabel: string;
    steps: Array<{
      label: string;
      games: number;
      days: number;
      decayedWinrate: number;
      beyondCeiling: boolean;
    }>;
    netLpPerGame: number;
    baselineWinrate: number;
    notes: string[];
  };
  message?: string;
};

type JobStage =
  | 'queued'
  | 'resolving_account'
  | 'fetching_matches'
  | 'computing'
  | 'done'
  | 'unranked'
  | 'error'
  | 'not_found';

type JobStatus = {
  stage: JobStage;
  message: string;
  matchesTotal: number;
  matchesProcessed: number;
  lobbiesUsed: number;
  error?: string;
  result?: MmrApiResult;
  summoner?: { puuid: string; riotId: string; tag: string; region: string };
  rateLimitedUntil?: number;
};

const { data }: { data: PageData } = $props();
const region = $derived(data.region);
const riotId = $derived(data.riotId);
const tag = $derived(data.tag);
const queue = $derived(data.queue);

let result = $state<MmrApiResult | null>(null);
let error = $state<string | null>(null);
let loading = $state(true);
let job = $state<JobStatus | null>(null);
let pollHandle = $state<ReturnType<typeof setTimeout> | null>(null);
let now = $state(Date.now());
const rateLimitSecondsLeft = $derived(
  job?.rateLimitedUntil && job.rateLimitedUntil > now
    ? Math.ceil((job.rateLimitedUntil - now) / 1000)
    : 0,
);

const stageLabels: Record<JobStage, string> = {
  queued: 'Queued',
  resolving_account: 'Looking up summoner',
  fetching_matches: 'Fetching match history',
  computing: 'Combining estimates',
  done: 'Done',
  unranked: 'Unranked',
  error: 'Error',
  not_found: 'Not found',
};

const stageOrder: JobStage[] = [
  'queued',
  'resolving_account',
  'fetching_matches',
  'computing',
  'done',
];

function progressPercent(j: JobStatus | null): number {
  if (!j) return 0;
  if (j.stage === 'done') return 100;
  if (j.stage === 'unranked' || j.stage === 'error' || j.stage === 'not_found') return 100;
  if (j.stage === 'fetching_matches' && j.matchesTotal > 0) {
    // 30% before fetching starts, then linear to 90% as matches get processed,
    // last 10% reserved for the combine stage.
    const fetched = j.matchesProcessed / j.matchesTotal;
    return Math.round(30 + fetched * 60);
  }
  if (j.stage === 'computing') return 95;
  if (j.stage === 'resolving_account') return 15;
  return 5;
}

async function startJob() {
  loading = true;
  error = null;
  result = null;
  job = null;

  try {
    const res = await fetch('/api/v1/mmr/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ riotId, tag, region, queue }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      error = body?.message ?? `Error ${res.status}`;
      loading = false;
      return;
    }
    const body = (await res.json()) as { jobId: string };
    pollStatus(body.jobId);
  } catch {
    error = 'Network error. Please try again.';
    loading = false;
  }
}

async function pollStatus(jobId: string) {
  try {
    const res = await fetch(`/api/v1/mmr/status?id=${encodeURIComponent(jobId)}`);
    const body = (await res.json()) as JobStatus;
    job = body;

    if (body.stage === 'done' && body.result) {
      result = body.result;
      loading = false;
      return;
    }
    if (body.stage === 'unranked') {
      result = {
        unranked: true,
        summoner: body.summoner ?? { puuid: '', riotId, tag, region },
      };
      loading = false;
      return;
    }
    if (body.stage === 'error') {
      error = body.error ?? 'Computation failed.';
      loading = false;
      return;
    }
    if (body.stage === 'not_found') {
      error = 'Job not found. Please refresh.';
      loading = false;
      return;
    }

    pollHandle = setTimeout(() => pollStatus(jobId), 2_000);
  } catch {
    error = 'Lost connection while polling. Please retry.';
    loading = false;
  }
}

function refresh() {
  if (pollHandle) clearTimeout(pollHandle);
  startJob();
}

// Tick the local clock once per second so the rate-limit countdown
// decrements smoothly between status polls.
const nowTick = setInterval(() => {
  now = Date.now();
}, 1_000);
$effect(() => () => clearInterval(nowTick));

startJob();

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

function confidenceChip(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'chip chip-good';
  if (c === 'medium') return 'chip chip-warn';
  return 'chip chip-bad';
}

function verdictColor(v: 'balanced' | 'unfavorable' | 'favorable') {
  if (v === 'favorable') return 'text-[var(--color-good)]';
  if (v === 'unfavorable') return 'text-[var(--color-bad)]';
  return 'text-[var(--color-ink-muted)]';
}

function formatWinrate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

// Parse a display rank label like "Platinum III" or "Master+ 240 LP" into
// [tier, division] tuples that rankToMmr accepts. Apex labels collapse to
// the tier with empty division (rankToMmr treats apex specially).
function parseRankLabel(label: string): [string, string] {
  const trimmed = label.trim();
  if (trimmed.startsWith('Master')) return ['MASTER', ''];
  const [tier, div = ''] = trimmed.split(/\s+/);
  return [tier.toUpperCase(), div.toUpperCase()];
}
</script>

<svelte:head>
  <title>{riotId}#{tag} — climb forecast · {region.toUpperCase()} {queue === 'flex' ? 'Flex' : 'Solo'}</title>
  <meta name="description" content="Climb forecast for {riotId}#{tag} on {region.toUpperCase()}. Projected ceiling rank, ETAs, lobby quality, and LP pace — calibrated 90% confidence interval." />
</svelte:head>

<div class="max-w-[1180px] mx-auto px-6 py-10">
  <!-- Breadcrumb / target line -->
  <div class="flex flex-wrap items-center gap-3 mb-10">
    <a href="/" class="label-mono hover:text-[var(--color-ink)] transition-colors">← home</a>
    <span class="h-px flex-1 bg-[var(--color-rule)] min-w-8"></span>
    <span class="label-mono">target</span>
    <span class="font-mono text-[13px] text-[var(--color-ink)]">
      {riotId}<span class="text-[var(--color-ink-faint)]">#{tag}</span>
    </span>
    <span class="label-mono">·</span>
    <span class="label-mono uppercase">{region}</span>
    <span class="label-mono">·</span>
    <span class="label-mono uppercase">{queue}</span>
  </div>

  {#if loading}
    {@const stages = [
      { key: 'queued', label: '01 · Queue' },
      { key: 'resolving_account', label: '02 · Account' },
      { key: 'fetching_matches', label: '03 · Matches' },
      { key: 'computing', label: '04 · Combine' },
      { key: 'done', label: '05 · Done' },
    ]}
    {@const currentIdx = stageOrder.indexOf(job?.stage === 'done' ? 'done' : (job?.stage ?? 'queued'))}

    <div class="surface p-8 sm:p-10 max-w-3xl rise">
      <div class="flex items-baseline justify-between mb-6">
        <span class="label-mono">[ acquiring · live ]</span>
        <span class="numeric label-mono">{progressPercent(job)}%</span>
      </div>

      <h2 class="display-serif text-4xl sm:text-5xl text-[var(--color-ink)] mb-2">
        Pulling your match history
      </h2>
      <p class="text-[var(--color-ink-muted)] text-sm mb-8 leading-relaxed">
        Cold lookups take 30–120 seconds. We chunk Riot API calls across multiple Worker invocations
        to stay inside Cloudflare's free-tier subrequest limits — every alarm fire is a fresh budget.
      </p>

      <!-- Stage tracker -->
      <div class="flex items-center gap-1.5 mb-6 overflow-x-auto">
        {#each stages as s, i}
          {@const isActive = stageOrder.indexOf(s.key as JobStage) === currentIdx}
          {@const isDone = stageOrder.indexOf(s.key as JobStage) < currentIdx || job?.stage === 'done'}
          <div class="flex items-center gap-1.5 shrink-0">
            <span
              class={`label-mono ${
                isActive
                  ? 'text-[var(--color-signal-strong)]'
                  : isDone
                  ? 'text-[var(--color-ink-muted)]'
                  : 'text-[var(--color-ink-trace)]'
              }`}
            >
              {isActive ? '●' : isDone ? '✓' : '○'} {s.label}
            </span>
            {#if i < stages.length - 1}
              <span class="text-[var(--color-ink-trace)]">─</span>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Progress bar -->
      <div class="relative h-1 bg-[var(--color-rule)] rounded-full overflow-hidden mb-3">
        <div
          class="h-full bg-[var(--color-signal-strong)] transition-all duration-700 ease-out"
          style="width: {progressPercent(job)}%"
        ></div>
        <div
          class="absolute inset-y-0 sweep-bar opacity-50"
          style="left: {Math.max(0, progressPercent(job) - 20)}%; width: 20%;"
        ></div>
      </div>

      <p class="font-mono text-xs text-[var(--color-ink-muted)] leading-relaxed">
        {#if job?.stage === 'fetching_matches' && job.matchesTotal > 0}
          → match {job.matchesProcessed}/{job.matchesTotal}
          &nbsp;·&nbsp; {job.lobbiesUsed} qualifying lobbies retained
        {:else if job?.message}
          → {job.message}
        {:else}
          → initialising estimator…
        {/if}
      </p>

      {#if rateLimitSecondsLeft > 0}
        <div
          class="mt-6 p-4 border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/5 rounded"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-baseline justify-between mb-2">
            <span class="label-mono text-[var(--color-warn)]">
              <span class="led" style="background: var(--color-warn); box-shadow: 0 0 6px var(--color-warn)"></span>
              [ riot api rate-limited ]
            </span>
            <span class="numeric label-mono text-[var(--color-warn)]">
              retry in {rateLimitSecondsLeft}s
            </span>
          </div>
          <p class="font-mono text-xs text-[var(--color-ink-muted)] leading-relaxed">
            We hit Riot's <span class="numeric">100 req / 2 min</span> dev-key limit. The
            estimator will resume automatically — no action needed. Keep this tab open;
            job state is persisted server-side in a Durable Object alarm chain.
          </p>
        </div>
      {/if}

      <!-- Decorative axis ticks -->
      <div class="mt-10 pt-6 border-t border-[var(--color-rule)] flex items-center gap-3 text-[var(--color-ink-faint)]">
        <span class="led" aria-hidden="true"></span>
        <span class="label-mono">do not close — job state persists in a Durable Object alarm chain</span>
      </div>
    </div>

  {:else if error}
    <div class="surface p-8 max-w-2xl">
      <div class="flex items-baseline justify-between mb-4">
        <span class="label-mono chip chip-bad">[ error ]</span>
        <span class="label-mono">retry available</span>
      </div>
      <p class="display-serif text-3xl text-[var(--color-ink)] mb-3">Something went wrong.</p>
      <p class="font-mono text-sm text-[var(--color-bad)] mb-6 break-all">{error}</p>
      <button onclick={refresh} class="btn-primary">Retry</button>
    </div>

  {:else if result?.unranked}
    <div class="surface p-8 max-w-2xl">
      <div class="flex items-baseline justify-between mb-4">
        <span class="label-mono">[ no data ]</span>
        <span class="label-mono">unranked in {queue}</span>
      </div>
      <p class="display-serif text-3xl text-[var(--color-ink)] mb-3">
        {result.summoner.riotId}<span class="text-[var(--color-ink-faint)]">#{result.summoner.tag}</span> is unranked.
      </p>
      <p class="text-[var(--color-ink-muted)] text-sm leading-relaxed">
        Play at least 5 placement games in <span class="font-mono">{queue === 'flex' ? 'Ranked Flex' : 'Ranked Solo/Duo'}</span> to surface an estimate.
      </p>
    </div>

  {:else if result?.mmr && result?.rank}
    {@const mmr = result.mmr}
    {@const rank = result.rank}
    {@const projection = result.climbProjection}
    {@const winrate = formatWinrate(rank.wins, rank.losses)}
    {@const rankMmr = rankToMmr(rank.tier, rank.division, rank.lp)}
    {@const muGap = mmr.mu - rankMmr}
    {@const ceilingTier = projection ? mmrToTier(rankToMmr(...parseRankLabel(projection.ceilingLabel), 0)) : mmrToTier(mmr.mu)}
    {@const ciLowLabel = mmrToRankLabel(mmr.ci90[0])}
    {@const ciHighLabel = mmrToRankLabel(mmr.ci90[1])}
    {@const ciLowTier = mmrToTier(mmr.ci90[0])}
    {@const ciHighTier = mmrToTier(mmr.ci90[1])}
    {@const ceilingDescriptor =
      muGap > 100
        ? `≈ ${Math.round(muGap / 100)} division${Math.round(muGap / 100) === 1 ? '' : 's'} above visible rank`
        : muGap > 30
          ? 'above visible rank'
          : muGap < -100
            ? `≈ ${Math.round(-muGap / 100)} division${Math.round(-muGap / 100) === 1 ? '' : 's'} below visible rank`
            : muGap < -30
              ? 'below visible rank'
              : 'aligned with visible rank'}
    {@const gapColor =
      muGap > 30 ? 'var(--color-good)' : muGap < -30 ? 'var(--color-bad)' : 'var(--color-ink-muted)'}

    <!-- Hero: climb projection -->
    <section class="grid grid-cols-12 gap-px bg-[var(--color-rule)] surface mb-px overflow-hidden rise">
      <!-- Main projection column -->
      <div class="col-span-12 lg:col-span-8 bg-[var(--color-surface-1)] p-8 sm:p-10 relative tick-rule">
        <div class="flex items-baseline justify-between mb-6">
          <span class="label-mono">[ projected ceiling · this season ]</span>
          <button onclick={refresh} class="btn-ghost">↻ Refresh</button>
        </div>

        {#if projection}
          <div class="flex items-center gap-6 sm:gap-8 mb-6">
            <RankEmblem tier={ceilingTier} size={144} />
            <div>
              <p class="label-mono mb-2">you can realistically reach</p>
              <p class="display-serif text-5xl sm:text-6xl lg:text-7xl {tierColor(ceilingTier)} leading-[0.9]">
                {projection.ceilingLabel}
              </p>
              <p class="font-mono text-sm text-[var(--color-ink-muted)] mt-3" style:color={gapColor}>
                {ceilingDescriptor}
              </p>
            </div>
          </div>

          <p class="font-mono text-sm text-[var(--color-ink-faint)] mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span class="label-mono">CI<sub class="numeric">90</sub></span>
            <RankEmblem tier={ciLowTier} size={24} />
            <span>{ciLowLabel}</span>
            <span class="text-[var(--color-ink-trace)]">to</span>
            <RankEmblem tier={ciHighTier} size={24} />
            <span>{ciHighLabel}</span>
          </p>
        {/if}

        <!-- Status chips -->
        <div class="flex flex-wrap gap-2 mb-8">
          <span class={confidenceChip(mmr.confidence)}>
            <span class="led" style="background: currentColor; box-shadow: 0 0 6px currentColor"></span>
            {mmr.confidence} confidence
          </span>
          {#if Math.abs(muGap) > 30}
            <span class={muGap > 0 ? 'chip chip-good' : 'chip chip-bad'}>
              {muGap > 0 ? '↑ trending up' : '↓ trending down'}
            </span>
          {/if}
          {#if mmr.lobbiesUsed > 0}
            <span class="chip">{mmr.lobbiesUsed} lobbies analysed</span>
          {/if}
        </div>

        {#if projection && projection.steps.length > 0}
          <!-- Climb path: each reachable bracket as a step -->
          <div class="pt-8 border-t border-[var(--color-rule)]">
            <div class="flex items-baseline justify-between mb-5">
              <span class="label-mono">[ climb path · {projection.baselineWinrate * 100}% wr ]</span>
              <span class="label-mono">net {projection.netLpPerGame > 0 ? '+' : ''}{projection.netLpPerGame} LP / game</span>
            </div>
            <ol class="space-y-px bg-[var(--color-rule)] surface-deep overflow-hidden">
              {#each projection.steps as step}
                {@const stepTier = mmrToTier(rankToMmr(...parseRankLabel(step.label), 0))}
                <li class="bg-[var(--color-surface-1)] px-4 py-3 flex items-center gap-4">
                  <RankEmblem tier={stepTier} size={40} />
                  <div class="flex-1 min-w-0">
                    <p class="display-serif text-xl {tierColor(stepTier)} leading-tight">
                      {step.label}
                      {#if step.beyondCeiling}
                        <span class="chip chip-warn ml-2 align-middle">stretch</span>
                      {/if}
                    </p>
                    <p class="label-mono mt-0.5">
                      ~{step.decayedWinrate}% projected wr at this bracket
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="numeric text-lg text-[var(--color-ink)]">≈ {step.games} <span class="text-[var(--color-ink-faint)] text-xs">games</span></p>
                    <p class="numeric text-xs text-[var(--color-ink-muted)]">≈ {step.days} days</p>
                  </div>
                </li>
              {/each}
            </ol>
            {#if projection.notes.length > 0}
              <ul class="mt-3 space-y-1">
                {#each projection.notes as note}
                  <li class="text-xs text-[var(--color-ink-faint)] leading-relaxed">→ {note}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Visible-rank side panel: emblem stacked on top, then label -->
      <div class="col-span-12 lg:col-span-4 bg-[var(--color-surface-1)] p-6 sm:p-8 flex flex-col">
        <div class="flex items-baseline justify-between mb-6">
          <span class="label-mono">[ visible rank ]</span>
        </div>

        <div class="flex flex-col items-center text-center mb-6">
          <RankEmblem tier={rank.tier} size={120} />
          <p class="display-serif text-3xl sm:text-4xl {tierColor(rank.tier)} mt-4 leading-tight">
            {rank.tier.charAt(0) + rank.tier.slice(1).toLowerCase()}
            {#if !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier.toUpperCase())}
              <span class="numeric not-italic font-sans">{rank.division}</span>
            {/if}
          </p>
          <p class="numeric text-sm text-[var(--color-ink-muted)] mt-1">{rank.lp} LP</p>
        </div>

        <dl class="space-y-2.5 text-sm border-t border-[var(--color-rule)] pt-5">
          <div class="flex items-baseline justify-between">
            <dt class="label-mono">w / l</dt>
            <dd class="numeric text-[var(--color-ink)]">{rank.wins}<span class="text-[var(--color-good)] mx-0.5">w</span> {rank.losses}<span class="text-[var(--color-bad)] mx-0.5">l</span></dd>
          </div>
          <div class="flex items-baseline justify-between">
            <dt class="label-mono">winrate</dt>
            <dd class="numeric text-[var(--color-ink)]">{winrate}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Signal breakdown: how each tier contributed (qualitative, no rating numbers) -->
    {#if result.tier1 || result.tier2}
      <section class="surface p-6 sm:p-8 mb-px rise" style="animation-delay: 80ms">
        <div class="flex items-baseline justify-between mb-6">
          <span class="label-mono">[ signal breakdown ]</span>
          <span class="label-mono">inverse-variance</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-rule)] surface-deep overflow-hidden">
          {#if result.tier1}
            <article class="bg-[var(--color-surface-1)] p-6">
              <div class="flex items-baseline justify-between mb-4">
                <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T1</span>
                <span class="label-mono">{result.tier1.sampleSize} games</span>
              </div>
              <h4 class="display-serif text-2xl text-[var(--color-ink)] mb-4">Win behavior</h4>
              <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                {#if Math.abs(result.tier1.gapMu) <= 30}
                  Win rate is consistent with your bracket median — the LP signal is neutral.
                {:else if result.tier1.gapMu > 0}
                  Win rate trends above 50% — the matchmaker is treating you as roughly above your bracket median.
                {:else}
                  Win rate trends below 50% — the matchmaker has been giving you tougher lobbies than your bracket median.
                {/if}
              </p>
            </article>
          {/if}

          {#if result.tier2}
            <article class="bg-[var(--color-surface-1)] p-6">
              <div class="flex items-baseline justify-between mb-4">
                <span class="numeric text-[var(--color-signal-strong)] text-xs tracking-widest">T2</span>
                <span class="label-mono">{result.tier2.lobbies.length} lobbies</span>
              </div>
              <h4 class="display-serif text-2xl text-[var(--color-ink)] mb-4">Lobby composition</h4>
              <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                Aggregated across {result.tier2.lobbies.length} valid lobby{result.tier2.lobbies.length === 1 ? '' : 's'}, the typical
                opponent rank in your recent games sits at <strong class="text-[var(--color-ink)]">{mmrToRankLabel(result.tier2.mu)}</strong>.
                Confidence band: {mmrToRankLabel(result.tier2.mu - result.tier2.sigma)} — {mmrToRankLabel(result.tier2.mu + result.tier2.sigma)}.
              </p>
            </article>
          {/if}
        </div>
      </section>
    {/if}

    <!-- LP efficiency + Promo predictor -->
    {#if result.lpEfficiency || result.promoPredictor}
      <section class="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-rule)] surface mb-px rise" style="animation-delay: 160ms">
        {#if result.lpEfficiency}
          <div class="bg-[var(--color-surface-1)] p-6 sm:p-7">
            <div class="flex items-baseline justify-between mb-4">
              <span class="label-mono">[ lp efficiency ]</span>
            </div>
            <dl class="space-y-2 text-sm mb-4">
              <div class="flex items-baseline justify-between">
                <dt class="label-mono">avg gain</dt>
                <dd class="numeric text-[var(--color-good)]">+{result.lpEfficiency.avgLpGain}</dd>
              </div>
              <div class="flex items-baseline justify-between">
                <dt class="label-mono">avg loss</dt>
                <dd class="numeric text-[var(--color-bad)]">{result.lpEfficiency.avgLpLoss}</dd>
              </div>
              <div class="flex items-baseline justify-between border-t border-[var(--color-rule)] pt-2">
                <dt class="label-mono">break-even WR</dt>
                <dd class="numeric text-[var(--color-ink)]">{Math.round(result.lpEfficiency.breakEvenWinrate * 100)}%</dd>
              </div>
            </dl>
            {#if result.lpEfficiency.breakEvenWinrate > 0.52}
              <p class="text-xs text-[var(--color-warn)] leading-relaxed">→ LP gain is below LP loss — the matchmaker rates you below your visible rank, so you need a higher win rate to net positive LP.</p>
            {:else if result.lpEfficiency.breakEvenWinrate < 0.48}
              <p class="text-xs text-[var(--color-good)] leading-relaxed">→ LP gain exceeds LP loss — you're trending above your visible rank, climb is in progress.</p>
            {/if}
          </div>
        {/if}

        {#if result.promoPredictor}
          <div class="bg-[var(--color-surface-1)] p-6 sm:p-7">
            <div class="flex items-baseline justify-between mb-4">
              <span class="label-mono">[ promo predictor ]</span>
              <span class={confidenceChip(result.promoPredictor.confidence)}>{result.promoPredictor.confidence}</span>
            </div>
            <p class="text-xs text-[var(--color-ink-faint)] mb-2">next bracket</p>
            <p class="display-serif text-3xl text-[var(--color-ink)] mb-4">{result.promoPredictor.nextRankLabel}</p>
            {#if result.promoPredictor.gamesEstimate === 0}
              <p class="font-mono text-sm text-[var(--color-good)]">→ already at threshold</p>
            {:else}
              <p class="font-mono text-sm text-[var(--color-ink-muted)]">
                ≈ <span class="numeric text-[var(--color-ink)]">{result.promoPredictor.gamesEstimate}</span> games at 55% WR
              </p>
            {/if}
          </div>
        {/if}
      </section>
    {/if}

    <!-- Fairness -->
    {#if result.fairnessScore && mmr.lobbiesUsed > 0}
      {@const fs = result.fairnessScore}
      {@const verdictHint =
        fs.verdict === 'favorable'
          ? 'enemy lobbies trended weaker than your team on average — climb-friendly conditions'
          : fs.verdict === 'unfavorable'
          ? 'enemy lobbies trended stronger than your team on average — climb-resistant conditions'
          : 'team and enemy strength roughly matched in recent games'}
      {@const spreadDescriptor = (n: number) =>
        n < 100 ? 'tight' : n < 200 ? 'normal' : n < 350 ? 'wide' : 'very wide'}
      <section class="surface p-6 sm:p-7 mb-px rise" style="animation-delay: 240ms">
        <div class="flex items-baseline justify-between mb-4">
          <span class="label-mono">[ lobby fairness · last {mmr.lobbiesUsed} games ]</span>
          <span class={`numeric text-sm ${verdictColor(fs.verdict)}`}>
            {fs.verdict.toUpperCase()}
          </span>
        </div>
        <dl class="grid grid-cols-2 gap-6 text-sm mb-3">
          <div class="flex items-baseline justify-between border-b border-[var(--color-rule)] pb-2">
            <dt class="label-mono">your team spread</dt>
            <dd class="text-[var(--color-ink)]">{spreadDescriptor(fs.teamMmrSpread)}</dd>
          </div>
          <div class="flex items-baseline justify-between border-b border-[var(--color-rule)] pb-2">
            <dt class="label-mono">enemy team spread</dt>
            <dd class="text-[var(--color-ink)]">{spreadDescriptor(fs.enemyMmrSpread)}</dd>
          </div>
        </dl>
        <p class="text-xs text-[var(--color-ink-faint)] leading-relaxed">→ {verdictHint}</p>
      </section>
    {/if}

    <!-- Footer meta -->
    <p class="label-mono mt-10 flex flex-wrap items-center gap-3">
      <span>computed {new Date(mmr.computedAt).toISOString().slice(0, 19).replace('T', ' ')}</span>
      <span>·</span>
      <a href="/methodology" class="text-[var(--color-signal)] hover:text-[var(--color-signal-strong)] underline underline-offset-4">methodology</a>
      <span>·</span>
      <a href="/compare" class="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">compare with another</a>
    </p>
  {/if}
</div>
