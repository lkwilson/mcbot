// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const isDevelopment = process.env.IS_DEV === "true";

export default (async () => [
  {
    input: "./src/main.ts",
    plugins: [
      typescript(),
      resolve(),
      commonjs(),
      !isDevelopment && (await import("@rollup/plugin-terser")).default(),
    ],
    output: {
      file: "./dist/main.js",
      format: "cjs",
    },
  }
])();
