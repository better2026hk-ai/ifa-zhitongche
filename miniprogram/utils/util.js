function suggestNickname() {
  return '微信用户' + Math.floor(1000 + Math.random() * 9000);
}

module.exports = { suggestNickname };
