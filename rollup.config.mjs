import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { ivi } from "@ivi/rollup-plugin";
import { minify, defineRollupSwcMinifyOption } from 'rollup-plugin-swc3'
import fs from 'fs';

const copyCss = () => {
  return {
    name: 'copyCss',
    closeBundle: () => {
      fs.copyFileSync(`./src/main.css`, './dist/styles.css');
      fs.copyFileSync(`./src/modern-normalize.css`, './dist/modern-normalize.css');
    },
  }
};

export default [
  {
    input: `./src/main.ts`,
    output: {
      file: "./dist/bundle.min.js",
      format: "es",
      strict: true,
      sourcemap: true,
    },
    watch: {
      clearScreen: false,
    },
    plugins: [
      nodeResolve(),
      typescript(),
      ivi({}),
      // minify(
      //   defineRollupSwcMinifyOption({
      //     compress: {
      //       inline: 0,
      //       keep_infinity: true,
      //     },
      //     toplevel: true,
      //     module: true,
      //     sourceMap: true,
      //   })
      // ),
      copyCss(),
    ],
  },
];