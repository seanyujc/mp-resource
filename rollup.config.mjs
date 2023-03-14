// rollup.config.js
import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import strip from "@rollup/plugin-strip";
import del from "rollup-plugin-delete";

const config = {
  input: "src/mp-resource.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
};

export default [
  defineConfig({
    ...config,
    plugins: [
      del({ targets: "dist/*" }),
      typescript({ removeComments: true }),
      strip(),
    ],
  }),
  defineConfig({
    ...config,
    plugins: [dts()],
  }),
];
