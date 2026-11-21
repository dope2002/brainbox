const { startGame } = require('./src/app/game');
const { createWechatPlatform } = require('./src/platform/wechat');
const questions = require('./content/demo-questions');

startGame(createWechatPlatform(wx), questions);
