const { getDefaultConfig } = require('expo/metro-config');

/**
 * User-imported ONNX files live in the app's document directory, but the
 * default 10-class classifier (phanloai.onnx) is bundled as a Metro asset so
 * the app works out of the box. `.onnx` must be a known asset extension.
 */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('onnx');

module.exports = config;
