import path from "path";
import react from "@vitejs/plugin-react";
import pkg from "../../package.json";

const root = path.resolve(__dirname, '..', '..');

/** @type {import('vite').UserConfig} */
export default {
  root: path.resolve(root, "example" , "web"),
  // pkg,
  plugins: [react()],
  define: {
    global: "window",
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  resolve: {
    extensions: [
      ".json",
      ".js",
      ".mjs",
      ".ts",
      ".jsx",
      ".tsx",
      ".web.js",
      ".web.mjs",
      ".web.ts",
      ".web.jsx",
      ".web.tsx",
    ],
    alias: {
      "react-native": "react-native-web",
      [pkg.name]: path.resolve(root, pkg.source),
    },
  },
};
