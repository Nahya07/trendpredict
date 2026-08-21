const appModule = require('../backend/dist/app.js');

const app = appModule.default ?? appModule.createApp();

module.exports = app;