import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  entry: 'example.js',
  plugins: [ nodeResolve({jsnext: true, main: true}) ],
  format: 'iife',
  moduleName: 'm',
};
