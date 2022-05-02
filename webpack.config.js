const path = require("path");

module.exports = {
  entry: {
    webview: "./src/webview/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "webview"),
    filename: "[name].js",
  },
  devtool: "eval-source-map",
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json", ".svg"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        options: {},
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
        ],
      },
    ],
  },
  performance: {
    hints: false,
  },
};
