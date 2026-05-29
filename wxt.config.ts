import { defineConfig } from 'wxt';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-solid'],
  manifest: {
    name: 'KaTab',
    short_name: 'KaTab',
    description: 'Kanban-style new tab page — Collections, Notes, Tab Tray',
    version: '0.0.1',
    minimum_chrome_version: '116',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      64: 'icons/icon-64.png',
      128: 'icons/icon-128.png',
    },
    // Toolbar icon — required for `contexts: ['action']` context menu
    action: {
      default_title: 'KaTab',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    permissions: [
      'storage',
      'tabs',
      'tabGroups',
      'sessions',
      'history',
      'scripting',
      'contextMenus',
    ],
    host_permissions: ['<all_urls>'],
    // Allow content script shadow DOM to load extension assets
    web_accessible_resources: [
      {
        resources: ['icons/*'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    plugins: [UnoCSS({ configFile: './src/styles/uno.config.ts' })],
  }),
});
