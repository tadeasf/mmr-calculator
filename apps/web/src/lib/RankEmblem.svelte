<script lang="ts">
// Emblems are bundled in apps/web/static/ranks/ (downloaded once from
// magisteriis/lol-icons-and-emblems on GitHub). Same-origin = no CDN/CORS
// surprises. Riot removed division-specific emblems in 12.1, so all four
// divisions of a tier share one image.
//
// Emerald (added in 13.x) wasn't in the source repo; we render diamond.png
// with a green hue-rotate to approximate it until a real PNG is dropped in.
type Props = {
  tier: string;
  size?: number;
  class?: string;
};

const { tier, size = 24, class: className = '' }: Props = $props();

const tierKey = $derived(tier.toLowerCase());
const isEmerald = $derived(tierKey === 'emerald');
const src = $derived(`/ranks/${isEmerald ? 'diamond' : tierKey}.png`);
const label = $derived(`${tier.charAt(0)}${tier.slice(1).toLowerCase()} emblem`);
</script>

<img
  {src}
  alt={label}
  width={size}
  height={size}
  loading="lazy"
  decoding="async"
  class="inline-block align-middle {className}"
  style:filter={isEmerald ? 'hue-rotate(80deg) saturate(1.3)' : undefined}
  onerror={(e) => {
    (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
  }}
/>
