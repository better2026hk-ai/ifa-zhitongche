// 静态 require——WeChat 打包器要求分包内引用的文件路径能在编译期确定，
// 不能用运行时拼出来的 require(`./${key}.js`)。flow 和 practice 两个
// 页面都从这里拿题库数据，避免各自重复写一份 require 映射。
//
// 题库数据存成 .js（module.exports = [...]）而不是 .json——直接
// require() 一个 json 文件在小程序真机编译产物里不够稳定，转成普通 JS
// 模块更保险。
module.exports = {
  p1: require('./p1.js'),
  p2: require('./p2.js'),
  p3: require('./p3.js'),
  p5: require('./p5.js'),
  mpf: require('./mpf.js')
};
