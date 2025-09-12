export interface InterestedItem {
  id: number;
  title: string;
  category: string;
  image: string;
  deadline: string;
}

const INTEREST_ITEMS_KEY = 'interestItems';

function dispatchItemsChangeEvent(): void {
  if (typeof window === 'undefined') return;
  
  const event = new CustomEvent('itemsChange', {
    detail: { items: getInterestedItems() }
  });
  window.dispatchEvent(event);
}

export function getInterestedItems(): InterestedItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const items = localStorage.getItem(INTEREST_ITEMS_KEY);
    return items ? JSON.parse(items) : [];
  } catch (error) {
    console.error('Error getting interested items from localStorage:', error);
    return [];
  }
}

export function addInterestedItem(item: InterestedItem): boolean {
  if (typeof window === 'undefined') return false;

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
    console.error('Error adding interested item to localStorage:', error);
    return false;
  }
}

export function removeInterestedItem(itemId: number): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const items = getInterestedItems();
    const filteredItems = items.filter(item => item.id !== itemId);
    localStorage.setItem(INTEREST_ITEMS_KEY, JSON.stringify(filteredItems));
    dispatchItemsChangeEvent();
    return true;
  } catch (error) {
    console.error('Error removing interested item from localStorage:', error);
    return false;
  }
}

export function isItemInterested(itemId: number): boolean {
  if (typeof window === 'undefined') return false;

  const items = getInterestedItems();
  return items.some(item => item.id === itemId);
}

export function clearInterestedItems(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(INTEREST_ITEMS_KEY);
    dispatchItemsChangeEvent();
    return true;
  } catch (error) {
    console.error('Error clearing interested items from localStorage:', error);
    return false;
  }
}
