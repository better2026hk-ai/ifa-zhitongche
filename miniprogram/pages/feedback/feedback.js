const store = require('../../utils/store.js');

function svgIcon(paths, extra) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${extra}>${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function starPath(fill, stroke) {
  return `<path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.2 6.1-.6z" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>`;
}

const BACK_ICON = svgIcon('<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>', 'fill="none"');
const FILLED_STAR = svgIcon(starPath('#C98A1F', '#C98A1F'), 'fill="none"');
const EMPTY_STAR = svgIcon(starPath('none', '#D8DCE3'), 'fill="none"');
const CHECK_ICON = svgIcon('<path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>', 'fill="none"');

Page({
  data: {
    backIcon: BACK_ICON,
    filledStar: FILLED_STAR,
    emptyStar: EMPTY_STAR,
    checkIcon: CHECK_ICON,
    stars: [1, 2, 3, 4, 5],
    rating: 0,
    text: '',
    submitted: false
  },

  onShow() {
    if (!store.isLoggedIn() || !store.hasProfile()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.setData({ rating: 0, text: '', submitted: false });
  },

  setRating(e) {
    this.setData({ rating: Number(e.currentTarget.dataset.n) });
  },

  onInput(e) {
    this.setData({ text: e.detail.value.slice(0, 100) });
  },

  submit() {
    store.submitFeedback(this.data.rating, this.data.text);
    this.setData({ submitted: true });
  },

  goBack() {
    wx.navigateBack();
  }
});
