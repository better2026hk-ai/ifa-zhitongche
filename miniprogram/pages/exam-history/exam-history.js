const store = require('../../utils/store.js');

const BACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

Page({
  data: {
    backIcon: BACK_ICON,
    items: []
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 最多显示近 20 次——技术交接文档 4.6 节
    const items = store.getExamHistory().slice(0, 20).map((h) => ({
      paperTag: h.paperTag,
      paperName: h.paperName,
      passed: h.passed,
      dateStr: formatDate(h.timestamp),
      pct: h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0
    }));
    this.setData({ items });
  },

  onOpenHistory(e) {
    const idx = e.currentTarget.dataset.index;
    wx.navigateTo({ url: `/packageExam/pages/flow/flow?mode=history&historyIndex=${idx}` });
  },

  goBack() {
    wx.navigateBack();
  }
});
