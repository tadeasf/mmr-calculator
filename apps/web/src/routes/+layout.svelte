<script lang="ts">
import '../app.css';
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();

let now = $state(new Date());
$effect(() => {
  const id = setInterval(() => {
    now = new Date();
  }, 1_000);
  return () => clearInterval(id);
});

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
</script>

<svelte:head>
  <meta property="og:site_name" content="Climb Lab" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <meta name="theme-color" content="#08080a" />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <header class="border-b border-[var(--color-rule)] backdrop-blur-sm bg-[var(--color-paper)]/85 sticky top-0 z-30">
    <div class="max-w-[1180px] mx-auto px-6 h-12 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 group">
        <span class="led" aria-hidden="true"></span>
        <span class="font-mono text-[13px] tracking-[0.18em] uppercase text-[var(--color-ink)] group-hover:text-[var(--color-signal)] transition-colors">
          CLIMB<span class="text-[var(--color-signal-strong)]">·</span>LAB
        </span>
        <span class="hidden sm:inline label-mono">v1.0 — beta</span>
      </a>

      <nav class="hidden md:flex items-center gap-1">
        <a href="/methodology" class="label-mono-strong px-3 py-1.5 hover:text-[var(--color-ink)] transition-colors">Methodology</a>
        <span class="text-[var(--color-ink-trace)]">/</span>
        <a href="/compare" class="label-mono-strong px-3 py-1.5 hover:text-[var(--color-ink)] transition-colors">Compare</a>
        <span class="text-[var(--color-ink-trace)]">/</span>
        <a href="/faq" class="label-mono-strong px-3 py-1.5 hover:text-[var(--color-ink)] transition-colors">FAQ</a>
      </nav>

      <div class="flex items-center gap-3">
        <span class="hidden md:inline label-mono">
          {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())} UTC
        </span>
        <span class="chip chip-signal hidden sm:inline-flex">
          <span class="led" aria-hidden="true"></span> Live
        </span>
      </div>
    </div>
  </header>

  <main class="flex-1">
    {@render children()}
  </main>

  <footer class="border-t border-[var(--color-rule)] mt-24">
    <div class="max-w-[1180px] mx-auto px-6 py-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p class="label-mono-strong mb-3">Instrument</p>
          <p class="text-sm text-[var(--color-ink-muted)] leading-relaxed">
            <span class="text-[var(--color-ink)]">Climb Lab</span> — a ranked-progression coach for League of Legends. Forecasts the rank you can realistically reach this season and how long it will take, using public match-history data.
          </p>
        </div>
        <div>
          <p class="label-mono-strong mb-3">Sources</p>
          <ul class="text-sm text-[var(--color-ink-muted)] space-y-1.5">
            <li><a class="hover:text-[var(--color-ink)] transition-colors" href="https://developer.riotgames.com">Riot Games API ↗</a></li>
            <li><a class="hover:text-[var(--color-ink)] transition-colors" href="/methodology">Methodology</a></li>
            <li><a class="hover:text-[var(--color-ink)] transition-colors" href="/faq">FAQ</a></li>
            <li><a class="hover:text-[var(--color-ink)] transition-colors" href="/privacy">Privacy</a></li>
            <li><a class="hover:text-[var(--color-ink)] transition-colors" href="/terms">Terms of use</a></li>
          </ul>
        </div>
        <div>
          <p class="label-mono-strong mb-3">Disclaimer</p>
          <p class="text-xs text-[var(--color-ink-faint)] leading-relaxed">
            Climb Lab isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends &copy; Riot Games, Inc.
          </p>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-4">
        <p class="label-mono">
          Build {now.getUTCFullYear()}.{pad(now.getUTCMonth() + 1)}.{pad(now.getUTCDate())} — Cloudflare Workers
        </p>
        <p class="label-mono">
          forecast confidence: μ ± 1.645σ &nbsp;·&nbsp; floor σ = 40
        </p>
      </div>
    </div>
  </footer>
</div>
