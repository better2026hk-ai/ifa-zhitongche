function suggestNickname() {
  return '微信用户' + Math.floor(1000 + Math.random() * 9000);
}

// 题库里的 stem 开头都拼了章节内序号（"113. ..."），练习模式要保留，
// 模拟考试/错题本测验是跨章节抽题，原编号没意义，显示前要去掉——文档 5.5 节。
function stripLeadingNumber(stem) {
  return stem.replace(/^\d+\.\s*/, '');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

module.exports = { suggestNickname, stripLeadingNumber, shuffle, fmtTime };
