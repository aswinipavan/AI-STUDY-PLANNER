const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  resolver: {
    blockList: [
      /.*\/android\/build\/.*/,
      /.*\\android\\build\\.*/,
      /.*\/build\/intermediates\/.*/,
      /.*\\build\\intermediates\\.*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
