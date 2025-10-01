/**
 * Utility functions for loading items data from individual markdown folders
 */

export interface SubItem {
	name_zh: string;
	name_en: string;
	price: string;
	remaining: string;
	image: string;
	image_description_zh: string;
	image_description_en: string;
}

export interface ItemDataRaw {
	name: string;
	order: string;
	quantity: string;
	remaining: string;
	unit: string;
	global_description_zh: string;
	global_description_en: string;
	talent_recruitment_zh: string;
	talent_recruitment_en: string;
	brand_exposure_zh: string;
	brand_exposure_en: string;
	product_promotion_zh: string;
	product_promotion_en: string;
	image: string;
	image_description_zh: string;
	image_description_en: string;
	price: string;
	deadline: string;
	talent_recruitment_order: number;
	brand_exposure_order: number;
	product_promotion_order: number;
	sub: SubItem[];
}

export interface LocalizedSubItem {
	name: string;
	price: string;
	remaining: string;
	image: string;
	image_description: string;
}

export interface ItemData {
	id: string;
	name: string;
	order: string;
	quantity: string;
	remaining: string;
	unit: string;
	global_description: string;
	talent_recruitment: string;
	brand_exposure: string;
	product_promotion: string;
	image: string;
	image_description: string;
	price: string;
	deadline: string;
	talent_recruitment_order: number;
	brand_exposure_order: number;
	product_promotion_order: number;
	sub: LocalizedSubItem[];
}

function extractLocalizedData(rawData: ItemDataRaw, locale: string, id: string): ItemData {
	// Determine suffix based on locale
	const suffix = locale === "zh-Hant" || locale === "zh" ? "_zh" : "_en";

	// Extract localized sub-items
	const localizedSub: LocalizedSubItem[] = rawData.sub.map(subItem => ({
		name: suffix === "_zh" ? subItem.name_zh : subItem.name_en,
		price: subItem.price,
		remaining: subItem.remaining,
		image: subItem.image,
		image_description: suffix === "_zh" ? subItem.image_description_zh : subItem.image_description_en
	}));

	return {
		id,
		name: rawData.name,
		order: rawData.order,
		quantity: rawData.quantity,
		remaining: rawData.remaining,
		unit: rawData.unit,
		global_description: suffix === "_zh" ? rawData.global_description_zh : rawData.global_description_en,
		talent_recruitment: suffix === "_zh" ? rawData.talent_recruitment_zh : rawData.talent_recruitment_en,
		brand_exposure: suffix === "_zh" ? rawData.brand_exposure_zh : rawData.brand_exposure_en,
		product_promotion: suffix === "_zh" ? rawData.product_promotion_zh : rawData.product_promotion_en,
		image: rawData.image,
		image_description: suffix === "_zh" ? rawData.image_description_zh : rawData.image_description_en,
		price: rawData.price,
		deadline: rawData.deadline,
		talent_recruitment_order: rawData.talent_recruitment_order,
		brand_exposure_order: rawData.brand_exposure_order,
		product_promotion_order: rawData.product_promotion_order,
		sub: localizedSub
	};
}

export async function loadItemsData(locale: string = "zh-Hant"): Promise<ItemData[]> {
	// Load the main item.json file
	const itemsModule = await import("../data/item.json");
	const rawItems: Record<string, ItemDataRaw> = itemsModule.default;

	const items: ItemData[] = [];

	// Process each item
	for (const [id, rawData] of Object.entries(rawItems)) {
		try {
			const localizedItem = extractLocalizedData(rawData, locale, id);
			items.push(localizedItem);
		} catch (error) {
			console.error(`Failed to load item data for ID ${id}:`, error);
		}
	}

	// Sort by ID to maintain consistent order
	return items.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadItemData(id: string, locale: string = "zh-Hant"): Promise<ItemData | null> {
	try {
		const allItems = await loadItemsData(locale);
		return allItems.find(item => item.id === id) || null;
	} catch (error) {
		console.error(`Failed to load item data for ID ${id}:`, error);
		return null;
	}
}

export async function getAvailableItemIds(): Promise<string[]> {
	const itemsModule = await import("../data/item.json");
	const rawItems: Record<string, ItemDataRaw> = itemsModule.default;
	return Object.keys(rawItems).sort();
}

export function getItemDescription(item: ItemData, type: "global" | "talent_recruitment" | "brand_exposure" | "product_promotion" = "global"): string {
	switch (type) {
		case "talent_recruitment":
			return item.talent_recruitment;
		case "brand_exposure":
			return item.brand_exposure;
		case "product_promotion":
			return item.product_promotion;
		case "global":
		default:
			return item.global_description;
	}
}
