module.exports = {
    root: true,
    extends: ["@react-native", "plugin:@typescript-eslint/recommended", "prettier"],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "import"],
    settings: { "import/resolver": { typescript: {} } }
  };