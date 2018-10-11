import nodeResolve from "rollup-plugin-node-resolve";

export default {
  input: "lib/example.js",
  plugins: [nodeResolve({ jsnext: true, main: true })],
  output: { file: "example/app.js", format: "iife" }
};
