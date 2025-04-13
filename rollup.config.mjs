import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { ivi } from "@ivi/rollup-plugin";
import { minify, defineRollupSwcMinifyOption } from 'rollup-plugin-swc3'
import fs from 'fs';

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
      copyCss()
    ],
  },
];