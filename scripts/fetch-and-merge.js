import fs from 'fs';
import https from 'https';
import path from 'path';
import { parse } from 'csv-parse';

// Read configuration from sheet.json with error handling
let sheetConfig;
try {
  sheetConfig = JSON.parse(fs.readFileSync('./scripts/sheet.json', 'utf8'));
} catch (error) {
  console.error('Failed to read or parse sheet.json:', error.message);
  console.error('Make sure the file exists and contains valid JSON.');
  process.exit(1);
}

// Validate configuration data
function validateConfig(config) {
  if (!config.spreadsheet_id || typeof config.spreadsheet_id !== 'string') {
    throw new Error('Invalid or missing spreadsheet_id in configuration');
  }
  if (!config.sheets || typeof config.sheets !== 'object') {
    throw new Error('Invalid or missing sheets configuration');
  }
  return config;
}

try {
  validateConfig(sheetConfig);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const SPREADSHEET_ID = sheetConfig.spreadsheet_id;
const SHEET_GIDS = sheetConfig.sheets;

function buildCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
}

function fetchCsv(url, redirectCount = 0) {
  const MAX_REDIRECTS = 5;

  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error(`Too many redirects (${redirectCount}). Possible redirect loop.`));
      return;
    }

    https.get(url, (response) => {
      if (response.statusCode === 307 || response.statusCode === 301) {
        // Handle redirect with validation
        const redirectUrl = response.headers.location;
        if (!redirectUrl || !redirectUrl.startsWith('https://')) {
          reject(new Error('Invalid or insecure redirect URL'));
          return;
        }
        fetchCsv(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const csvData = Buffer.concat(chunks).toString('utf8');
        resolve(csvData);
      });
    }).on('error', reject);
  });
}

function extractGoogleDriveId(url) {
  if (!url) return null;

  // Match patterns like:
  // https://drive.google.com/file/d/FILE_ID/view?usp=...
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getExtensionFromContentType(contentType) {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };
  return mimeToExt[contentType] || '.jpg'; // default to .jpg
}

function downloadImage(fileId, outputPath) {
  return new Promise((resolve, reject) => {
    if (!fileId) {
      resolve(null);
      return;
    }

    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const handleFinalResponse = (finalResponse) => {
      if (finalResponse.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${finalResponse.statusCode}`));
        return;
      }

      // Get extension from content-type header
      const contentType = finalResponse.headers['content-type'];
      const ext = getExtensionFromContentType(contentType);
      const finalOutputPath = outputPath + ext;

      const fileStream = fs.createWriteStream(finalOutputPath);
      finalResponse.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(finalOutputPath);
      });

      fileStream.on('error', reject);
    };

    https.get(url, (response) => {
      // Handle all redirect status codes
      if (response.statusCode === 307 || response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect URL not found'));
          return;
        }

        https.get(redirectUrl, (redirectResponse) => {
          // Handle nested redirects
          if (redirectResponse.statusCode === 307 || redirectResponse.statusCode === 301 ||
              redirectResponse.statusCode === 302 || redirectResponse.statusCode === 303) {
            const secondRedirectUrl = redirectResponse.headers.location;
            if (!secondRedirectUrl) {
              reject(new Error('Second redirect URL not found'));
              return;
            }

            https.get(secondRedirectUrl, handleFinalResponse).on('error', reject);
            return;
          }

          handleFinalResponse(redirectResponse);
        }).on('error', reject);
        return;
      }

      handleFinalResponse(response);
    }).on('error', reject);
  });
}

function parseCsv(csvData) {
  return new Promise((resolve, reject) => {
    const records = [];
    parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    .on('readable', function() {
      let record;
      while (record = this.read()) {
        records.push(record);
      }
    })
    .on('error', reject)
    .on('end', () => resolve(records));
  });
}

async function fetchAllSheets() {
  console.log('Fetching all sheets...');

  const fetchPromises = Object.entries(SHEET_GIDS).map(async ([sheetName, gid]) => {
    console.log(`Fetching ${sheetName} sheet...`);
    try {
      const url = buildCsvUrl(gid);
      const csvData = await fetchCsv(url);
      const records = await parseCsv(csvData);
      console.log(`✓ ${sheetName}: ${records.length} records`);
      return [sheetName, records];
    } catch (error) {
      console.error(`✗ Failed to fetch ${sheetName}:`, error.message);
      throw error;
    }
  });

  const results = await Promise.all(fetchPromises);
  const sheets = Object.fromEntries(results);

  return sheets;
}

function findItemInSheet(sheets, sheetName, itemId) {
  const sheet = sheets[sheetName];
  if (!sheet) return null;

  return sheet.find(row => row['編號'] === itemId || row['編號'] === itemId.toString());
}

function extractSubItems(itemRow) {
  const subItems = [];
  const MAX_SUB_ITEMS = 50; // Safety limit to prevent infinite loops
  let index = 1;

  while (index <= MAX_SUB_ITEMS) {
    const nameZhKey = `子項目${index}`;
    const nameEnKey = `sub projects ${index}`;
    const priceKey = `子項目${index}價錢`;
    const imageKey = `子項目${index}圖片連結`;
    const imageDescZhKey = `子項目${index}圖片 敘述`;
    const imageDescEnKey = `子項目${index}圖片 description`;

    // Check if this sub-item exists
    if (!itemRow[nameZhKey] && !itemRow[nameEnKey]) {
      break;
    }

    // Only add if there's actual content
    if (itemRow[nameZhKey] || itemRow[nameEnKey]) {
      const imageUrl = itemRow[imageKey] || '';
      const imageId = extractGoogleDriveId(imageUrl);

      subItems.push({
        name_zh: itemRow[nameZhKey] || '',
        name_en: itemRow[nameEnKey] || '',
        price: itemRow[priceKey] || '',
        image: imageId || '',
        image_description_zh: itemRow[imageDescZhKey] || '',
        image_description_en: itemRow[imageDescEnKey] || ''
      });
    }

    index++;
  }

  if (index > MAX_SUB_ITEMS) {
    console.warn(`Warning: Reached maximum sub-items limit (${MAX_SUB_ITEMS}) for an item. Some sub-items may have been skipped.`);
  }

  return subItems;
}

function mergeSheetData(sheets) {
  console.log('Merging sheet data...');
  const items = {};
  const itemsSheet = sheets.items;

  if (!itemsSheet || itemsSheet.length === 0) {
    throw new Error('Items sheet is empty or not found');
  }

  itemsSheet.forEach(itemRow => {
    const itemId = itemRow['編號'];
    if (!itemId) return;

    // Find corresponding rows in category sheets
    const globalDesc = findItemInSheet(sheets, 'global_description', itemId);
    const talentRec = findItemInSheet(sheets, 'talent_recruitment', itemId);
    const brandExp = findItemInSheet(sheets, 'brand_exposure', itemId);
    const productProm = findItemInSheet(sheets, 'product_promotion', itemId);

    // Extract sub-items
    const subItems = extractSubItems(itemRow);

    // Extract image ID from the main image URL
    const mainImageUrl = itemRow['圖片連結'] || '';
    const mainImageId = extractGoogleDriveId(mainImageUrl);

    items[itemId] = {
      name: itemRow['項目'] || itemRow['項目名稱'] || '',
      quantity: itemRow['數量'] || '',

      global_description_zh: globalDesc?.['文案'] || '',
      global_description_en: globalDesc?.['description'] || '',

      talent_recruitment_zh: talentRec?.['文案'] || '',
      talent_recruitment_en: talentRec?.['description'] || '',

      brand_exposure_zh: brandExp?.['文案'] || '',
      brand_exposure_en: brandExp?.['description'] || '',

      product_promotion_zh: productProm?.['文案'] || '',
      product_promotion_en: productProm?.['description'] || '',

      image: mainImageId || '',
      image_description_zh: itemRow['圖片 敘述'] || '',
      image_description_en: itemRow['圖片 description'] || '',

      price: itemRow['價錢（這欄與贊助分級和子項目是互斥關係）'] || '',

      deadline: globalDesc?.['截止時間'] || '',

      talent_recruitment_order: parseInt(talentRec?.['排序'] || '0') || 0,
      brand_exposure_order: parseInt(brandExp?.['排序'] || '0') || 0,
      product_promotion_order: parseInt(productProm?.['排序'] || '0') || 0,

      sub: subItems
    };
  });

  console.log(`✓ Merged ${Object.keys(items).length} items`);
  return items;
}

async function downloadAllImages(itemsData) {
  console.log('Downloading images...');

  // Create images directory if it doesn't exist
  const imagesDir = './src/assets/img/items';

  // Clear old images
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    for (const file of files) {
      fs.unlinkSync(path.join(imagesDir, file));
    }
    console.log(`✓ Cleared ${files.length} old images`);
  } else {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`✓ Created directory: ${imagesDir}`);
  }

  const downloadTasks = [];
  const imageIds = new Set();
  const imageIdToFileName = {}; // Map to store ID -> filename with extension

  // Collect all unique image IDs
  Object.values(itemsData).forEach(item => {
    if (item.image) {
      imageIds.add(item.image);
    }
    item.sub.forEach(subItem => {
      if (subItem.image) {
        imageIds.add(subItem.image);
      }
    });
  });

  console.log(`Found ${imageIds.size} unique images to download`);

  // Download all images
  for (const imageId of imageIds) {
    const outputPath = path.join(imagesDir, imageId);

    downloadTasks.push(
      downloadImage(imageId, outputPath)
        .then((filePath) => {
          const fileName = path.basename(filePath);
          imageIdToFileName[imageId] = fileName;
          console.log(`✓ Downloaded ${fileName}`);
        })
        .catch(err => console.error(`✗ Failed to download ${imageId}:`, err.message))
    );
  }

  await Promise.all(downloadTasks);

  // Update itemsData with filenames including extensions
  Object.values(itemsData).forEach(item => {
    if (item.image && imageIdToFileName[item.image]) {
      item.image = imageIdToFileName[item.image];
    }
    item.sub.forEach(subItem => {
      if (subItem.image && imageIdToFileName[subItem.image]) {
        subItem.image = imageIdToFileName[subItem.image];
      }
    });
  });

  console.log(`✓ Image download complete`);
}

async function main() {
  try {
    console.log('Starting Google Sheets to JSON conversion...');

    // Fetch all sheets
    const sheets = await fetchAllSheets();

    // Merge data
    const mergedData = mergeSheetData(sheets);

    // Download images
    await downloadAllImages(mergedData);

    // Write to file
    const outputPath = './src/data/item.json';
    const jsonData = JSON.stringify(mergedData, null, 2);

    try {
      fs.writeFileSync(outputPath, jsonData, 'utf8');
      console.log(`✓ Successfully wrote merged data to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to write ${outputPath}:`, error.message);
      throw error;
    }

    // Generate and save plans using the same sheets data and items data
    const plansData = await fetchAndSavePlans(sheets, mergedData);

    // Display summary
    console.log('\nSummary:');
    console.log(`- Total items: ${Object.keys(mergedData).length}`);
    console.log(`- Items with sub-items: ${Object.values(mergedData).filter(item => item.sub.length > 0).length}`);
    console.log(`- Sponsorship plans: ${Object.keys(plansData).length}`);

    console.log('\n✓ Fetch and merge completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

function processPlanData(planSheet, itemsData) {
  console.log('Processing sponsorship plans data...');

  if (!planSheet || planSheet.length === 0) {
    throw new Error('Plan sheet is empty or not found');
  }

  // Build dynamic name→ID mapping from items data
  const itemNameToId = {};
  Object.keys(itemsData).forEach(id => {
    const itemName = itemsData[id].name;
    if (itemName) {
      itemNameToId[itemName] = id;
    }
  });

  console.log(`✓ Built mapping for ${Object.keys(itemNameToId).length} items`);

  // Extract headers (plan tier names) from first row
  const headerRow = planSheet[0];
  const planTiers = [];

  // Skip first two columns (empty and '價格'), get plan names
  for (let i = 2; i < Object.keys(headerRow).length; i++) {
    const tierName = headerRow[Object.keys(headerRow)[i]];
    if (tierName && tierName.trim()) {
      planTiers.push({
        index: i,
        name_zh: tierName.trim(),
        name_en: '', // Will be set later
        id: tierName.trim().toLowerCase()
      });
    }
  }

  // Extract prices from second row
  const priceRow = planSheet[1];
  planTiers.forEach((tier, index) => {
    const priceKey = Object.keys(priceRow)[tier.index];
    tier.price = priceRow[priceKey] || '';
  });

  // Process plan data
  const plans = {};

  planTiers.forEach((tier, tierIndex) => {
    // Generate English names and IDs
    const nameMap = {
      '領航級': { en: 'Navigator Tier', id: 'navigator' },
      '深耕級': { en: 'Deep Cultivation Tier', id: 'deep_cultivation' },
      '前瞻級': { en: 'Visionary Tier', id: 'visionary' },
      '新芽級': { en: 'New Sprout Tier', id: 'new_sprout' }
    };

    const mapped = nameMap[tier.name_zh] || { en: tier.name_zh, id: tier.id };

    plans[mapped.id] = {
      id: mapped.id,
      name_zh: tier.name_zh,
      name_en: mapped.en,
      price: tier.price,
      order: tierIndex + 1,
      benefits: []
    };
  });

  // Extract benefits from remaining rows
  for (let rowIndex = 2; rowIndex < planSheet.length; rowIndex++) {
    const row = planSheet[rowIndex];
    const keys = Object.keys(row);

    // Extract item name from the first column (which has empty key '')
    const itemName = row[keys[0]] ? row[keys[0]].toString().trim() : '';

    // Get the ID from the dynamic mapping built from items data
    const itemId = itemNameToId[itemName] || '';

    // Only skip if there's no itemName, or if itemName exists but looks like a category header
    if (!itemName) {
      continue;
    }

    // Skip obvious category headers (items that don't exist in our mapping AND look like categories)
    const categoryPattern = /^(年會現場|Logo曝光|網路宣傳|.*曝光)$/;
    if (!itemNameToId.hasOwnProperty(itemName) && categoryPattern.test(itemName)) {
      continue;
    }

    // Process benefits for each tier (including blank quantities)
    planTiers.forEach((tier) => {
      const benefitValue = row[keys[tier.index]];
      const quantity = benefitValue ? benefitValue.toString().trim() : '';

      const benefit = {
        item_id: itemId,
        item_name: itemName,
        quantity: quantity
      };

      const planId = Object.keys(plans)[planTiers.indexOf(tier)];
      if (plans[planId]) {
        plans[planId].benefits.push(benefit);
      }
    });
  }

  console.log(`✓ Processed ${Object.keys(plans).length} sponsorship plans`);
  return plans;
}

async function fetchAndSavePlans(sheets, itemsData) {
  try {
    console.log('Processing sponsorship plans...');

    const planSheet = sheets.sponsorship_plans;

    if (!planSheet) {
      throw new Error('Sponsorship plans sheet not found');
    }

    // Process plans data with items data for dynamic mapping
    const plansData = processPlanData(planSheet, itemsData);

    // Write plans to file
    const outputPath = './src/data/plan.json';
    const jsonData = JSON.stringify(plansData, null, 2);

    try {
      fs.writeFileSync(outputPath, jsonData, 'utf8');
      console.log(`✓ Successfully wrote plans data to ${outputPath}`);
    } catch (error) {
      console.error(`Failed to write ${outputPath}:`, error.message);
      throw error;
    }

    return plansData;
  } catch (error) {
    console.error('Error processing plans:', error.message);
    throw error;
  }
}

export { fetchAllSheets, mergeSheetData, processPlanData, fetchAndSavePlans };
