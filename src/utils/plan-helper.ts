import planData from "@data/plan.json" with { type: "json" };
import type { ItemDataRaw } from "./items-loader.js";

interface Plan {
	id: string;
	name_zh: string;
	name_en: string;
	price: string;
	order: number;
	benefits: Array<{
		item_id: string;
		item_name: string;
		quantity: string;
	}>;
}

const plans: Plan[] = Object.values(planData);

// Cache for item data to avoid repeated imports
let itemDataCache: Record<string, ItemDataRaw> | null = null;

/**
 * Load and cache item data
 */
async function getItemData(): Promise<Record<string, ItemDataRaw>> {
	if (!itemDataCache) {
		const itemModule = await import("../data/item.json");
		itemDataCache = itemModule.default as Record<string, ItemDataRaw>;
	}
	return itemDataCache;
}

/**
 * Find an item by Chinese name (name_zh) or by ID
 * @param itemNameOrId The Chinese name or ID to search for
 * @returns Object with itemId and itemData (or subItemData for sub-items), or null if not found
 */
export async function findItemByNameOrId(itemNameOrId: string): Promise<{ itemId: string; itemData: ItemDataRaw; subItemData?: ItemDataRaw['sub'][0] } | null> {
	const items = await getItemData();

	// First try direct ID match
	if (items[itemNameOrId]) {
		return { itemId: itemNameOrId, itemData: items[itemNameOrId] };
	}

	// Check for sub-item ID format (e.g., "12-sub-0")
	if (itemNameOrId.includes('-sub-')) {
		const [parentId, , subIndex] = itemNameOrId.split('-');
		const item = items[parentId];
		if (item && item.sub[parseInt(subIndex)]) {
			return {
				itemId: itemNameOrId,
				itemData: item,
				subItemData: item.sub[parseInt(subIndex)]
			};
		}
	}

	// Then try matching by name_zh
	for (const [id, item] of Object.entries(items)) {
		if (item.name_zh === itemNameOrId) {
			return { itemId: id, itemData: item };
		}

		// Also check sub-items
		for (let i = 0; i < item.sub.length; i++) {
			if (item.sub[i].name_zh === itemNameOrId) {
				return {
					itemId: `${id}-sub-${i}`,
					itemData: item,
					subItemData: item.sub[i]
				};
			}
		}
	}

	return null;
}

/**
 * Get localized name for a plan benefit
 * @param benefit The benefit object from plan.json
 * @param lang Language code ("zh-Hant" or "en")
 * @returns Localized name string
 */
export async function getBenefitLocalizedName(benefit: { item_id: string; item_name: string; quantity: string }, lang: string = "zh-Hant"): Promise<string> {
	// If we have an item_id, use it to look up the item
	if (benefit.item_id) {
		const result = await findItemByNameOrId(benefit.item_id);
		if (result) {
			// Use sub-item name if available, otherwise use parent item name
			if (result.subItemData) {
				return lang === "en" ? result.subItemData.name_en : result.subItemData.name_zh;
			}
			return lang === "en" ? result.itemData.name_en : result.itemData.name_zh;
		}
	}

	// If no item_id, try to match by Chinese name
	if (benefit.item_name) {
		const result = await findItemByNameOrId(benefit.item_name);
		if (result) {
			// Use sub-item name if available, otherwise use parent item name
			if (result.subItemData) {
				return lang === "en" ? result.subItemData.name_en : result.subItemData.name_zh;
			}
			return lang === "en" ? result.itemData.name_en : result.itemData.name_zh;
		}
	}

	// Fallback to the original item_name
	return benefit.item_name;
}

/**
 * Find the minimal (cheapest) plan that includes a specific item
 * @param itemId The item ID to search for
 * @returns The plan object or null if not found in any plan
 */
export function findMinimalPlanForItem(itemId: string): Plan | null {
	// Filter plans that include this item
	const plansWithItem = plans.filter(plan => plan.benefits.some(benefit => benefit.item_id === itemId));

	if (plansWithItem.length === 0) {
		return null;
	}

	// Sort by order (lower order = higher tier = more expensive usually, but we want to check)
	// Actually, looking at the data, order 1 is most expensive, so we want the highest order number
	plansWithItem.sort((a, b) => b.order - a.order);

	// Return the plan with highest order (cheapest plan that includes the item)
	return plansWithItem[0];
}

/**
 * Get the display price for an item
 * @param itemId The item ID (can be sub-item ID like "1-sub-0")
 * @param itemPrice The standalone item price (e.g., "$40,000")
 * @param lang Language for display ("zh-Hant" or "en")
 * @returns Display string for price
 */
export function getItemDisplayPrice(itemId: string, itemPrice: string, lang: string = "zh-Hant"): string {
	// Extract parent item ID if this is a sub-item (format: "parentId-sub-index")
	const parentItemId = itemId.includes("-sub-") ? itemId.split("-sub-")[0] : itemId;
	
	const minimalPlan = findMinimalPlanForItem(parentItemId);

	if (minimalPlan) {
		return lang === "en" ? "Plan Included Item" : "方案包含項目";
	}

	// If there's a price, return it, otherwise return empty string (no "洽詢")
	return itemPrice || "";
}

/**
 * Check if an item is included in any plan
 * @param itemId The item ID to check
 * @returns true if included in at least one plan
 */
export function isItemInAnyPlan(itemId: string): boolean {
	return plans.some(plan => plan.benefits.some(benefit => benefit.item_id === itemId));
}
