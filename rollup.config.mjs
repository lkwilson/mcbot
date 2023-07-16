// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const isDevelopment = process.env.IS_DEV === "yes";

export default (async () => [
  {
    input: "./src/main.ts",
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      json(),
      !isDevelopment && (await import("@rollup/plugin-terser")).default(),
    ],
    external: [
      "mineflayer",
      "mineflayer-pathfinder",
      "mineflayer-statemachine",
    ],
    output: {
      file: "./dist/main.js",
      format: "cjs",
    },
  },
])();
