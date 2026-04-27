<script lang="ts">
import '../app.css';
import type { Snippet } from 'svelte';

const { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <meta property="og:site_name" content="MMR Estimator" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <meta name="theme-color" content="#09090b" />
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
  <header class="border-b border-zinc-800">
    <div class="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-lg font-semibold tracking-tight text-zinc-50">
        mmr.gg
      </a>
      <nav class="flex gap-6 text-sm text-zinc-400">
        <a href="/methodology" class="hover:text-zinc-50 transition-colors">How it works</a>
        <a href="/faq" class="hover:text-zinc-50 transition-colors">FAQ</a>
        <a href="/compare" class="hover:text-zinc-50 transition-colors">Compare</a>
      </nav>
    </div>
  </header>

  <main>
    {@render children()}
  </main>

  <footer class="border-t border-zinc-800 mt-24">
    <div class="max-w-[1100px] mx-auto px-6 py-8 text-sm text-zinc-500">
      <p>Not affiliated with Riot Games. League of Legends and all related trademarks are property of Riot Games, Inc.</p>
      <p class="mt-1">Data from <a href="https://developer.riotgames.com" class="underline hover:text-zinc-300">Riot Games API</a> under their developer terms.</p>
    </div>
  </footer>
</div>
