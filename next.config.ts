import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbo: {
    rules: {
      "*.svg": { loaders: ["@svgr/webpack"], as: "*.js" },
    },
  },
  webpack(config) {
    const assetRule = config.module.rules.find(
      // @ts-ignore
      (rule) => rule && rule.test && rule.test.test && rule.test.test(".svg")
    );
    if (assetRule) {
      // @ts-ignore
      assetRule.exclude = /\.svg$/i;
    }

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: { and: [/\.(ts|tsx|js|jsx)$/] },
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [
                { name: "preset-default", params: { overrides: { removeUnknownsAndDefaults: { keepDataAttrs: true } } } },
              ],
            },
            titleProp: true,
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
