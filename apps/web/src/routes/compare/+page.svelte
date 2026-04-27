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
  result?: MmrResult;
  summoner?: { riotId: string; tag: string; region: string };
};

let a = $state<SummonerInput>({ riotId: '', tag: '', region: 'euw' });
let b = $state<SummonerInput>({ riotId: '', tag: '', region: 'euw' });
let queue = $state('solo');
let queryActive = $state(false);
let jobs = $state<{ a: JobStatus | null; b: JobStatus | null }>({ a: null, b: null });
let results = $state<{ a: MmrResult | null; b: MmrResult | null } | null>(null);
let error = $state<string | null>(null);
let pollHandle = $state<ReturnType<typeof setTimeout> | null>(null);

async function startOne(s: SummonerInput): Promise<string | null> {
  const res = await fetch('/api/v1/mmr/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...s, queue }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { jobId: string };
  return body.jobId;
}

async function fetchStatus(id: string): Promise<JobStatus | null> {
  const res = await fetch(`/api/v1/mmr/status?id=${encodeURIComponent(id)}`);
  if (!res.ok && res.status !== 404) return null;
  return (await res.json()) as JobStatus;
}

async function compare() {
  if (!a.riotId || !a.tag || !b.riotId || !b.tag) return;
  if (pollHandle) clearTimeout(pollHandle);
  queryActive = true;
  error = null;
  jobs = { a: null, b: null };
  results = null;

  const [idA, idB] = await Promise.all([startOne(a), startOne(b)]);
  if (!idA || !idB) {
    error = 'Failed to start one or both jobs.';
    queryActive = false;
    return;
  }

  poll(idA, idB);
}

async function poll(idA: string, idB: string) {
  const [statusA, statusB] = await Promise.all([fetchStatus(idA), fetchStatus(idB)]);
  jobs = { a: statusA, b: statusB };

  const isTerminal = (s: JobStatus | null) =>
    !!s &&
    (s.stage === 'done' ||
      s.stage === 'unranked' ||
      s.stage === 'error' ||
      s.stage === 'not_found');

  if (isTerminal(statusA) && isTerminal(statusB)) {
    results = {
      a: extractResult(statusA),
      b: extractResult(statusB),
    };
    queryActive = false;
    return;
  }

  pollHandle = setTimeout(() => poll(idA, idB), 2_000);
}

function extractResult(s: JobStatus | null): MmrResult | null {
  if (!s) return null;
  if (s.stage === 'done' && s.result) return s.result;
  if (s.stage === 'unranked' && s.summoner) {
    return { unranked: true, summoner: s.summoner };
  }
  return null;
}

function progressPercent(j: JobStatus | null): number {
  if (!j) return 0;
  if (j.stage === 'done') return 100;
  if (j.stage === 'unranked' || j.stage === 'error' || j.stage === 'not_found') return 100;
  if (j.stage === 'fetching_matches' && j.matchesTotal > 0) {
    const fetched = j.matchesProcessed / j.matchesTotal;
    return Math.round(30 + fetched * 60);
  }
  if (j.stage === 'computing') return 95;
  if (j.stage === 'resolving_account') return 15;
  return 5;
}

function confidenceChip(c: 'high' | 'medium' | 'low') {
  if (c === 'high') return 'chip chip-good';
  if (c === 'medium') return 'chip chip-warn';
  return 'chip chip-bad';
}

function diffNumber(): number {
  if (!results?.a?.mmr || !results?.b?.mmr) return 0;
  return results.a.mmr.mu - results.b.mmr.mu;
}
</script>

<svelte:head>
  <title>Compare — two-player MMR diff</title>
  <meta name="description" content="Compare the MMR estimates of two League of Legends players side by side, with confidence intervals and the gap between them." />
</svelte:head>

<div class="max-w-[1180px] mx-auto px-6 pt-16 pb-24">
  <div class="flex items-center gap-3 mb-8">
    <span class="label-mono">[ tool · 03 ]</span>
    <span class="h-px flex-1 bg-[var(--color-rule)]"></span>
    <span class="label-mono">two-player diff</span>
  </div>

  <h1 class="display-serif text-[56px] sm:text-[72px] text-[var(--color-ink)] leading-[0.95] mb-4">
    Compare two players.
  </h1>
  <p class="text-[var(--color-ink-muted)] text-lg leading-relaxed mb-12 max-w-2xl">
    Run two estimates in parallel, see the gap. Each player gets the same three-tier treatment;
    the difference is calculated only when both jobs finish.
  </p>

  <!-- Input row -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-rule)] surface mb-6 overflow-hidden">
    {#each [{ key: 'a', label: 'A', val: a }, { key: 'b', label: 'B', val: b }] as { label, val }}
      <div class="bg-[var(--color-surface-1)] p-6">
        <div class="flex items-baseline justify-between mb-5">
          <span class="numeric text-[var(--color-signal-strong)] text-base tracking-widest">[{label}]</span>
          <span class="label-mono">player</span>
        </div>
        <div class="grid grid-cols-12 gap-2 mb-3">
          <div class="col-span-7">
            <label class="label-mono-strong block mb-2">riot id</label>
            <input type="text" bind:value={val.riotId} placeholder="Faker" class="field w-full" autocomplete="off" />
          </div>
          <div class="col-span-5">
            <label class="label-mono-strong block mb-2">tag</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] font-mono text-sm">#</span>
              <input type="text" bind:value={val.tag} placeholder="KR1" class="field w-full pl-7 uppercase" autocomplete="off" />
            </div>
          </div>
        </div>
        <label class="label-mono-strong block mb-2">region</label>
        <select bind:value={val.region} class="field w-full">
          {#each REGIONS as r}
            <option value={r.value} class="bg-[var(--color-surface-2)]">{r.label}</option>
          {/each}
        </select>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-3 mb-12">
    <select bind:value={queue} class="field w-auto">
      <option value="solo" class="bg-[var(--color-surface-2)]">Solo / Duo</option>
      <option value="flex" class="bg-[var(--color-surface-2)]">Flex 5v5</option>
    </select>
    <button onclick={compare} disabled={queryActive || !a.riotId || !a.tag || !b.riotId || !b.tag} class="btn-primary">
      {queryActive ? 'Running…' : 'Compare →'}
    </button>
  </div>

  {#if error}
    <div class="surface p-6 mb-8">
      <span class="chip chip-bad">[ error ]</span>
      <p class="font-mono text-sm text-[var(--color-bad)] mt-3">{error}</p>
    </div>
  {/if}

  {#if queryActive}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-rule)] surface mb-6 overflow-hidden">
      {#each [{ key: 'a' as const, label: 'A', job: jobs.a }, { key: 'b' as const, label: 'B', job: jobs.b }] as { label, job }}
        <div class="bg-[var(--color-surface-1)] p-6">
          <div class="flex items-baseline justify-between mb-3">
            <span class="numeric text-[var(--color-signal-strong)] text-base tracking-widest">[{label}]</span>
            <span class="numeric label-mono">{progressPercent(job)}%</span>
          </div>
          <p class="font-mono text-xs text-[var(--color-ink-muted)] mb-4">
            → {job?.message ?? 'queued'}
          </p>
          <div class="h-1 bg-[var(--color-rule)] rounded-full overflow-hidden">
            <div class="h-full bg-[var(--color-signal-strong)] transition-all duration-500" style="width: {progressPercent(job)}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if results}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-rule)] surface mb-px overflow-hidden">
      {#each [{ key: 'a' as const, label: 'A', player: results.a }, { key: 'b' as const, label: 'B', player: results.b }] as { label, player }}
        <div class="bg-[var(--color-surface-1)] p-6 sm:p-7 relative tick-rule">
          <div class="flex items-baseline justify-between mb-4">
            <span class="numeric text-[var(--color-signal-strong)] text-base tracking-widest">[{label}]</span>
            <span class="label-mono">{queue}</span>
          </div>
          {#if !player}
            <p class="display-serif text-2xl text-[var(--color-bad)]">Failed.</p>
          {:else if player.unranked}
            <p class="display-serif text-2xl text-[var(--color-ink)] mb-2">
              {player.summoner.riotId}<span class="text-[var(--color-ink-faint)]">#{player.summoner.tag}</span>
            </p>
            <p class="text-sm text-[var(--color-ink-muted)]">Unranked in this queue.</p>
          {:else if player.mmr}
            <p class="font-mono text-sm text-[var(--color-ink-muted)] mb-3">
              {player.summoner.riotId}<span class="text-[var(--color-ink-faint)]">#{player.summoner.tag}</span>
            </p>
            <div class="flex items-baseline gap-3 mb-1">
              <span class="numeric text-[64px] text-[var(--color-ink)] leading-none">{player.mmr.mu.toLocaleString()}</span>
              <span class="numeric text-sm text-[var(--color-ink-faint)]">MMR</span>
            </div>
            <p class="numeric text-xs text-[var(--color-ink-faint)] mb-5">
              CI<sub>90</sub> {player.mmr.ci90[0]} — {player.mmr.ci90[1]} &nbsp;·&nbsp; σ {player.mmr.sigma}
            </p>
            {#if player.rank}
              <p class="font-mono text-xs text-[var(--color-ink-muted)] mb-3">
                {player.rank.tier.charAt(0) + player.rank.tier.slice(1).toLowerCase()}
                {['MASTER','GRANDMASTER','CHALLENGER'].includes(player.rank.tier.toUpperCase()) ? '' : player.rank.division}
                · <span class="numeric text-[var(--color-ink)]">{player.rank.lp}</span> LP
              </p>
            {/if}
            <span class={confidenceChip(player.mmr.confidence)}>
              {player.mmr.confidence}
            </span>
          {/if}
        </div>
      {/each}
    </div>

    {#if results.a?.mmr && results.b?.mmr}
      {@const diff = diffNumber()}
      <div class="surface p-8 mt-px text-center">
        <p class="label-mono mb-3">[ Δ MMR · A − B ]</p>
        <p class="numeric text-[80px] leading-none {diff === 0 ? 'text-[var(--color-ink)]' : diff > 0 ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'}">
          {diff > 0 ? '+' : ''}{diff}
        </p>
        <p class="text-[var(--color-ink-muted)] text-sm mt-3 max-w-md mx-auto">
          {Math.abs(diff) <= 50
            ? 'Effectively the same MMR range — smaller than the irreducible-noise floor.'
            : Math.abs(diff) <= 150
              ? 'Small but meaningful gap — about one division of MMR.'
              : 'Significant difference — multiple divisions apart.'}
        </p>
      </div>
    {/if}
  {/if}
</div>
