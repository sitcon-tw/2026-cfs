import planData from "@data/plan.json" with { type: "json" };

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
