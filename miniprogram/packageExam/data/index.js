// 静态 require——WeChat 打包器要求分包内引用的文件路径能在编译期确定，
// 不能用运行时拼出来的 require(`./${key}.json`)。flow 和 practice 两个
// 页面都从这里拿题库数据，避免各自重复写一份 require 映射。
module.exports = {
  p1: require('./p1.json'),
  p2: require('./p2.json'),
  p3: require('./p3.json'),
  p5: require('./p5.json'),
  mpf: require('./mpf.json')
};
