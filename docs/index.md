---
layout: home
hero:
  name: MMR Calculator
  text: Honest MMR estimates for League of Legends
  tagline: A three-tier inverse-variance estimator that combines win behavior and lobby composition into a confidence interval — not a fake-precise scalar.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Methodology
      link: /guide/methodology
    - theme: alt
      text: View on GitHub
      link: https://github.com/tadeasf/mmr-calculator

features:
  - title: Lobby-composition signal
    details: Tier 2 looks up the current rank of every other participant in your last 20 ranked games. Opponents are weighted higher than teammates, and recent games count more.
  - title: Honest uncertainty
    details: Every estimate is a (mu, sigma) pair combined via inverse-variance weighting. New or sparse accounts get a wide 90% CI rather than a confidently wrong number.
  - title: Built on Cloudflare
    details: SvelteKit on Cloudflare Workers, D1 for the cache, KV for hot lookups, a Durable Object rate limiter for the Riot API, and cron snapshots feeding a future LP-delta tier.
---
