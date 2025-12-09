/**
 * DataLayerAnalyzer.js
 * Analyzes data layer structures and populates the DATALAYER_DICTIONARY.
 * Flattens nested objects, infers types, and tracks where keys appear.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Main function to analyze data layers across all fetched pages
 * Triggered from menu
 */
function analyzeDataLayers() {
  const startTime = new Date();
  const MAX_EXECUTION_TIME = 5.5 * 60 * 1000; // 5.5 minutes
  
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('Starting data layer analysis...');
    
    // Get all fetched pages
    const pages = getRowsWhere('PAGES_INVENTORY', 'Crawl Status', 'Fetched');
    
    if (pages.length === 0) {
      ui.alert('No Pages to Analyze', 
        'No pages have been successfully fetched yet.\n\n' +
        'Please run "Run Crawl" first to fetch pages.',
        ui.ButtonSet.OK);
      return;
    }
    
    ui.alert('Starting Analysis', 
      `Analyzing data layers from ${pages.length} page(s).\n\n` +
      'This may take several minutes.',
      ui.ButtonSet.OK);
    
    const config = getConfig();
    let pagesProcessed = 0;
    let structuresFound = 0;
    let keysAdded = 0;
    
    // Process each page
    for (let i = 0; i < pages.length; i++) {
      // Check time limit
      const elapsed = new Date() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        Logger.log('Approaching execution time limit, stopping analysis');
        break;
      }
      
      const page = pages[i];
      const url = page.URL;
      const templateType = page['Template Type'] || 'Unknown';
      
      Logger.log(`[${i + 1}/${pages.length}] Analyzing: ${url}`);
      
      try {
        // Re-fetch the page HTML
        const result = fetchPage(url, config);
        
        if (!result.success) {
          Logger.log(`  Skipped (fetch failed): ${result.error}`);
          continue;
        }
        
        // Extract data layer structures
        const structures = extractDataLayerStructures(result.html, url);
        structuresFound += structures.length;
        
        if (structures.length === 0) {
          Logger.log('  No data layer structures found');
          continue;
        }
        
        // Process each structure
        structures.forEach(structure => {
          const added = recordDataLayerKeys(url, templateType, structure);
          keysAdded += added;
        });
        
        // Also extract and update canonical URL if found
        const canonicalUrl = extractCanonicalUrl(result.html);
        if (canonicalUrl) {
          updatePageCanonical(url, canonicalUrl);
        }
        
        pagesProcessed++;
        
        // Polite delay
        if (config.crawlDelay > 0) {
          Utilities.sleep(config.crawlDelay);
        }
        
      } catch (error) {
        Logger.log(`  ERROR processing ${url}: ${error.toString()}`);
      }
    }
    
    // Show results
    const message = 
      `✅ Analysis Complete!\n\n` +
      `Pages Processed: ${pagesProcessed}\n` +
      `Structures Found: ${structuresFound}\n` +
      `Keys Cataloged: ${keysAdded}\n\n` +
      `Check the DATALAYER_DICTIONARY tab for results.\n\n` +
      `Next step: Run "Refresh Template Suggestions" to classify page types.`;
    
    ui.alert('Analysis Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('FATAL ERROR in analyzeDataLayers: ' + error.toString());
    ui.alert('Analysis Error', 
      'An error occurred during analysis:\n\n' + error.toString(), 
      ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Records data layer keys from a structure into the DATALAYER_DICTIONARY
 * 
 * @param {string} url - Source URL
 * @param {string} templateType - Template type
 * @param {Object} structure - Data layer structure with source, context, and data
 * @returns {number} Number of keys added/updated
 */
function recordDataLayerKeys(url, templateType, structure) {
  const flatKeys = flattenObject(structure.data);
  let keysProcessed = 0;
  
  // Detect events
  const events = detectEvents(structure.data);
  
  // Process each flattened key
  Object.keys(flatKeys).forEach(keyPath => {
    const value = flatKeys[keyPath];
    
    // Build row data
    const rowData = {
      'Key Path': keyPath,
      'Type': inferType(value),
      'Example Value': sanitizeValue(value, 200),
      'Source Context': structure.context,
      'Scope': inferScope(keyPath, structure.source)
    };
    
    // Check if key already exists
    const existingRows = getRowsWhere('DATALAYER_DICTIONARY', 'Key Path', keyPath);
    
    if (existingRows.length > 0) {
      // Update existing entry
      const existing = existingRows[0];
      
      // Merge templates
      const templates = mergeUniqueValues(existing['Templates Where Seen'], templateType);
      rowData['Templates Where Seen'] = templates;
      
      // Merge URLs (limit to first 5)
      const urls = mergeUniqueValues(existing['URLs Where Seen'], url, 5);
      rowData['URLs Where Seen'] = urls;
      
      // Keep existing values for manually-filled fields
      rowData['Business Meaning'] = existing['Business Meaning'];
      rowData['Is Required?'] = existing['Is Required?'];
      rowData['Status'] = existing['Status'];
      rowData['Notes'] = existing['Notes'];
      
      // Update event name if applicable
      if (events.length > 0) {
        const mergedEvents = mergeUniqueValues(existing['Event Name (if applicable)'], events.join(', '));
        rowData['Event Name (if applicable)'] = mergedEvents;
      } else {
        rowData['Event Name (if applicable)'] = existing['Event Name (if applicable)'];
      }
      
    } else {
      // New entry
      rowData['Templates Where Seen'] = templateType;
      rowData['URLs Where Seen'] = url;
      rowData['Event Name (if applicable)'] = events.length > 0 ? events.join(', ') : '';
      rowData['Business Meaning'] = '';
      rowData['Is Required?'] = 'Unknown';
      rowData['Status'] = 'As-is';
      rowData['Notes'] = '';
    }
    
    upsertRow('DATALAYER_DICTIONARY', 'Key Path', keyPath, rowData);
    keysProcessed++;
  });
  
  return keysProcessed;
}

/**
 * Flattens a nested object into dot notation
 * Example: {user: {id: 123}} becomes {"user.id": 123}
 * 
 * @param {Object} obj - Object to flatten
 * @param {string} parentKey - Parent key path (for recursion)
 * @param {number} maxDepth - Maximum nesting depth to prevent infinite loops
 * @returns {Object} Flattened object
 */
function flattenObject(obj, parentKey = '', maxDepth = 10) {
  const flattened = {};
  
  if (maxDepth <= 0) {
    flattened[parentKey || 'deep_object'] = '[Max depth reached]';
    return flattened;
  }
  
  if (obj === null || obj === undefined) {
    flattened[parentKey || 'null'] = null;
    return flattened;
  }
  
  if (typeof obj !== 'object') {
    flattened[parentKey] = obj;
    return flattened;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    // For arrays, we'll process first element as representative
    if (obj.length > 0) {
      const arrayKey = parentKey ? `${parentKey}[]` : '[]';
      
      // If array elements are objects, flatten them
      if (typeof obj[0] === 'object' && obj[0] !== null) {
        const childFlattened = flattenObject(obj[0], arrayKey, maxDepth - 1);
        Object.assign(flattened, childFlattened);
      } else {
        flattened[arrayKey] = obj[0];
      }
    } else {
      flattened[parentKey || 'array'] = '[]';
    }
    return flattened;
  }
  
  // Handle objects
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    
    if (value !== null && typeof value === 'object') {
      // Recursively flatten
      const childFlattened = flattenObject(value, newKey, maxDepth - 1);
      Object.assign(flattened, childFlattened);
    } else {
      flattened[newKey] = value;
    }
  });
  
  return flattened;
}

/**
 * Infers the data type of a value
 * 
 * @param {*} value - Value to analyze
 * @returns {string} Type name (string, number, boolean, object, array, null, mixed)
 */
function inferType(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (Array.isArray(value)) {
    return 'array';
  }
  
  if (typeof value === 'object') {
    return 'object';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (typeof value === 'number') {
    return 'number';
  }
  
  if (typeof value === 'string') {
    return 'string';
  }
  
  return 'mixed';
}

/**
 * Infers the scope of a data layer key
 * 
 * @param {string} keyPath - Dot notation key path
 * @param {string} source - Source type (dataLayer, digitalData, etc.)
 * @returns {string} Scope (Global, Page View, Event, Other)
 */
function inferScope(keyPath, source) {
  const lower = keyPath.toLowerCase();
  
  // Event-scoped keys
  if (lower.includes('event') || 
      lower.includes('ecommerce') ||
      lower.includes('transaction') ||
      lower.includes('purchase')) {
    return 'Event';
  }
  
  // Page view scoped
  if (lower.includes('page') || 
      lower.includes('template') ||
      lower.includes('category') ||
      source === 'digitalData') {
    return 'Page View';
  }
  
  // Global/persistent
  if (lower.includes('user') || 
      lower.includes('visitor') ||
      lower.includes('session')) {
    return 'Global';
  }
  
  return 'Other';
}

/**
 * Merges unique values from comma-separated strings
 * 
 * @param {string} existing - Existing comma-separated values
 * @param {string} newValue - New value to add
 * @param {number} maxItems - Maximum number of items to keep
 * @returns {string} Merged comma-separated values
 */
function mergeUniqueValues(existing, newValue, maxItems = 999) {
  if (!existing && !newValue) return '';
  if (!existing) return newValue;
  if (!newValue) return existing;
  
  // Split, deduplicate, and rejoin
  const existingSet = new Set(
    existing.split(',').map(s => s.trim()).filter(s => s)
  );
  
  const newValues = newValue.split(',').map(s => s.trim()).filter(s => s);
  
  newValues.forEach(val => existingSet.add(val));
  
  const merged = Array.from(existingSet).slice(0, maxItems);
  
  return merged.join(', ');
}

/**
 * Updates the canonical URL for a page in inventory
 * 
 * @param {string} url - Original URL
 * @param {string} canonicalUrl - Canonical URL
 */
function updatePageCanonical(url, canonicalUrl) {
  const updates = {
    'Canonical URL': canonicalUrl
  };
  
  upsertRow('PAGES_INVENTORY', 'URL', url, updates);
}

/**
 * Identifies potential issues in data layer implementation
 * Writes findings to ISSUES_BACKLOG
 * 
 * @returns {number} Number of issues found
 */
function identifyDataLayerIssues() {
  const allKeys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
  let issuesFound = 0;
  let issueId = 1;
  
  allKeys.forEach(keyRow => {
    const keyPath = keyRow['Key Path'];
    const type = keyRow['Type'];
    const templates = keyRow['Templates Where Seen'];
    
    // Issue 1: Mixed types (if we see the same key with different types)
    // This would require more sophisticated tracking - placeholder for now
    
    // Issue 2: Missing on expected templates
    // Example: ecommerce.purchase should be on Confirmation template
    if (keyPath.includes('ecommerce.purchase') && !templates.includes('Confirmation')) {
      const issue = {
        'Issue ID': `DL-${String(issueId).padStart(3, '0')}`,
        'Template Name': 'Confirmation',
        'URL': '',
        'Key or Event': keyPath,
        'Issue Description': 'Purchase data layer found but not on Confirmation template',
        'Severity': 'High',
        'Status': 'Open',
        'Owner': '',
        'Created Date': new Date(),
        'Target Fix Date': '',
        'Resolution Notes': ''
      };
      
      appendRows('ISSUES_BACKLOG', [buildRowFromObject(
        getSheetDataAsObjects('ISSUES_BACKLOG')[0] ? 
          Object.keys(getSheetDataAsObjects('ISSUES_BACKLOG')[0]) :
          ['Issue ID', 'Template Name', 'URL', 'Key or Event', 'Issue Description', 
           'Severity', 'Status', 'Owner', 'Created Date', 'Target Fix Date', 'Resolution Notes'],
        issue
      )]);
      
      issuesFound++;
      issueId++;
    }
  });
  
  Logger.log(`Identified ${issuesFound} potential issue(s)`);
  return issuesFound;
}

/**
 * Generates a summary report of data layer coverage
 * 
 * @returns {Object} Summary statistics
 */
function getDataLayerSummary() {
  const keys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
  
  const summary = {
    totalKeys: keys.length,
    byType: {},
    byScope: {},
    bySource: {},
    eventKeys: 0,
    ecommerceKeys: 0,
    userKeys: 0
  };
  
  keys.forEach(key => {
    // Count by type
    const type = key['Type'];
    summary.byType[type] = (summary.byType[type] || 0) + 1;
    
    // Count by scope
    const scope = key['Scope'];
    summary.byScope[scope] = (summary.byScope[scope] || 0) + 1;
    
    // Count by source
    const source = key['Source Context'];
    summary.bySource[source] = (summary.bySource[source] || 0) + 1;
    
    // Special categories
    const keyPath = key['Key Path'].toLowerCase();
    if (keyPath.includes('event')) summary.eventKeys++;
    if (keyPath.includes('ecommerce')) summary.ecommerceKeys++;
    if (keyPath.includes('user') || keyPath.includes('visitor')) summary.userKeys++;
  });
  
  return summary;
}

/**
 * Exports data layer keys as CSV string
 * Useful for sharing with external teams
 * 
 * @returns {string} CSV formatted data
 */
function exportDataLayerKeysAsCsv() {
  const keys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
  
  if (keys.length === 0) return '';
  
  // Get headers
  const headers = Object.keys(keys[0]);
  let csv = headers.join(',') + '\n';
  
  // Add rows
  keys.forEach(key => {
    const row = headers.map(header => {
      let value = key[header] || '';
      
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
      }
      
      return value;
    });
    
    csv += row.join(',') + '\n';
  });
  
  return csv;
}
