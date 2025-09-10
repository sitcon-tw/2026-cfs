// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://sitcon.org",
	base: "/cfs",
	output: "static",
	trailingSlash: "never",
	build: {
		format: "file"
	}
});
