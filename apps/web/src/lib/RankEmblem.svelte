<script lang="ts">
// Tier-only emblems served from Community Dragon. Riot removed division-level
// emblems in 12.1; all divisions of a tier share one image.
// Swap EMBLEM_BASE if Community Dragon's path changes; that's the only knob.
const EMBLEM_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem';

type Props = {
  tier: string;
  size?: number;
  class?: string;
};

const { tier, size = 24, class: className = '' }: Props = $props();

const tierKey = $derived(tier.toLowerCase());
const src = $derived(`${EMBLEM_BASE}/emblem-${tierKey}.png`);
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
  onerror={(e) => {
    (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
  }}
/>
