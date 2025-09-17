/**
 * Utility functions for loading items data from individual markdown folders
 */

export interface ItemDataRaw {
  id: string;
  remaining: number;
  category: string;
  deadline: string;
  price: string;
  [locale: string]: any; // Allow for locale-specific nested objects
}

export interface ItemData {
  id: string;
  remaining: number;
  unit: string;
  category: string;
  title: string;
  description: string;
  deadline: string;
  price: string;
}

function extractLocalizedData(rawData: ItemDataRaw, locale: string): ItemData {
  // Check if data has the new format with locale-specific nested objects
  if (rawData[locale] && typeof rawData[locale] === 'object') {
    // New format: extract from locale object
    const localeData = rawData[locale];
    return {
      id: rawData.id,
      remaining: rawData.remaining,
      category: rawData.category,
      deadline: rawData.deadline,
      price: rawData.price,
      unit: localeData.unit || '',
      title: localeData.title || '',
      description: localeData.description || ''
    };
  } else {
    // Old format: assume the fields are already in the root object as keys
    return {
      id: rawData.id,
      remaining: rawData.remaining,
      category: rawData.category,
      deadline: rawData.deadline,
      price: rawData.price,
      unit: (rawData as any).unit || '',
      title: (rawData as any).title || '',
      description: (rawData as any).description || ''
    };
  }
}

export async function loadItemsData(locale: string = 'zh-Hant'): Promise<ItemData[]> {
  // Import all data.json files from markdown folders
  const dataFiles = import.meta.glob<{ default: ItemDataRaw }>('../data/items/**/data.json');

  const items: ItemData[] = [];

  // Load each data.json file
  for (const path in dataFiles) {
    try {
      const module = await dataFiles[path]();
      const localizedItem = extractLocalizedData(module.default, locale);
      items.push(localizedItem);
    } catch (error) {
      console.error(`Failed to load item data from ${path}:`, error);
    }
  }

  // Sort by ID to maintain consistent order
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadItemData(id: string, locale: string = 'zh-Hant'): Promise<ItemData | null> {
  try {
    const module = await import(`@data/items/${id}/data.json`);
    return extractLocalizedData(module.default, locale);
  } catch (error) {
    console.error(`Failed to load item data for ID ${id}:`, error);
    return null;
  }
}

export async function loadItemsByCategory(category: string, locale: string = 'zh-Hant'): Promise<ItemData[]> {
  const allItems = await loadItemsData(locale);
  return allItems.filter(item => item.category === category);
}

export async function getAvailableItemIds(): Promise<string[]> {
  const dataFiles = import.meta.glob('@data/items/**/data.json');
  const ids: string[] = [];

  for (const path in dataFiles) {
    const match = path.match(/\/items\/([^\/]+)\/data\.json$/);
    if (match) {
      ids.push(match[1]);
    }
  }

  return ids.sort();
}
