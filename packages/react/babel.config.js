const webVitalsPolyfillPath = require.resolve("web-vitals/dist/polyfill.js");
const fs = require("fs");

const webVitalsPolyfill = fs.readFileSync(webVitalsPolyfillPath, "utf8");

module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" }, modules: false }],
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
  plugins: [
    "@babel/plugin-transform-modules-commonjs",
    [
      "search-and-replace",
      {
        rules: [
          {
            search: "__WEB_VITALS_POLYFILL__",
            replace: webVitalsPolyfill,
          },
        ],
      },
    ],
  ],
};
