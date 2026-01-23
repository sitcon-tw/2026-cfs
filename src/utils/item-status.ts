import { isDeadlinePassed } from "./local-storage";

// Minimal shape needed to evaluate stock/expiry status
export type StockedItem = {
	remaining: string;
	sub?: { remaining: string }[];
	deadline?: string;
};

export function isSoldOut(item: StockedItem): boolean {
	const hasSubItems = item.sub && item.sub.length > 0;
	return item.remaining === "0" || (hasSubItems && item.sub!.every(sub => sub.remaining === "0") && item.sub!.length > 0);
}

export function isInactive(item: StockedItem): boolean {
	return isSoldOut(item) || isDeadlinePassed(item.deadline || "");
}
