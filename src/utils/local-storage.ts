export interface InterestedItem {
	id: string;
	title: string;
	category: string;
	image: string;
	deadline: string;
	quantity?: number;
	maxQuantity?: number | null; // null = unlimited (不限), number = max X
	price?: string; // Price like "$40,000" or plan info like "包含在領航級"
	minimalPlan?: string; // The minimal plan that includes this item (plan id like "navigator")
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

export function updateItemQuantity(itemId: string, quantity: number): boolean {
	if (typeof window === "undefined") return false;

	try {
		const items = getInterestedItems();
		const item = items.find(i => i.id === itemId);

		if (item) {
			// Validate quantity (allow 0 for removal)
			if (quantity < 0) return false;
			if (item.maxQuantity != null && quantity > item.maxQuantity) return false;

			// If quantity is 0, remove the item instead
			if (quantity === 0) {
				return removeInterestedItem(itemId);
			}

			item.quantity = quantity;
			localStorage.setItem(INTEREST_ITEMS_KEY, JSON.stringify(items));
			dispatchItemsChangeEvent();
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error updating item quantity:", error);
		return false;
	}
}

export function getItemQuantity(itemId: string): number {
	if (typeof window === "undefined") return 0;

	const items = getInterestedItems();
	const item = items.find(i => i.id === itemId);
	return item?.quantity || 0;
}
