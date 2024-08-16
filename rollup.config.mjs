import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { ivi } from "@ivi/rollup-plugin";
import terser from "@rollup/plugin-terser";
import fs from 'fs';

const TERSER_OPTIONS = {
  compress: {
    inline: 0,
    passes: 2,
    keep_infinity: true,
  },
  toplevel: true,
  module: true,
};

const name = 'main';

const copyCss = () => {
  return {
    name: 'copyCss',
    closeBundle: () => {
      fs.copyFileSync(`./src/${name}.css`, './dist/styles.css');
    },
  }
};

export default [
  {
    input: `./src/${name}.ts`,
    output: {
      file: "./dist/bundle.min.js",
      format: "es",
      strict: true,
      sourcemap: true,
    },
    watch: {
      clearScreen: false,
    },
    plugins: [nodeResolve(), typescript(), ivi({}), terser(TERSER_OPTIONS), copyCss()],
  },
];