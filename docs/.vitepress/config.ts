import { defineConfig } from "vitepress";

const publicNav = [
  { text: "Introduction", link: "/" },
  { text: "Installation", link: "/INSTALLATION" },
  { text: "Reference", link: "/REFERENCE" },
  { text: "AI integration", link: "/ai-integration" },
  { text: "Troubleshooting", link: "/troubleshooting" },
];

const publicSidebar = [
  { text: "Introduction", link: "/" },
  { text: "Installation", link: "/INSTALLATION" },
  { text: "Reference", link: "/REFERENCE" },
  { text: "AI integration", link: "/ai-integration" },
  { text: "Troubleshooting", link: "/troubleshooting" },
];

const japaneseNav = [
  { text: "はじめに", link: "/ja/" },
  { text: "インストール", link: "/INSTALLATION_ja" },
  { text: "リファレンス", link: "/ja/reference" },
  { text: "AI連携", link: "/ja/ai-integration" },
  { text: "トラブルシューティング", link: "/ja/troubleshooting" },
];

const japaneseSidebar = [
  { text: "はじめに", link: "/ja/" },
  { text: "インストール", link: "/INSTALLATION_ja" },
  { text: "リファレンス", link: "/ja/reference" },
  { text: "AI連携", link: "/ja/ai-integration" },
  { text: "トラブルシューティング", link: "/ja/troubleshooting" },
];

export default defineConfig({
  title: "Sprint",
  description: "Sprint management for Obsidian",
  base: "/Sprint/",
  cleanUrls: true,
  srcExclude: [
    "AGENT_GUIDE.md",
    "AGILE_CEREMONIES_RESEARCH.md",
    "DEVELOPMENT_AGENTS.md",
    "DEVLOG.md",
    "DOCUMENTATION_MAINTENANCE.md",
    "PUBLISHING.md",
    "TODO.md",
  ],
  locales: {
    root: { label: "English", lang: "en" },
    ja: { label: "日本語", lang: "ja" },
  },
  themeConfig: {
    logo: "/images/sprint-icon.svg",
    search: { provider: "local" },
    socialLinks: [
      { icon: "github", link: "https://github.com/ShijiMi-Soup/Sprint" },
    ],
    nav: publicNav,
    sidebar: publicSidebar,
    outline: "deep",
    footer: { message: "Released under the MIT License." },
    locales: {
      root: { label: "English", nav: publicNav, sidebar: publicSidebar },
      ja: { label: "日本語", nav: japaneseNav, sidebar: japaneseSidebar },
    },
  },
});
