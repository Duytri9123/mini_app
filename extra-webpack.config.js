// extra-webpack.config.js
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = (config) => {
  // 1. Load .env
  config.plugins.push(
    new Dotenv({
      path: './.env', // Load file .env
      systemvars: true, // Cho phép override bằng system env (CI/CD)
      safe: false,
    })
  );

  // 2. Đảm bảo các biến được inject vào process.env
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
      'process.env.GRAPH_HOPPER_KEY': JSON.stringify(process.env.GRAPH_HOPPER_KEY),
    })
  );

  return config;
};
