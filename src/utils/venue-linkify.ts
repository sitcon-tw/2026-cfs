/**
 * Utility functions for linkifying venue codes (R0, R1, R2, R3, lounge) in text
 */

/**
 * List of venue codes to detect and linkify
 */
const VENUE_CODES = ["R0", "R1", "R2", "R3", "lounge"];

/**
 * Linkifies venue codes in text by wrapping them in clickable links
 * @param text - The text to process
 * @returns HTML string with venue codes wrapped in links
 */
export function linkifyVenueCodes(text: string): string {
	if (!text) return text;

	let result = text;

	// Create a regex pattern that matches venue codes as whole words
	// This ensures we don't match R0 inside other words
	VENUE_CODES.forEach(code => {
		const regex = new RegExp(`\\b(${code})\\b`, "gi");
		result = result.replace(regex, match => {
			return `<a href="#" class="venue-link" data-venue-code="${match.toUpperCase()}">${match}</a>`;
		});
	});

	return result;
}

/**
 * Client-side function to open venue details popup and scroll to specific venue
 * This function should be attached to window object
 */
export function openVenueDetails(venueCode?: string) {
	// Close any currently open popup first
	if (window.popupCtrl) {
		// Find all open popups and close them
		const openPopups = document.querySelectorAll(".popup-bg.show");
		openPopups.forEach(popupBg => {
			const popup = popupBg.previousElementSibling as HTMLElement;
			if (popup && popup.id && popup.id !== "place-staff-popup") {
				window.popupCtrl(popup.id, "close", false, popupBg as HTMLElement);
			}
		});

		// Wait for close animation, then open the venue details popup
		const openDelay = openPopups.length > 0 ? 350 : 0;

		setTimeout(() => {
			// Open the place-staff popup
			window.popupCtrl("place-staff-popup", "open");

			// Wait for popup to open and DOM to update
			setTimeout(() => {
				// Find the venue details section
				const venueSection = document.querySelector("#venue-details-section");
				const placeSectionTitle = document.querySelector(".place-section-title");

				// Scroll to the place detail section title first
				if (placeSectionTitle) {
					placeSectionTitle.scrollIntoView({ behavior: "smooth", block: "start" });
				} else if (venueSection) {
					venueSection.scrollIntoView({ behavior: "smooth", block: "start" });
				}

				// If a specific venue code is provided, scroll to it
				if (venueCode) {
					setTimeout(() => {
						const venueElement = document.querySelector(`.venue[data-venue-code="${venueCode}"]`);
						if (venueElement) {
							// Scroll to the specific venue
							venueElement.scrollIntoView({ behavior: "smooth", block: "center" });
						}
					}, 400);
				}
			}, 150);
		}, openDelay);
	}
}

// Export types for TypeScript
declare global {
	interface Window {
		openVenueDetails?: (venueCode?: string) => void;
	}
}
