import { isDeadlinePassed } from "./local-storage.js";

// Minimal shape needed to evaluate stock/expiry status
export type StockedItem = {
	remaining: string;
	sub?: { remaining: string }[];
	deadline?: string;
};

export function isSoldOut(item: StockedItem): boolean {
	const subItems = item.sub ?? [];
	const hasSubItems = subItems.length > 0;
	return item.remaining === "0" || (hasSubItems && subItems.every(sub => sub.remaining === "0"));
}

export function isInactive(item: StockedItem): boolean {
	return isSoldOut(item) || isDeadlinePassed(item.deadline || "");
}
