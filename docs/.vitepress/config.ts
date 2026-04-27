import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'MMR Calculator',
  description: 'Three-tier inverse-variance MMR estimator for League of Legends',
  base: '/mmr-calculator/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/guide/api' },
      { text: 'Decisions', link: '/decisions/0001-three-tier-mmr-estimator' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Methodology', link: '/guide/methodology' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'API reference', link: '/guide/api' },
          { text: 'Development', link: '/guide/development' },
          { text: 'Deployment', link: '/guide/deployment' },
        ],
      },
      {
        text: 'Decisions',
        items: [
          {
            text: 'ADR-0001: Three-tier estimator',
            link: '/decisions/0001-three-tier-mmr-estimator',
          },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tadeasf/mmr-calculator' },
    ],
  },
});
