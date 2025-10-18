export interface InterestedItem {
	id: string;
	title: string;
	category: string;
	image: string;
	deadline: string;
	price?: string; // Price like "$40,000" or plan info like "包含在領航級"
	minimalPlan?: string; // The minimal plan that includes this item (plan id like "navigator")
}

declare global {
	interface Window {
		dataLayer: any[];
	}
}

const INTEREST_ITEMS_KEY = "interestItems";

function dispatchItemsChangeEvent(): void {
	if (typeof window === "undefined") return;

	const event = new CustomEvent("itemsChange", {
		detail: { items: getInterestedItems() }
	});
	window.dispatchEvent(event);
}

export function getInterestedItems(): InterestedItem[] {
	if (typeof window === "undefined") return [];

	try {
		const items = localStorage.getItem(INTEREST_ITEMS_KEY);
		return items ? JSON.parse(items) : [];
	} catch (error) {
		console.error("Error getting interested items from localStorage:", error);
		return [];
	}
}

export function addInterestedItem(item: InterestedItem): boolean {
	if (typeof window === "undefined") return false;

	try {
		const items = getInterestedItems();
		const existingIndex = items.findIndex(i => i.id === item.id);

		if (existingIndex === -1) {
			items.push(item);
			const price = item.price ? parseInt(item.price.replace(/[^0-9]/g, "")) : 0;
			window.dataLayer.push({
				event: "add_to_cart",
				ecommerce: {
					currency: "TWD",
					value: price,
					items: [
						{
							item_id: item.id,
							item_name: item.title || "unknown",
							item_category: "2026 CFS",
							price
						}
					]
				},
				page_path: window.location.pathname
			});
			localStorage.setItem(INTEREST_ITEMS_KEY, JSON.stringify(items));
			dispatchItemsChangeEvent();
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error adding interested item to localStorage:", error);
		return false;
	}
}

export function removeInterestedItem(itemId: string): boolean {
	if (typeof window === "undefined") return false;

	try {
		const items = getInterestedItems();
		const filteredItems = items.filter(item => item.id !== itemId);
		localStorage.setItem(INTEREST_ITEMS_KEY, JSON.stringify(filteredItems));
		dispatchItemsChangeEvent();
		return true;
	} catch (error) {
		console.error("Error removing interested item from localStorage:", error);
		return false;
	}
}

export function isItemInterested(itemId: string): boolean {
	if (typeof window === "undefined") return false;

	const items = getInterestedItems();
	return items.some(item => item.id === itemId);
}

export function clearInterestedItems(): boolean {
	if (typeof window === "undefined") return false;

	try {
		localStorage.removeItem(INTEREST_ITEMS_KEY);
		dispatchItemsChangeEvent();
		return true;
	} catch (error) {
		console.error("Error clearing interested items from localStorage:", error);
		return false;
	}
}
