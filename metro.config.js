const { getDefaultConfig } = require('expo/metro-config');

/**
 * Models are user-imported ONNX files stored in the app's document directory,
 * not Metro assets — so no custom asset extension registration is needed.
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
