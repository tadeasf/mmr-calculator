import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '__PROJECT_NAME__',
  description: 'Cloudflare Worker project docs',
  base: '/__PROJECT_NAME__/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Development', link: '/guide/development' },
        ],
      },
    ],
  },
});
