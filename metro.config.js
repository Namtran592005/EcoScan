const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro config: register `.onnx` as a bundlable asset so that
 * `require('../../assets/models/xxx.onnx')` resolves to a file that can be
 * located at runtime via `expo-asset` (Asset.fromModule(...).localUri).
 */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, 'onnx'];

module.exports = config;