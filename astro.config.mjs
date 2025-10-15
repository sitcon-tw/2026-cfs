// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
	site: "https://sitcon.org",
	base: "/2026/cfs",
	output: "static",
	trailingSlash: "ignore",
	build: {
		format: "directory"
	},
	integrations: [
		sitemap({
			i18n: {
				defaultLocale: "zh-Hant",
				locales: {
					"zh-Hant": "zh-TW",
					en: "en-US"
				}
			},
			filter: page => {
				return !page.includes("/quotation");
			}
		})
	]
});
