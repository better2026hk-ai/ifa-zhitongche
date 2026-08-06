const { POLICY_CONTENT } = require('../../utils/policy-content.js');
const { parseBold } = require('../../utils/richtext.js');

const BACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">' +
  '<path d="M15 6l-6 6 6 6" stroke="#14161A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>'
)}`;

Page({
  data: {
    backIcon: BACK_ICON,
    doc: null
  },

  onLoad(options) {
    const type = options.type === 'privacy' ? 'privacy' : 'terms';
    const raw = POLICY_CONTENT[type];
    const doc = {
      ...raw,
      sections: raw.sections.map((s) => ({
        h: s.h,
        p: s.p.map((line) => parseBold(line))
      }))
    };
    this.setData({ doc });
  },

  goBack() {
    wx.navigateBack();
  }
});
