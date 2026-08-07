// Icon paths copied verbatim from the HTML prototype's renderTabbar() so the
// four tab icons stay pixel-identical. Two colour variants (inactive/active)
// are baked into separate data-URI SVGs since a single <image> can't recolor
// via currentColor the way the prototype's inline <svg> did.
function iconSvg(paths, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">${paths.replace(/currentColor/g, color)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const ICON_PATHS = {
  home: '<path d="M4 11.5L12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  exam: '<rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M9 4V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 12.5l2 2 4-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  wrongbook: '<path d="M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8L15 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  profile: '<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};

const INACTIVE_COLOR = '#9AA0AC';
const ACTIVE_COLOR = '#0B6B63';

const TABS = [
  { key: 'home', label: '首页', pagePath: '/pages/home/home' },
  { key: 'exam', label: '模拟考试', pagePath: '/pages/exam/exam' },
  { key: 'wrongbook', label: '错题本', pagePath: '/pages/wrongbook/wrongbook' },
  { key: 'profile', label: '我的', pagePath: '/pages/profile/profile' }
];

Component({
  data: {
    selected: 0,
    // 错题本的详情/选题/测验这几个子屏幕跟"首页/tab 页"是同一个路由，不像模拟
    // 考试/练习模式那样天然在没有 tabBar 的分包页面里，得靠页面自己调用
    // getTabBar().setData({hidden:true}) 手动隐藏，不然子屏幕自己的底部按钮
    // 会被 tabBar 挡住。
    hidden: false,
    tabs: TABS.map((t) => ({
      ...t,
      iconInactive: iconSvg(ICON_PATHS[t.key], INACTIVE_COLOR),
      iconActive: iconSvg(ICON_PATHS[t.key], ACTIVE_COLOR)
    }))
  },
  methods: {
    onTap(e) {
      const index = e.currentTarget.dataset.index;
      const { pagePath } = TABS[index];
      wx.switchTab({ url: pagePath });
      this.setData({ selected: index });
    }
  }
});
