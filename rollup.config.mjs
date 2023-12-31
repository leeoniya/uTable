import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { ivi } from "@ivi/rollup-plugin";
import terser from "@rollup/plugin-terser";

const TERSER_OPTIONS = {
  compress: {
    inline: 0,
    passes: 2,
    keep_infinity: true,
  },
  toplevel: true,
  module: true,
};

export default [
  {
    input: "./src/main.ts",
    output: {
      file: "./dist/bundle.js",
      format: "es",
      strict: true,
      sourcemap: true,
    },
    watch: {
      clearScreen: false,
    },
    plugins: [nodeResolve(), typescript(), ivi({}), terser(TERSER_OPTIONS)],
  },
];
