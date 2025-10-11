// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://sitcon.org",
	base: "/2026/cfs",
	output: "static",
	trailingSlash: "ignore",
	build: {
		format: "directory"
	}
});
