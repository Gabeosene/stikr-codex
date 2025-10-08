// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // keep it minimal first; we'll add more back later
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
