export default {
  base: "./",
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.message.includes("framer-motion")) {
          return;
        }

        warn(warning);
      },
    },
  },
};
