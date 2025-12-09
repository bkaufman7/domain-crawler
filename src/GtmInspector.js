/**
 * GtmInspector.js
 * Google Tag Manager Container Inspector
 * Fetches and parses public GTM container JS to analyze tags, triggers, variables, and vendors.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

// ===== CONFIG & INIT =====

/**
 * Ensures GTM Inspector sheets exist with proper structure
 * Called automatically when first using GTM Inspector features
 */
function setupGtmInspectorSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create CONFIG sheet if it doesn't exist
  let configSheet = ss.getSheetByName('GTM_CONFIG');
  if (!configSheet) {
    configSheet = ss.insertSheet('GTM_CONFIG');
    configSheet.getRange('A1').setValue('GTM_CONTAINER_ID');
    configSheet.getRange('A1').setFontWeight('bold');
    configSheet.getRange('A2').setNote(
      'Enter a GTM container ID like GTM-XXXXXXX. This script will fetch ' +
      'https://www.googletagmanager.com/gtm.js?id=YOUR_ID and inspect the live published container.'
    );
    
    // Add data validation
    const rule = SpreadsheetApp.newDataValidation()
      .requireTextContains('GTM-')
      .setAllowInvalid(false)
      .setHelpText('Must be a valid GTM container ID starting with GTM-')
      .build();
    configSheet.getRange('A2').setDataValidation(rule);
    
    configSheet.setColumnWidth(1, 200);
    configSheet.setColumnWidth(2, 400);
  }
  
  // Create README sheet if it doesn't exist
  let readmeSheet = ss.getSheetByName('GTM_README');
  if (!readmeSheet) {
    readmeSheet = ss.insertSheet('GTM_README');
    populateGtmReadmeSheet_(readmeSheet);
  }
  
  Logger.log('GTM Inspector sheets initialized');
}

/**
 * Populates the README sheet with documentation
 * @param {Sheet} sheet - The README sheet to populate
 */
function populateGtmReadmeSheet_(sheet) {
  const content = [
    ['GTM Container Inspector – README'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['PURPOSE'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['This tool inspects a public GTM container using only the container ID.'],
    ['It fetches the live published container JavaScript and extracts:'],
    ['  • Tags (with types, vendors, and trigger associations)'],
    ['  • Triggers (with types and conditions)'],
    ['  • Variables (with types and configurations)'],
    ['  • Vendors (detected via pattern matching)'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['HOW IT WORKS'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['The inspectGtmContainer() function:'],
    ['  1. Reads the container ID from GTM_CONFIG sheet'],
    ['  2. Fetches https://www.googletagmanager.com/gtm.js?id=YOUR_ID'],
    ['  3. Parses the compiled JavaScript (best effort)'],
    ['  4. Extracts structured data about tags, triggers, and variables'],
    ['  5. Scans for vendor patterns (GA4, UA, Google Ads, Floodlight, Meta, etc.)'],
    ['  6. Populates the GTM_Tags, GTM_Triggers, GTM_Variables, and GTM_Vendors sheets'],
    [''],
    ['IMPORTANT: GTM\'s compiled JS is obfuscated and may change at any time.'],
    ['Parsing is "best effort" and may not capture everything perfectly.'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['SETUP'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['Step 1: Enter your GTM container ID in GTM_CONFIG!A2'],
    ['        Example: GTM-XXXXXXX'],
    [''],
    ['Step 2: Use the menu: GTM Inspector → Inspect Container'],
    [''],
    ['Step 3: Review the results in GTM_Tags, GTM_Triggers, GTM_Variables, GTM_Vendors'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['TABS OVERVIEW'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['GTM_CONFIG    - Container ID configuration'],
    ['GTM_README    - This documentation'],
    ['GTM_Tags      - All tags with types, vendors, and triggers'],
    ['GTM_Triggers  - All triggers with types and conditions'],
    ['GTM_Variables - All variables with types and details'],
    ['GTM_Vendors   - Detected vendor IDs (GA4, Ads, Floodlight, Meta, TikTok, etc.)'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['LIMITATIONS'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['• Cannot access GTM UI, workspace versions, or unpublished changes'],
    ['• Only inspects the LIVE PUBLISHED container'],
    ['• Parsing is best-effort and may miss advanced GTM features'],
    ['• Obfuscation changes may break parsing (will fail gracefully)'],
    ['• Cannot determine pause/active status of tags'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    ['TROUBLESHOOTING'],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['HTTP Errors:'],
    ['  • Verify the container ID is correct (check GTM_CONFIG)'],
    ['  • Ensure the container is published (not just in preview)'],
    ['  • Check your network connection'],
    [''],
    ['Blank Sheets:'],
    ['  • Container may be empty or newly created'],
    ['  • Parsing may have failed (check Execution log in Apps Script)'],
    ['  • Try the "Clear Output Sheets" menu item and re-run'],
    [''],
    ['Missing Data:'],
    ['  • Check the "raw" columns for unparsed JSON data'],
    ['  • Some advanced tag configurations may not parse correctly'],
    ['  • Vendor detection is regex-based and may miss custom implementations'],
    [''],
    ['═══════════════════════════════════════════════════════════════'],
    [''],
    ['For support, contact: Brian Kaufman - Horizon Media Platform Solutions'],
    ['Last updated: December 8, 2025']
  ];
  
  sheet.getRange(1, 1, content.length, 1).setValues(content);
  sheet.setColumnWidth(1, 800);
  sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  
  // Bold section headers
  const headerRows = [4, 14, 29, 38, 49, 58];
  headerRows.forEach(row => {
    sheet.getRange(row, 1).setFontWeight('bold').setBackground('#E8F0FE');
  });
}

// ===== FETCH & PARSE =====

/**
 * Main entry point for GTM inspection
 * Reads config, fetches GTM JS, parses it, and populates sheets
 */
function inspectGtmContainer() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Ensure sheets exist
    setupGtmInspectorSheets();
    
    // Read container ID from config
    const containerId = getGtmContainerId_();
    
    if (!containerId) {
      ui.alert('Configuration Required', 
        'Please enter a GTM container ID in the GTM_CONFIG sheet (cell A2).\n\n' +
        'Example: GTM-XXXXXXX',
        ui.ButtonSet.OK);
      return;
    }
    
    ui.alert('Fetching Container', 
      `Inspecting GTM container: ${containerId}\n\n` +
      'This may take 30-60 seconds...',
      ui.ButtonSet.OK);
    
    // Fetch the GTM JS
    Logger.log(`Fetching GTM container: ${containerId}`);
    const rawJs = fetchGtmJs_(containerId);
    Logger.log(`Fetched ${rawJs.length} characters of GTM JS`);
    
    // Create a debug sheet with raw JS sample
    createDebugSheet_(rawJs, containerId);
    
    // Parse the container model
    const model = extractContainerModelFromRawJs_(rawJs, containerId);
    Logger.log(`Parsed: ${model.tags.length} tags, ${model.triggers.length} triggers, ${model.variables.length} variables`);
    
    // Analyze vendors
    const vendors = analyzeVendorsFromRawJs_(rawJs, containerId, model.tags);
    Logger.log(`Detected ${vendors.length} vendor instances`);
    
    // Write to sheets
    writeGtmTable_('GTM_Tags', 
      ['containerId', 'id', 'name', 'type', 'vendor', 'triggers', 'raw'],
      model.tags);
    
    writeGtmTable_('GTM_Triggers',
      ['containerId', 'id', 'name', 'type', 'conditionsSummary', 'raw'],
      model.triggers);
    
    writeGtmTable_('GTM_Variables',
      ['containerId', 'id', 'name', 'type', 'detailsSummary', 'raw'],
      model.variables);
    
    writeGtmTable_('GTM_Vendors',
      ['containerId', 'vendor', 'type', 'id', 'extra'],
      vendors);
    
    // Success message
    const message = 
      `✅ Container Inspection Complete!\n\n` +
      `Container: ${containerId}\n\n` +
      `Tags: ${model.tags.length}\n` +
      `Triggers: ${model.triggers.length}\n` +
      `Variables: ${model.variables.length}\n` +
      `Vendor Instances: ${vendors.length}\n\n` +
      `Check the GTM_Tags, GTM_Triggers, GTM_Variables, and GTM_Vendors sheets.`;
    
    ui.alert('Inspection Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in inspectGtmContainer: ' + error.stack);
    ui.alert('GTM Inspector Error', 
      error.message + '\n\nCheck the Execution log in Apps Script for details.',
      ui.ButtonSet.OK);
  }
}

/**
 * Reads the GTM container ID from config sheet
 * @returns {string} Container ID or empty string
 */
function getGtmContainerId_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('GTM_CONFIG');
  
  if (!sheet) return '';
  
  const value = sheet.getRange('A2').getValue();
  return String(value).trim();
}

/**
 * Fetches the GTM container JavaScript
 * @param {string} containerId - GTM container ID
 * @returns {string} Container JavaScript source
 */
function fetchGtmJs_(containerId) {
  const url = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(containerId);
  
  const options = {
    muteHttpExceptions: true,
    followRedirects: true
  };
  
  const resp = UrlFetchApp.fetch(url, options);
  const code = resp.getResponseCode();
  
  if (code !== 200) {
    throw new Error(
      'Failed to fetch GTM container ' + containerId +
      ' (HTTP ' + code + '). ' +
      'Verify the container ID is correct and published.'
    );
  }
  
  return resp.getContentText();
}

/**
 * Extracts container model from raw GTM JavaScript
 * Best-effort parsing with graceful degradation
 * 
 * @param {string} rawJs - GTM JavaScript source
 * @param {string} containerId - Container ID for reference
 * @returns {Object} Model with tags, triggers, variables arrays
 */
function extractContainerModelFromRawJs_(rawJs, containerId) {
  const model = {
    tags: [],
    triggers: [],
    variables: []
  };
  
  try {
    Logger.log('Starting GTM JS parsing...');
    Logger.log(`JS length: ${rawJs.length} characters`);
    
    // Modern GTM containers use different patterns. Try multiple strategies:
    
    // Strategy 0: Variable assignment with resource object
    // Format: var data = { "resource": {...} } or var data = { ""resource"": {...} }
    const varDataPattern = /var\s+data\s*=\s*\{/;
    const varMatch = rawJs.match(varDataPattern);
    if (varMatch) {
      Logger.log('Found var data = {...} pattern');
      try {
        const startIdx = rawJs.indexOf(varMatch[0]) + varMatch[0].length - 1;
        const extracted = extractCompleteObject_(rawJs, startIdx);
        if (extracted) {
          Logger.log(`Extracted var data object: ${extracted.length} chars`);
          
          // Parse using eval instead of JSON.parse since GTM mixes JSON and JavaScript
          // This is safe because we're only parsing GTM's own code, not user input
          try {
            // Create a safe eval context
            const evalCode = '(function() { return ' + extracted + '; })()';
            const data = eval(evalCode);
            
            Logger.log(`Parsed successfully via eval, keys: ${Object.keys(data).join(', ')}`);
            if (data.resource) {
              Logger.log('Found resource object inside data');
              return parseContainerData_(data.resource, containerId);
            } else {
              return parseContainerData_(data, containerId);
            }
          } catch (evalError) {
            Logger.log('Eval parsing failed: ' + evalError.message);
            // Fall back to aggressive JSON cleaning
            throw evalError;
          }
        }
      } catch (e) {
        Logger.log('var data pattern failed: ' + e.message);
        Logger.log('Stack: ' + e.stack);
      }
    }
    
    // Strategy 1: Direct google_tag_manager object (most common modern format)
    // Format: if(window.google_tag_manager)google_tag_manager["GTM-XXX"]={...}
    const directGtmPattern = new RegExp('google_tag_manager\\["' + containerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\]\\s*=\\s*\\{');
    const directMatch = rawJs.match(directGtmPattern);
    if (directMatch) {
      Logger.log('Found direct google_tag_manager["' + containerId + '"] assignment');
      try {
        const startIdx = rawJs.indexOf(directMatch[0]) + directMatch[0].length - 1;
        const extracted = extractCompleteObject_(rawJs, startIdx);
        if (extracted) {
          Logger.log(`Extracted object: ${extracted.length} chars`);
          const data = JSON.parse(extracted);
          Logger.log(`Parsed successfully, keys: ${Object.keys(data).join(', ')}`);
          return parseContainerData_(data, containerId);
        }
      } catch (e) {
        Logger.log('Direct GTM pattern failed: ' + e.message);
        Logger.log('Stack: ' + e.stack);
      }
    }
    
    // Strategy 2: Look for .push() calls with container data
    // Modern format: gtmDomain.push({"gtm.start":...}) or similar
    const pushMatch = rawJs.match(/\.push\s*\(\s*(\{[^)]+\})\s*\)/);
    if (pushMatch) {
      Logger.log('Found .push() pattern');
      try {
        const data = extractJsonFromPush_(rawJs);
        if (data) {
          return parseContainerData_(data, containerId);
        }
      } catch (e) {
        Logger.log('Push pattern failed: ' + e.message);
      }
    }
    
    // Strategy 3: Look for window assignment patterns
    // Format: window.google_tag_manager[containerId] = {...}
    const windowPattern = new RegExp('google_tag_manager\\s*\\[\\s*["\']' + containerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']\\s*\\]\\s*=\\s*\\{');
    const windowMatch = rawJs.match(windowPattern);
    if (windowMatch) {
      Logger.log('Found window.google_tag_manager pattern');
      try {
        const startIdx = rawJs.indexOf(windowMatch[0]) + windowMatch[0].length - 1;
        const extracted = extractCompleteObject_(rawJs, startIdx);
        if (extracted) {
          const data = JSON.parse(extracted);
          return parseContainerData_(data, containerId);
        }
      } catch (e) {
        Logger.log('Window pattern failed: ' + e.message);
      }
    }
    
    // Strategy 4: Look for old-style {"resource":...} pattern
    const resourceMatch = rawJs.match(/\{"resource":\{/);
    if (resourceMatch) {
      Logger.log('Found {"resource":...} pattern');
      try {
        const startIdx = rawJs.indexOf('{"resource"');
        const extracted = extractCompleteObject_(rawJs, startIdx);
        if (extracted) {
          const resource = JSON.parse(extracted);
          if (resource && resource.resource) {
            return parseContainerData_(resource.resource, containerId);
          }
        }
      } catch (e) {
        Logger.log('Resource pattern failed: ' + e.message);
      }
    }
    
    // Strategy 5: Aggressive search for any large object with tags/macros/rules
    Logger.log('Attempting aggressive object extraction...');
    const extracted = findContainerDataObject_(rawJs);
    if (extracted) {
      Logger.log('Found potential container data via aggressive search');
      return parseContainerData_(extracted, containerId);
    }
    
    Logger.log('WARNING: Could not find container data in GTM JS using any strategy');
    Logger.log('First 500 chars: ' + rawJs.substring(0, 500));
    
  } catch (error) {
    Logger.log('ERROR parsing GTM JS: ' + error.message);
    Logger.log(error.stack);
  }
  
  return model;
}

/**
 * Extracts a complete JSON object starting from a given index
 * @param {string} str - Source string
 * @param {number} startIdx - Starting index (should point to opening {)
 * @returns {string} Complete JSON object string
 */
function extractCompleteObject_(str, startIdx) {
  let braceCount = 0;
  let endIdx = startIdx;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIdx; i < str.length && i < startIdx + 5000000; i++) {
    const char = str[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  
  if (endIdx > startIdx) {
    return str.substring(startIdx, endIdx);
  }
  return null;
}

/**
 * Extracts JSON from .push() pattern
 * @param {string} rawJs - Raw JavaScript
 * @returns {Object} Parsed container data
 */
function extractJsonFromPush_(rawJs) {
  // Look for large objects being pushed
  const pushMatches = rawJs.matchAll(/\.push\s*\(\s*(\{)/g);
  
  for (const match of pushMatches) {
    const startIdx = match.index + match[0].length - 1;
    const extracted = extractCompleteObject_(rawJs, startIdx);
    
    if (extracted && extracted.length > 1000) {
      try {
        const data = JSON.parse(extracted);
        // Check if it looks like container data
        if (data.tags || data.macros || data.resource) {
          return data.resource || data;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Aggressively searches for container data object
 * @param {string} rawJs - Raw JavaScript
 * @returns {Object} Container data object
 */
function findContainerDataObject_(rawJs) {
  // Look for any large object that has tags, macros, and rules/predicates
  const objectStarts = [];
  
  for (let i = 0; i < rawJs.length - 100; i++) {
    if (rawJs[i] === '{') {
      objectStarts.push(i);
      if (objectStarts.length > 1000) {
        objectStarts.shift(); // Keep last 1000 to avoid memory issues
      }
    }
  }
  
  Logger.log(`Found ${objectStarts.length} potential object starts`);
  
  // Try to extract and parse largest objects first
  const candidates = [];
  
  for (const startIdx of objectStarts) {
    const extracted = extractCompleteObject_(rawJs, startIdx);
    if (extracted && extracted.length > 5000) {
      candidates.push({ startIdx, extracted });
    }
  }
  
  Logger.log(`Found ${candidates.length} large objects to check`);
  
  // Sort by size descending
  candidates.sort((a, b) => b.extracted.length - a.extracted.length);
  
  // Try to parse each candidate
  for (const candidate of candidates.slice(0, 20)) {
    try {
      const data = JSON.parse(candidate.extracted);
      
      // Check if it looks like GTM container data
      if ((data.tags && Array.isArray(data.tags)) ||
          (data.macros && Array.isArray(data.macros))) {
        Logger.log(`Found container data object (${candidate.extracted.length} chars)`);
        return data;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

/**
 * Parses container data into normalized model
 * @param {Object} data - Container data object
 * @param {string} containerId - Container ID
 * @returns {Object} Model with tags, triggers, variables
 */
function parseContainerData_(data, containerId) {
  const model = {
    tags: [],
    triggers: [],
    variables: []
  };
  
  // Extract entities which may contain name mappings
  const entities = data.entities || {};
  Logger.log(`Entities keys: ${Object.keys(entities).join(', ')}`);
  
  // Extract tags
  if (data.tags && Array.isArray(data.tags)) {
    Logger.log(`Parsing ${data.tags.length} tags`);
    model.tags = data.tags.map((tag, idx) => parseGtmTag_(tag, idx, containerId, entities));
  }
  
  // Extract triggers (predicates + rules)
  if (data.predicates && data.rules) {
    Logger.log(`Parsing triggers from ${data.predicates.length} predicates and ${data.rules.length} rules`);
    model.triggers = parseGtmTriggers_(data.predicates, data.rules, containerId, entities);
  }
  
  // Extract variables (macros in GTM terminology)
  if (data.macros && Array.isArray(data.macros)) {
    Logger.log(`Parsing ${data.macros.length} variables`);
    model.variables = data.macros.map((macro, idx) => parseGtmVariable_(macro, idx, containerId, entities));
  }
  
  Logger.log(`Successfully parsed: ${model.tags.length} tags, ${model.triggers.length} triggers, ${model.variables.length} variables`);
  
  return model;
}

/**
 * Parses a single GTM tag object
 * @param {Object} tag - Raw tag object
 * @param {number} idx - Tag index
 * @param {string} containerId - Container ID
 * @param {Object} data - Full resource data for lookups
 * @returns {Object} Normalized tag object
 */
function parseGtmTag_(tag, idx, containerId, entities) {
  // Handle trigger references - can be array, single value, or undefined
  let triggers = '';
  if (tag.tag_id !== undefined && tag.tag_id !== null) {
    if (Array.isArray(tag.tag_id)) {
      triggers = tag.tag_id.join(', ');
    } else {
      triggers = String(tag.tag_id);
    }
  }
  
  // Extract name from various possible locations
  let tagName = tag.name || '';
  
  // GTM stores names in metadata array: ["map", "name", "Tag Name"]
  if (!tagName && tag.metadata && Array.isArray(tag.metadata)) {
    for (let i = 0; i < tag.metadata.length; i++) {
      if (tag.metadata[i] === 'name' && i + 1 < tag.metadata.length) {
        tagName = tag.metadata[i + 1];
        break;
      }
    }
  }
  
  // Try to get name from entities mapping
  // GTM format is typically entities[idx] = ["tag_name", ...]
  if (!tagName && entities && idx in entities) {
    const entityData = entities[idx];
    if (Array.isArray(entityData) && entityData.length > 0) {
      tagName = entityData[0]; // First element is usually the name
    }
  }
  
  // If no direct name, try to build one from vtp parameters
  if (!tagName) {
    if (tag.vtp_name) {
      tagName = tag.vtp_name;
    } else if (tag.vtp_trackingId) {
      tagName = tag.vtp_trackingId;
    } else if (tag.vtp_measurementId) {
      tagName = tag.vtp_measurementId;
    } else if (tag.vtp_conversionId) {
      tagName = tag.vtp_conversionId;
    }
  }
  
  const parsed = {
    containerId: containerId,
    id: tag.function || ('tag_' + idx),
    name: tagName,
    type: identifyTagType_(tag),
    vendor: identifyTagVendor_(tag),
    triggers: triggers,
    raw: JSON.stringify(tag)
  };
  
  return parsed;
}

/**
 * Identifies tag type from tag object
 * @param {Object} tag - Tag object
 * @returns {string} Tag type description
 */
function identifyTagType_(tag) {
  const func = tag.function || '';
  const vtp = tag.vtp_trackingId || tag.vtp_measurementId || '';
  
  // Google Analytics 4
  if (func.includes('gaawe') || func.includes('gaawc')) {
    return 'GA4 Event';
  }
  if (func === '__googtag' || vtp.startsWith('G-')) {
    return 'GA4 Config';
  }
  
  // Universal Analytics
  if (func === '__ua') {
    return 'Universal Analytics';
  }
  
  // Google Ads
  if (func === '__gclidw') {
    return 'Google Ads Conversion Linker';
  }
  if (func.includes('awct')) {
    return 'Google Ads Conversion Tracking';
  }
  if (func.includes('sp')) {
    return 'Google Ads Remarketing';
  }
  
  // Floodlight
  if (func.includes('flc') || func.includes('fls')) {
    return 'Floodlight Counter/Sales';
  }
  
  // Custom HTML
  if (func === '__html') {
    return 'Custom HTML';
  }
  
  // Custom Image
  if (func === '__img') {
    return 'Custom Image';
  }
  
  return func || 'Unknown';
}

/**
 * Identifies vendor from tag configuration
 * @param {Object} tag - Tag object
 * @returns {string} Vendor name
 */
function identifyTagVendor_(tag) {
  const func = tag.function || '';
  const html = tag.vtp_html || '';
  
  if (func.includes('gaa') || func.includes('googtag') || func === '__ua') {
    return 'Google Analytics';
  }
  
  if (func.includes('awct') || func.includes('gclidw') || func.includes('sp')) {
    return 'Google Ads';
  }
  
  if (func.includes('flc') || func.includes('fls')) {
    return 'Floodlight';
  }
  
  if (html.includes('fbq(')) {
    return 'Meta (Facebook)';
  }
  
  if (html.includes('ttq.')) {
    return 'TikTok';
  }
  
  if (html.includes('linkedin')) {
    return 'LinkedIn';
  }
  
  if (html.includes('pintrk')) {
    return 'Pinterest';
  }
  
  if (func === '__html' || func === '__img') {
    return 'Custom';
  }
  
  return 'Other/Unknown';
}

/**
 * Parses GTM triggers from predicates and rules
 * @param {Array} predicates - Predicate definitions
 * @param {Array} rules - Rule definitions
 * @param {string} containerId - Container ID
 * @returns {Array} Normalized trigger objects
 */
function parseGtmTriggers_(predicates, rules, containerId, entities) {
  const triggers = [];
  
  rules.forEach((rule, idx) => {
    // Extract trigger name - GTM rules may not have names in published containers
    let triggerName = rule.name || '';
    
    // GTM stores names in metadata array: ["map", "name", "Trigger Name"]
    if (!triggerName && rule.metadata && Array.isArray(rule.metadata)) {
      for (let i = 0; i < rule.metadata.length; i++) {
        if (rule.metadata[i] === 'name' && i + 1 < rule.metadata.length) {
          triggerName = rule.metadata[i + 1];
          break;
        }
      }
    }
    
    // Try to get name from entities mapping
    // The entities array has entries for tags, triggers, and variables sequentially
    // Need to offset by number of tags to get trigger names
    if (!triggerName && entities) {
      // Entities structure might have trigger names indexed differently
      // This is a heuristic approach since GTM's internal structure can vary
      const potentialKeys = Object.keys(entities).filter(k => !isNaN(k)).map(Number).sort((a,b) => a-b);
      // Look for a key that might correspond to this trigger
      // Triggers usually come after tags in the entities mapping
      for (const key of potentialKeys) {
        const entityData = entities[key];
        if (Array.isArray(entityData) && entityData.length > 0 && String(entityData[0]).toLowerCase().includes('trigger')) {
          if (!triggerName) {
            triggerName = entityData[0];
            break;
          }
        }
      }
    }
    
    // If no name, try to create a descriptive one from the rule type
    if (!triggerName && rule.add && rule.add.length > 0) {
      const firstPred = predicates[rule.add[0]];
      if (firstPred && firstPred[2]) {
        triggerName = 'Trigger: ' + String(firstPred[2]).substring(0, 30);
      }
    }
    
    const trigger = {
      containerId: containerId,
      id: 'trigger_' + idx,
      name: triggerName,
      type: identifyTriggerType_(rule, predicates),
      conditionsSummary: summarizeTriggerConditions_(rule, predicates),
      raw: JSON.stringify(rule)
    };
    
    triggers.push(trigger);
  });
  
  return triggers;
}

/**
 * Identifies trigger type
 * @param {Object} rule - Rule object
 * @param {Array} predicates - Predicates array
 * @returns {string} Trigger type
 */
function identifyTriggerType_(rule, predicates) {
  // This is simplified - GTM trigger types are complex
  if (rule.add && rule.add.length > 0) {
    const firstPredicate = predicates[rule.add[0]];
    if (firstPredicate) {
      const type = firstPredicate[0];
      if (type === 'equals' && firstPredicate[1] && firstPredicate[1].macro === '0') {
        return 'Page View';
      }
      if (type === 'cn' || type === 'contains') {
        return 'Page View (conditional)';
      }
    }
  }
  
  return 'Custom Trigger';
}

/**
 * Summarizes trigger conditions
 * @param {Object} rule - Rule object
 * @param {Array} predicates - Predicates array
 * @returns {string} Conditions summary
 */
function summarizeTriggerConditions_(rule, predicates) {
  const conditions = [];
  
  if (rule.add) {
    rule.add.forEach(idx => {
      if (predicates[idx]) {
        conditions.push(stringifyPredicate_(predicates[idx]));
      }
    });
  }
  
  return conditions.slice(0, 3).join(' AND ') || 'All Pages';
}

/**
 * Converts predicate to readable string
 * @param {Array} predicate - Predicate array
 * @returns {string} Readable condition
 */
function stringifyPredicate_(predicate) {
  const op = predicate[0];
  const val = predicate[2];
  
  const opMap = {
    'equals': '==',
    'cn': 'contains',
    'sw': 'starts with',
    'ew': 'ends with',
    'regex': 'matches'
  };
  
  return `${opMap[op] || op} "${val}"`;
}

/**
 * Parses a GTM variable (macro)
 * @param {Object} macro - Macro object
 * @param {number} idx - Index
 * @param {string} containerId - Container ID
 * @returns {Object} Normalized variable object
 */
function parseGtmVariable_(macro, idx, containerId, entities) {
  // Extract name from various possible locations
  let varName = macro.name || '';
  
  // GTM stores names in metadata array: ["map", "name", "Variable Name"]
  if (!varName && macro.metadata && Array.isArray(macro.metadata)) {
    for (let i = 0; i < macro.metadata.length; i++) {
      if (macro.metadata[i] === 'name' && i + 1 < macro.metadata.length) {
        varName = macro.metadata[i + 1];
        break;
      }
    }
  }
  
  // Try to get name from entities mapping  
  if (!varName && entities) {
    // Variables/macros might have their own index range in entities
    // Try direct index lookup first
    const potentialKeys = Object.keys(entities).filter(k => !isNaN(k)).map(Number).sort((a,b) => a-b);
    for (const key of potentialKeys) {
      const entityData = entities[key];
      if (Array.isArray(entityData) && entityData.length > 0) {
        // Check if this might be our variable by looking at the macro function
        if (entityData[0] && typeof entityData[0] === 'string') {
          // Simple heuristic: if index is roughly in macro range, use it
          if (!varName && key >= idx * 0.5 && key <= idx * 2) {
            varName = entityData[0];
            break;
          }
        }
      }
    }
  }
  
  // If no direct name, try vtp_name (common for Data Layer Variables)
  if (!varName && macro.vtp_name) {
    varName = macro.vtp_name;
  }
  
  // If still no name and it's a constant, use the value
  if (!varName && macro.function === '__k' && macro.vtp_value) {
    varName = macro.vtp_value;
  }
  
  // For URL variables, extract component type
  if (!varName && macro.function === '__u' && macro.vtp_component) {
    varName = macro.vtp_component;
  }
  
  const variable = {
    containerId: containerId,
    id: macro.function || ('var_' + idx),
    name: varName,
    type: identifyVariableType_(macro),
    detailsSummary: summarizeVariableDetails_(macro),
    raw: JSON.stringify(macro)
  };
  
  return variable;
}

/**
 * Identifies variable type
 * @param {Object} macro - Macro object
 * @returns {string} Variable type
 */
function identifyVariableType_(macro) {
  const func = macro.function || '';
  
  if (func === '__v') return 'Data Layer Variable';
  if (func === '__u') return 'URL';
  if (func === '__k') return 'Constant';
  if (func === '__jsm') return 'Custom JavaScript';
  if (func === '__r') return 'Random Number';
  if (func === '__e') return 'Environment';
  if (func === '__c') return 'Container ID';
  if (func === '__j') return 'JavaScript Variable';
  if (func === '__smm') return 'Regex Table';
  
  return func || 'Unknown';
}

/**
 * Summarizes variable configuration
 * @param {Object} macro - Macro object
 * @returns {string} Details summary
 */
function summarizeVariableDetails_(macro) {
  if (macro.vtp_name) {
    return 'dataLayer: ' + macro.vtp_name;
  }
  if (macro.vtp_component) {
    return 'URL component: ' + macro.vtp_component;
  }
  if (macro.vtp_value) {
    return 'Value: ' + String(macro.vtp_value).substring(0, 50);
  }
  
  return '';
}

// ===== VENDOR DETECTION =====

/**
 * Analyzes vendors from raw JS using regex patterns
 * @param {string} rawJs - GTM JavaScript
 * @param {string} containerId - Container ID
 * @param {Array} tags - Parsed tags for additional context
 * @returns {Array} Vendor detection results
 */
function analyzeVendorsFromRawJs_(rawJs, containerId, tags) {
  const vendors = [];
  const seen = new Set();
  
  // GA4 Measurement IDs
  const ga4Pattern = /G-[A-Z0-9]{7,12}/g;
  let match;
  while ((match = ga4Pattern.exec(rawJs)) !== null) {
    const id = match[0];
    if (!seen.has(id)) {
      seen.add(id);
      vendors.push({
        containerId: containerId,
        vendor: 'Google Analytics',
        type: 'GA4 Measurement ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // UA Property IDs
  const uaPattern = /UA-\d{4,10}-\d{1,4}/g;
  while ((match = uaPattern.exec(rawJs)) !== null) {
    const id = match[0];
    if (!seen.has(id)) {
      seen.add(id);
      vendors.push({
        containerId: containerId,
        vendor: 'Google Analytics',
        type: 'UA Property ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // Google Ads Conversion IDs
  const awPattern = /AW-\d{6,12}/g;
  while ((match = awPattern.exec(rawJs)) !== null) {
    const id = match[0];
    if (!seen.has(id)) {
      seen.add(id);
      vendors.push({
        containerId: containerId,
        vendor: 'Google Ads',
        type: 'Conversion ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // Floodlight
  const flPattern = /DC-\d{6,12}/g;
  while ((match = flPattern.exec(rawJs)) !== null) {
    const id = match[0];
    if (!seen.has(id)) {
      seen.add(id);
      vendors.push({
        containerId: containerId,
        vendor: 'Floodlight',
        type: 'Advertiser ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // Meta Pixel
  const fbPattern = /fbq\(['"]init['"],\s*['"](\d{15,16})['"]/g;
  while ((match = fbPattern.exec(rawJs)) !== null) {
    const id = match[1];
    if (!seen.has('fb_' + id)) {
      seen.add('fb_' + id);
      vendors.push({
        containerId: containerId,
        vendor: 'Meta (Facebook)',
        type: 'Pixel ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // TikTok Pixel
  const ttPattern = /ttq\.load\(['"]([A-Z0-9]{20,})['"]/g;
  while ((match = ttPattern.exec(rawJs)) !== null) {
    const id = match[1];
    if (!seen.has('tt_' + id)) {
      seen.add('tt_' + id);
      vendors.push({
        containerId: containerId,
        vendor: 'TikTok',
        type: 'Pixel ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // LinkedIn Insight Tag
  const liPattern = /_linkedin_partner_id\s*=\s*['"](\d+)['"]/g;
  while ((match = liPattern.exec(rawJs)) !== null) {
    const id = match[1];
    if (!seen.has('li_' + id)) {
      seen.add('li_' + id);
      vendors.push({
        containerId: containerId,
        vendor: 'LinkedIn',
        type: 'Partner ID',
        id: id,
        extra: ''
      });
    }
  }
  
  // Pinterest
  const pinPattern = /pintrk\(['"]load['"],\s*['"](\d+)['"]/g;
  while ((match = pinPattern.exec(rawJs)) !== null) {
    const id = match[1];
    if (!seen.has('pin_' + id)) {
      seen.add('pin_' + id);
      vendors.push({
        containerId: containerId,
        vendor: 'Pinterest',
        type: 'Tag ID',
        id: id,
        extra: ''
      });
    }
  }
  
  return vendors;
}

// ===== SHEET OPERATIONS =====

/**
 * Writes data to a GTM sheet with headers
 * @param {string} sheetName - Sheet name
 * @param {Array<string>} headers - Column headers
 * @param {Array<Object>} rows - Data rows
 */
function writeGtmTable_(sheetName, headers, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  sheet.clearContents();
  
  const data = [headers];
  rows.forEach(rowObj => {
    data.push(headers.map(h => rowObj[h] != null ? String(rowObj[h]) : ''));
  });
  
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, headers.length).setValues(data);
    
    // Format header row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285F4')
      .setFontColor('#FFFFFF');
    
    // Auto-resize columns
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    sheet.setFrozenRows(1);
  }
  
  Logger.log(`Wrote ${rows.length} row(s) to ${sheetName}`);
}

/**
 * Clears all GTM output sheets
 */
function clearGtmOutputSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['GTM_Tags', 'GTM_Triggers', 'GTM_Variables', 'GTM_Vendors'];
  
  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      sheet.clearContents();
    }
  });
  
  SpreadsheetApp.getUi().alert('Output Sheets Cleared', 
    'GTM_Tags, GTM_Triggers, GTM_Variables, and GTM_Vendors have been cleared.',
    SpreadsheetApp.ButtonSet.OK);
}

/**
 * Deletes all sheets except GTM_README, GTM_CONFIG, and DETAILS
 */
function deleteAllExceptEssentials() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Confirm before deleting
  const response = ui.alert(
    'Delete All Sheets?',
    'This will DELETE all sheets except:\n' +
    '  • GTM_README\n' +
    '  • GTM_CONFIG\n' +
    '  • DETAILS\n\n' +
    'This action cannot be undone. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  const keepSheets = ['GTM_README', 'GTM_CONFIG', 'DETAILS'];
  const allSheets = ss.getSheets();
  let deletedCount = 0;
  
  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    if (!keepSheets.includes(sheetName)) {
      ss.deleteSheet(sheet);
      deletedCount++;
      Logger.log(`Deleted sheet: ${sheetName}`);
    }
  });
  
  ui.alert('Sheets Deleted', 
    `Deleted ${deletedCount} sheet(s).\n\n` +
    'Kept: GTM_README, GTM_CONFIG, DETAILS',
    ui.ButtonSet.OK);
  
  Logger.log(`Deleted ${deletedCount} sheets, kept ${keepSheets.length} essential sheets`);
}

/**
 * Shows the GTM README sheet
 */
function showGtmReadme() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_README');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_README');
    populateGtmReadmeSheet_(sheet);
  }
  
  ss.setActiveSheet(sheet);
}

/**
 * Creates a debug sheet with raw JS samples for troubleshooting
 * @param {string} rawJs - Raw GTM JavaScript
 * @param {string} containerId - Container ID
 */
function createDebugSheet_(rawJs, containerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_DEBUG');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_DEBUG');
  }
  
  sheet.clearContents();
  
  // Write debugging information
  const debugInfo = [
    ['GTM Container Debug Information', ''],
    ['Container ID', containerId],
    ['JS Length', rawJs.length + ' characters'],
    ['Date', new Date().toString()],
    ['', ''],
    ['First 2000 characters:', ''],
    [rawJs.substring(0, 2000), ''],
    ['', ''],
    ['Last 1000 characters:', ''],
    [rawJs.substring(rawJs.length - 1000), ''],
    ['', ''],
    ['Search for key patterns:', ''],
    ['Contains "tags":', rawJs.includes('"tags"') ? 'YES' : 'NO'],
    ['Contains "macros":', rawJs.includes('"macros"') ? 'YES' : 'NO'],
    ['Contains "predicates":', rawJs.includes('"predicates"') ? 'YES' : 'NO'],
    ['Contains "rules":', rawJs.includes('"rules"') ? 'YES' : 'NO'],
    ['Contains "resource":', rawJs.includes('"resource"') ? 'YES' : 'NO'],
    ['Contains "google_tag_manager":', rawJs.includes('google_tag_manager') ? 'YES' : 'NO'],
    ['Contains ".push(":', rawJs.includes('.push(') ? 'YES' : 'NO'],
    ['', ''],
    ['Character counts:', ''],
    ['Opening braces {', (rawJs.match(/\{/g) || []).length],
    ['Closing braces }', (rawJs.match(/\}/g) || []).length],
    ['Opening brackets [', (rawJs.match(/\[/g) || []).length],
    ['Closing brackets ]', (rawJs.match(/\]/g) || []).length]
  ];
  
  sheet.getRange(1, 1, debugInfo.length, 2).setValues(debugInfo);
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 600);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);
  
  Logger.log('Created GTM_DEBUG sheet with container analysis');
}

/**
 * Generates a presentable summary/sitemap of GTM container
 */
function exportGtmSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Get container ID
    const containerId = getGtmContainerId_();
    if (!containerId) {
      ui.alert('No Container Data', 
        'Please run "Inspect Container" first to generate data.',
        ui.ButtonSet.OK);
      return;
    }
    
    // Read data from existing sheets
    const tags = getSheetDataAsObjects(ss.getSheetByName('GTM_Tags'));
    const triggers = getSheetDataAsObjects(ss.getSheetByName('GTM_Triggers'));
    const variables = getSheetDataAsObjects(ss.getSheetByName('GTM_Variables'));
    const vendors = getSheetDataAsObjects(ss.getSheetByName('GTM_Vendors'));
    
    if (tags.length === 0) {
      ui.alert('No Data Found', 
        'No tags found. Please run "Inspect Container" first.',
        ui.ButtonSet.OK);
      return;
    }
    
    // Create or clear summary sheet
    let summarySheet = ss.getSheetByName('GTM_SUMMARY');
    if (summarySheet) {
      summarySheet.clear();
    } else {
      summarySheet = ss.insertSheet('GTM_SUMMARY');
    }
    
    // Build the summary
    buildGtmSummarySheet_(summarySheet, containerId, tags, triggers, variables, vendors);
    
    // Activate the summary sheet
    ss.setActiveSheet(summarySheet);
    
    ui.alert('Summary Created', 
      'GTM_SUMMARY sheet has been created with a presentable overview.\n\n' +
      'This sheet is formatted for stakeholder presentations.',
      ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in exportGtmSummary: ' + error.stack);
    ui.alert('Summary Error', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Builds the summary sheet with formatted sections
 */
function buildGtmSummarySheet_(sheet, containerId, tags, triggers, variables, vendors) {
  const data = [];
  let row = 0;
  
  // Header
  data.push(['GTM Container Summary Report', '', '', '']);
  data.push(['Container ID:', containerId, '', '']);
  data.push(['Generated:', new Date().toLocaleString(), '', '']);
  data.push(['', '', '', '']);
  
  // Executive Summary
  data.push(['EXECUTIVE SUMMARY', '', '', '']);
  data.push(['Metric', 'Count', '', '']);
  data.push(['Total Tags', tags.length, '', '']);
  data.push(['Total Triggers', triggers.length, '', '']);
  data.push(['Total Variables', variables.length, '', '']);
  data.push(['Detected Vendors', vendors.length, '', '']);
  data.push(['', '', '', '']);
  
  // Tags by Vendor
  data.push(['TAGS BY VENDOR', '', '', '']);
  data.push(['Vendor', 'Count', 'Tag Types', '']);
  const tagsByVendor = groupBy_(tags, 'vendor');
  Object.keys(tagsByVendor).sort().forEach(vendor => {
    const vendorTags = tagsByVendor[vendor];
    const types = [...new Set(vendorTags.map(t => t.type))].join(', ');
    data.push([vendor, vendorTags.length, types, '']);
  });
  data.push(['', '', '', '']);
  
  // Tags by Type
  data.push(['TAGS BY TYPE', '', '', '']);
  data.push(['Tag Type', 'Count', 'Vendors', '']);
  const tagsByType = groupBy_(tags, 'type');
  Object.keys(tagsByType).sort().forEach(type => {
    const typeTags = tagsByType[type];
    const typeVendors = [...new Set(typeTags.map(t => t.vendor))].join(', ');
    data.push([type, typeTags.length, typeVendors, '']);
  });
  data.push(['', '', '', '']);
  
  // Vendor IDs Detected
  data.push(['VENDOR IDS DETECTED', '', '', '']);
  data.push(['Vendor', 'Type', 'ID', 'Notes']);
  vendors.forEach(v => {
    data.push([v.vendor, v.type, v.id, v.extra || '']);
  });
  data.push(['', '', '', '']);
  
  // Variables by Type
  data.push(['VARIABLES BY TYPE', '', '', '']);
  data.push(['Variable Type', 'Count', 'Examples', '']);
  const varsByType = groupBy_(variables, 'type');
  Object.keys(varsByType).sort().forEach(type => {
    const typeVars = varsByType[type];
    const examples = typeVars.slice(0, 3).map(v => v.name || v.id).filter(n => n).join(', ');
    data.push([type, typeVars.length, examples, '']);
  });
  data.push(['', '', '', '']);
  
  // Trigger Types
  data.push(['TRIGGER TYPES', '', '', '']);
  data.push(['Trigger Type', 'Count', '', '']);
  const triggersByType = groupBy_(triggers, 'type');
  Object.keys(triggersByType).sort().forEach(type => {
    data.push([type, triggersByType[type].length, '', '']);
  });
  data.push(['', '', '', '']);
  
  // Detailed Tag List
  data.push(['COMPLETE TAG LIST', '', '', '']);
  data.push(['Tag Name/ID', 'Type', 'Vendor', 'Triggers']);
  tags.forEach(tag => {
    data.push([
      tag.name || tag.id,
      tag.type,
      tag.vendor,
      tag.triggers
    ]);
  });
  
  // Write all data at once
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 4).setValues(data);
  }
  
  // Format the sheet
  formatGtmSummarySheet_(sheet);
}

/**
 * Applies formatting to summary sheet
 */
function formatGtmSummarySheet_(sheet) {
  // Main header
  sheet.getRange('A1:D1').merge()
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');
  
  // Metadata rows
  sheet.getRange('A2:A3').setFontWeight('bold');
  
  // Find all section headers (all caps text in column A)
  const lastRow = sheet.getLastRow();
  for (let i = 1; i <= lastRow; i++) {
    const cellValue = sheet.getRange(i, 1).getValue();
    if (typeof cellValue === 'string' && cellValue === cellValue.toUpperCase() && cellValue.length > 3) {
      // Section header
      sheet.getRange(i, 1, 1, 4).merge()
        .setFontSize(12)
        .setFontWeight('bold')
        .setBackground('#E8F0FE')
        .setFontColor('#1A73E8');
      
      // Sub-header (next row if it exists)
      if (i + 1 <= lastRow) {
        sheet.getRange(i + 1, 1, 1, 4)
          .setFontWeight('bold')
          .setBackground('#F1F3F4');
      }
    }
  }
  
  // Column widths
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 200);
  
  // Freeze header rows
  sheet.setFrozenRows(3);
  
  // Add borders
  sheet.getRange(1, 1, lastRow, 4).setBorder(
    true, true, true, true, true, true,
    '#CCCCCC', SpreadsheetApp.BorderStyle.SOLID
  );
}

/**
 * Helper function to group array of objects by property
 */
function groupBy_(array, property) {
  return array.reduce((groups, item) => {
    const key = item[property] || 'Unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Helper function to convert sheet data to array of objects
 */
function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}
