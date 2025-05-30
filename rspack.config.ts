import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
import path from "path";

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ["chrome >= 87", "edge >= 88", "firefox >= 78", "safari >= 14"];

export default defineConfig({
	entry: {
		host: "./src/host.ts",
		iframe: "./src/iframe.ts"
	},
	output: {
		clean: true,
		module: true,
		library: {
			type: 'modern-module',
		},
	},
	experiments: {
		outputModule: true,
	},
	resolve: {
		extensions: ["...", ".ts"],
		alias: {
			"@": path.resolve(__dirname, "src")
		}
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset"
			},
			{
				test: /\.js$/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "ecmascript"
								}
							},
							env: { targets }
						}
					}
				]
			},
			{
				test: /\.ts$/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "typescript"
								}
							},
							env: { targets }
						}
					}
				]
			}
		]
	},
	optimization: {
		minimizer: [
			new rspack.SwcJsMinimizerRspackPlugin(),
			new rspack.LightningCssMinimizerRspackPlugin({
				minimizerOptions: { targets }
			})
		]
	},
	plugins: [
		new rspack.DefinePlugin({
			__IS_DEV__: JSON.stringify(process.env.NODE_ENV === "development")
		})
	],
});
