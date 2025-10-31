import { isItemInterested, addInterestedItem, removeInterestedItem, getInterestedItems, isDeadlinePassed, type InterestedItem } from "./local-storage.js";
import { getItemDisplayPrice } from "./plan-helper.js";

declare global {
	interface Window {
		popupCtrl: (id: string, action: string) => void;
	}
}

/**
 * Handles the click event on an add button
 * @param button - The button element that was clicked
 * @param event - The click event
 */
export function handleAddButtonClick(button: HTMLElement, event: Event): void {
	event.preventDefault();
	event.stopPropagation();

	const id = button.getAttribute("data-item-id") || "";
	const itemDeadline = button.getAttribute("data-item-deadline") || "";

	// Check if deadline has passed
	if (isDeadlinePassed(itemDeadline)) {
		return; // Don't allow adding expired items
	}

	// Check if this item has sub-items
	const card = button.closest(".card") || button.closest(".addon-card");
	const hasSubItems = card?.getAttribute("data-has-sub-items") === "true" || button.getAttribute("data-has-sub-items") === "true";

	if (hasSubItems) {
		// Open the popup for items with sub-items
		const popupId = `item-popup-${id}`;
		if (typeof window.popupCtrl === "function") {
			window.popupCtrl(popupId, "open");
		}
	} else {
		// Toggle interested state for items without sub-items
		const itemTitle = button.getAttribute("data-item-title") || button.getAttribute("data-item-name") || "";
		const itemImage = button.getAttribute("data-item-image") || "";
		const itemPrice = button.getAttribute("data-item-price") || "";

		if (isItemInterested(id)) {
			// Remove from interested items
			removeInterestedItem(id);
		} else {
			// Add to interested items
			const deadlineEl = card?.querySelector(".deadline-tag");
			const displayDeadline = deadlineEl?.textContent || "";

			// Get user's language preference (default to zh-Hant if not available)
			const userLang = document.documentElement.lang || navigator.language || "zh-Hant";

			// Get display price (either actual price or plan inclusion info)
			const displayPrice = getItemDisplayPrice(id, itemPrice, userLang);

			addInterestedItem({
				id: id,
				title: itemTitle,
				category: "all",
				image: itemImage,
				deadline: displayDeadline,
				price: displayPrice
			});
		}
	}
}

/**
 * Updates the visual state of all add buttons based on the cart state
 */
export function updateAddButtonStates(): void {
	const items = getInterestedItems();
	const ids = new Set(items.map((i: InterestedItem) => i.id));

	const addButtons = document.querySelectorAll(".add-button") as NodeListOf<HTMLButtonElement>;
	addButtons.forEach(button => {
		const itemId = button.getAttribute("data-item-id");
		const deadline = button.getAttribute("data-item-deadline") || "";

		// Check if deadline has passed
		const expired = isDeadlinePassed(deadline);
		if (expired) {
			button.setAttribute("disabled", "true");
			button.classList.add("disabled");
		} else {
			button.removeAttribute("disabled");
			button.classList.remove("disabled");
		}

		if (itemId) {
			// Check if this item or any of its sub-items are in cart
			let hasItemInCart = ids.has(itemId);

			// Also check if any sub-items are in cart (sub-items have IDs like "parent-id-sub-0")
			if (!hasItemInCart) {
				for (const id of ids) {
					if (typeof id === "string" && id.startsWith(itemId + "-sub-")) {
						hasItemInCart = true;
						break;
					}
				}
			}

			if (hasItemInCart) {
				button.classList.add("added");
			} else {
				button.classList.remove("added");
			}
		}
	});
}

// Track if global handlers have been set up to avoid duplicates
let globalHandlersInitialized = false;
// Use Set for better duplicate prevention and to avoid memory leaks
let cardClickCallbacks: Set<(itemId: string, event: Event) => void> = new Set();
// Track which cards have been initialized to prevent duplicate handlers
const initializedCards = new WeakSet<HTMLElement>();
// Track registered event listeners to prevent duplicates
let eventListenersRegistered = false;

/**
 * Sets up global click handlers for add buttons (only once)
 * This uses event delegation to handle all add button clicks efficiently
 */
function setupGlobalClickHandlers(): void {
	if (globalHandlersInitialized) return;

	// Handle add button clicks using event delegation
	document.addEventListener("click", e => {
		const target = e.target as Element;
		const button = target.closest(".add-button");

		if (button instanceof HTMLElement) {
			handleAddButtonClick(button, e);
			return;
		}
	});

	globalHandlersInitialized = true;
}

/**
 * Registers a callback for card clicks
 * @param callback - Function to call when a card is clicked
 * @note Function references must be identical to prevent duplicates. If you pass a new function instance each time, it will be registered as a separate callback.
 */
export function registerCardClickHandler(callback: (itemId: string, event: Event) => void): void {
	// Use Set to automatically prevent duplicate callbacks
	cardClickCallbacks.add(callback);
}

/**
 * Sets up card click handlers
 * This should be called after the DOM is loaded and cards are rendered
 */
export function setupCardClickHandlers(): void {
	const cards = document.querySelectorAll(".card, .addon-card") as NodeListOf<HTMLElement>;
	cards.forEach(card => {
		// Skip if this card has already been initialized
		if (initializedCards.has(card)) {
			return;
		}

		const itemId = card.getAttribute("data-card-id") || card.getAttribute("data-item-id");
		if (itemId) {
			card.style.cursor = "pointer";

			card.addEventListener("click", e => {
				// Don't trigger card click if clicking the add button
				const target = e.target as Element;
				if (target.closest(".add-button")) {
					return;
				}
				e.stopPropagation();

				// Call all registered callbacks (Set iteration works the same as Array)
				cardClickCallbacks.forEach(callback => callback(itemId, e));
			});

			// Mark this card as initialized
			initializedCards.add(card);
		}
	});
}

/**
 * Initializes add-to-cart functionality
 * Should be called on DOMContentLoaded
 */
export function initializeAddToCart(
	options: {
		onCardClick?: (itemId: string, event: Event) => void;
	} = {}
): void {
	// Set up global handlers only once
	setupGlobalClickHandlers();

	// Register card click callback if provided
	if (options.onCardClick) {
		registerCardClickHandler(options.onCardClick);
		setupCardClickHandlers();
	}

	// Update button states initially
	updateAddButtonStates();

	// Listen for cart changes only once to prevent duplicate event listeners
	if (!eventListenersRegistered) {
		window.addEventListener("itemsChange", updateAddButtonStates);
		document.addEventListener("interested-items-changed", updateAddButtonStates);
		eventListenersRegistered = true;
	}
}
