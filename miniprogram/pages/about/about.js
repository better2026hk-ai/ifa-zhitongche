const store = require('../../utils/store.js');
const { getStatusBarHeight } = require('../../utils/util.js');

function svgIcon(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const BACK_ICON = svgIcon('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', '#14161A');

const ICONS = {
  calendar: svgIcon('<rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', '#E2604B'),
  shield: svgIcon('<path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8L15 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', '#0B6B63'),
  ia: svgIcon('<text x="12" y="16" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" font-family="Arial">IA</text>', '#E2604B'),
  group: svgIcon('<circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="10" r="2.4" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 15c2 .2 3.3 1.6 3.8 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', '#0B6B63'),
  doc: svgIcon('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5c-.8 0-1.5-.7-1.5-1.5v-13zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', '#fff'),
  globe: svgIcon('<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.4 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.4-3.4-8.5s1.2-6.2 3.4-8.5z" stroke="currentColor" stroke-width="1.4"/>', '#fff')
};

Page({
  data: {
    backIcon: BACK_ICON,
    icons: ICONS,
    statusBarHeight: 24
  },

  async onShow() {
    if (!store.isLoggedIn() || !(await store.hasProfile())) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ statusBarHeight: getStatusBarHeight() });
  },

  goBack() {
    wx.navigateBack();
  }
});
