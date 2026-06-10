module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
          // Mengaktifkan dukungan properti privat bawaan Expo dengan urutan TypeScript yang benar
          jsxRuntime: "automatic",
        },
      ],
    ],

    plugins: ["react-native-reanimated/plugin"],
  };
};
