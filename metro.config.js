// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Safe optimization
config.maxWorkers = 2;

module.exports = config;
