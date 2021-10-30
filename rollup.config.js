import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

import pkg from './package.json';

const production = !process.env.ROLLUP_WATCH;

function toMinPath(path) {
  return path.replace(/\.js$/, '.min.js');
}

const configs = {
  input: './src/input.ts',
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    typescript(),
    terser(),
    replace({
      preventAssignment: true,
      'process.browser': true,
      isProd: production,
    }),
  ],
  output: [
    {
      name: 'TrackSession',
      format: 'iife',
      file: toMinPath(pkg.unpkg),
      sourcemap: true,
    },
  ],
};

export default configs;
