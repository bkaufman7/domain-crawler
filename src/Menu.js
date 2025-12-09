/**
 * Menu.js
 * Handles custom menu creation and user-triggered menu actions.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Creates custom menu when spreadsheet opens
 * This function is automatically called by Apps Script
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('Site Data Layer Tools')
    .addItem('1) Setup Sheet Structure', 'setupSheetStructure')
    .addSeparator()
    .addItem('2) Run Crawl (Domain/Start URL)', 'runCrawl')
    .addItem('3) Analyze Data Layers', 'analyzeDataLayers')
    .addItem('4) Refresh Template Suggestions', 'refreshTemplateSuggestions')
    .addSeparator()
    .addItem('5) Build Template Requirements', 'buildTemplateRequirements')
    .addItem('6) Export Summary', 'exportSummary')
    .addSeparator()
    .addSubMenu(ui.createMenu('Advanced')
      .addItem('Clear Crawl Status (Reset)', 'resetCrawlStatus')
      .addItem('Validate Configuration', 'validateConfiguration')
      .addItem('View Crawl Statistics', 'showCrawlStatistics'))
    .addToUi();
  
  // Create separate GTM Inspector menu
  ui.createMenu('GTM Inspector')
    .addItem('Setup GTM Sheets', 'setupGtmInspectorSheets')
    .addItem('Inspect Container', 'inspectGtmContainer')
    .addSeparator()
    .addItem('📊 Export Summary Report', 'exportGtmSummary')
    .addSeparator()
    .addItem('Clear Output Sheets', 'clearGtmOutputSheets')
    .addItem('🗑️ Delete All Except Essentials', 'deleteAllExceptEssentials')
    .addSeparator()
    .addItem('Show README', 'showGtmReadme')
    .addToUi();
    
  Logger.log('Custom menus created successfully');
}

/**
 * Sets up the complete sheet structure with all required tabs and headers
 * Safe to run multiple times - will not delete existing data
 */
function setupSheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('Starting sheet structure setup...');
    
    // Define all tabs with their headers
    const tabDefinitions = getTabDefinitions();
    
    // Create or update each tab
    let createdCount = 0;
    let updatedCount = 0;
    
    tabDefinitions.forEach(tabDef => {
      const result = ensureSheet(tabDef.name, tabDef.headers);
      if (result === 'created') {
        createdCount++;
      } else if (result === 'updated') {
        updatedCount++;
      }
    });
    
    // Format DETAILS tab with initial config values
    setupDetailsTab();
    
    const message = `✅ Sheet structure setup complete!\n\n` +
      `Created: ${createdCount} new tab(s)\n` +
      `Updated: ${updatedCount} existing tab(s)\n\n` +
      `Next step: Fill in the DETAILS tab with your domain and configuration.`;
    
    ui.alert('Setup Complete', message, ui.ButtonSet.OK);
    Logger.log('Sheet structure setup completed successfully');
    
  } catch (error) {
    Logger.log('ERROR in setupSheetStructure: ' + error.toString());
    ui.alert('Setup Error', 'An error occurred during setup:\n\n' + error.toString(), ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Returns definitions for all required tabs
 * @returns {Array<Object>} Array of tab definition objects
 */
function getTabDefinitions() {
  return [
    {
      name: 'DETAILS',
      headers: ['Parameter', 'Value', 'Description']
    },
    {
      name: 'PAGES_INVENTORY',
      headers: [
        'Page ID', 'URL', 'Canonical URL', 'Template Type', 'HTTP Status',
        'Depth', 'Discovered From URL', 'Environment', 'Crawl Status',
        'Last Fetched', 'Notes'
      ]
    },
    {
      name: 'TEMPLATES',
      headers: [
        'Template Name', 'Template Type', 'Example URL', 'Canonical Pattern',
        'Criticality', 'Description', 'Owner', 'Notes'
      ]
    },
    {
      name: 'DATALAYER_DICTIONARY',
      headers: [
        'Key Path', 'Type', 'Example Value', 'Templates Where Seen',
        'URLs Where Seen', 'Event Name (if applicable)', 'Scope',
        'Source Context', 'Business Meaning', 'Is Required?', 'Status', 'Notes'
      ]
    },
    {
      name: 'TEMPLATE_REQUIREMENTS',
      headers: [
        'Template Name', 'Required Keys', 'Required Events', 'Optional Keys',
        'Known Gaps / Risks', 'QA Priority', 'Last Validated Date', 'Validated By'
      ]
    },
    {
      name: 'EVENTS_LOG',
      headers: [
        'Event Name', 'Trigger / User Action', 'Templates Where Expected',
        'Payload Keys', 'Example Payload Summary', 'Notes / Edge Cases'
      ]
    },
    {
      name: 'ISSUES_BACKLOG',
      headers: [
        'Issue ID', 'Template Name', 'URL', 'Key or Event', 'Issue Description',
        'Severity', 'Status', 'Owner', 'Created Date', 'Target Fix Date', 'Resolution Notes'
      ]
    },
    {
      name: 'GA4_MAPPING',
      headers: [
        'Template Name', 'GA4 Event Name', 'Data Layer Event Name',
        'GA4 Parameter', 'Data Layer Key Path', 'Notes'
      ]
    },
    {
      name: 'CM360_MAPPING',
      headers: [
        'Template Name', 'Floodlight Activity / Group', 'CM360 Parameter Name',
        'Data Layer Key Path', 'Notes'
      ]
    },
    {
      name: 'DV360_MAPPING',
      headers: [
        'Platform', 'Template Name', 'Signal / Field Name',
        'Data Layer Key Path', 'Notes'
      ]
    }
  ];
}

/**
 * Populates the DETAILS tab with default configuration parameters
 */
function setupDetailsTab() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DETAILS');
  
  // Check if already populated (row 2 has data)
  if (sheet.getRange(2, 1).getValue() !== '') {
    Logger.log('DETAILS tab already populated, skipping default values');
    return;
  }
  
  const defaultConfig = [
    ['Primary Domain', '', 'Base domain to crawl. Used to restrict crawling to this domain. (e.g., https://www.clientsite.com)'],
    ['Start URL', '', 'Entry point for crawler. Can be homepage or another key page.'],
    ['Max Pages', '500', 'Safety cap on number of pages to crawl.'],
    ['Max Depth', '3', 'How many link levels away from the start URL to follow.'],
    ['User Agent', 'Mozilla/5.0 (compatible; HorizonDataCrawler/1.0; +https://horizonmedia.com)', 'User agent string used by UrlFetch.'],
    ['Crawl Delay (ms)', '500', 'Milliseconds to wait between page fetches to be polite.'],
    ['Follow External Links', 'FALSE', 'Whether to follow links outside the Primary Domain. (TRUE/FALSE)'],
    ['Respect Robots.txt', 'TRUE', 'Whether to check and respect robots.txt rules. (TRUE/FALSE)'],
    ['Environment', 'Production', 'Production, Staging, Development, etc.'],
    ['Client Name', '', 'Client name for documentation purposes.'],
    ['Project Owner', '', 'Name of person responsible for this project.'],
    ['Last Updated', new Date(), 'Last time configuration was modified.']
  ];
  
  // Write default config starting at row 2
  sheet.getRange(2, 1, defaultConfig.length, 3).setValues(defaultConfig);
  
  // Format the sheet
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 400);
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Bold headers
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  
  Logger.log('DETAILS tab populated with default configuration');
}

/**
 * Validates the current configuration in DETAILS tab
 * Shows user-friendly alerts for any issues
 */
function validateConfiguration() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const config = getConfig();
    
    const issues = [];
    
    if (!config.primaryDomain) {
      issues.push('❌ Primary Domain is required');
    } else if (!config.primaryDomain.startsWith('http')) {
      issues.push('⚠️ Primary Domain should start with http:// or https://');
    }
    
    if (!config.startUrl) {
      issues.push('❌ Start URL is required');
    } else if (!config.startUrl.startsWith('http')) {
      issues.push('⚠️ Start URL should start with http:// or https://');
    }
    
    if (!config.maxPages || config.maxPages < 1) {
      issues.push('⚠️ Max Pages should be at least 1');
    }
    
    if (!config.maxDepth || config.maxDepth < 1) {
      issues.push('⚠️ Max Depth should be at least 1');
    }
    
    if (issues.length === 0) {
      ui.alert('✅ Configuration Valid', 
        'All required configuration parameters are set correctly.\n\n' +
        `Primary Domain: ${config.primaryDomain}\n` +
        `Start URL: ${config.startUrl}\n` +
        `Max Pages: ${config.maxPages}\n` +
        `Max Depth: ${config.maxDepth}`,
        ui.ButtonSet.OK);
    } else {
      ui.alert('⚠️ Configuration Issues Found',
        issues.join('\n\n'),
        ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('Configuration Error', error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Resets the crawl status for all pages (sets them back to Pending)
 * Useful for re-crawling from scratch
 */
function resetCrawlStatus() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Reset Crawl Status',
    'This will reset ALL pages to "Pending" status, allowing a fresh crawl.\n\n' +
    'This will NOT delete the pages, only reset their crawl status.\n\n' +
    'Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PAGES_INVENTORY');
    const statusColIndex = findHeaderIndex(sheet, 'Crawl Status');
    
    if (!sheet || statusColIndex === -1) {
      throw new Error('PAGES_INVENTORY sheet or Crawl Status column not found');
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let updatedCount = 0;
    
    // Start from row 2 (skip headers)
    for (let i = 1; i < values.length; i++) {
      if (values[i][statusColIndex] !== 'Pending') {
        values[i][statusColIndex] = 'Pending';
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      dataRange.setValues(values);
      ui.alert('Reset Complete', `${updatedCount} page(s) reset to "Pending" status.`, ui.ButtonSet.OK);
    } else {
      ui.alert('No Changes', 'All pages were already in "Pending" status.', ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('ERROR in resetCrawlStatus: ' + error.toString());
    ui.alert('Reset Error', error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Shows crawl statistics in a user-friendly alert
 */
function showCrawlStatistics() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const stats = getCrawlStatistics();
    
    const message = 
      `📊 Crawl Statistics\n\n` +
      `Total Pages: ${stats.total}\n` +
      `├─ Pending: ${stats.pending}\n` +
      `├─ Fetched: ${stats.fetched}\n` +
      `└─ Error: ${stats.error}\n\n` +
      `Progress: ${stats.percentComplete}% complete\n\n` +
      `Templates Found: ${stats.templatesCount}\n` +
      `Data Layer Keys: ${stats.dataLayerKeysCount}`;
    
    ui.alert('Crawl Statistics', message, ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('Statistics Error', error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Calculates and returns crawl statistics
 * @returns {Object} Statistics object
 */
function getCrawlStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get page inventory stats
  const pagesSheet = ss.getSheetByName('PAGES_INVENTORY');
  const stats = {
    total: 0,
    pending: 0,
    fetched: 0,
    error: 0,
    percentComplete: 0,
    templatesCount: 0,
    dataLayerKeysCount: 0
  };
  
  if (pagesSheet && pagesSheet.getLastRow() > 1) {
    const statusColIndex = findHeaderIndex(pagesSheet, 'Crawl Status');
    const data = pagesSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      stats.total++;
      const status = data[i][statusColIndex];
      
      if (status === 'Pending') stats.pending++;
      else if (status === 'Fetched') stats.fetched++;
      else if (status === 'Error') stats.error++;
    }
    
    if (stats.total > 0) {
      stats.percentComplete = Math.round((stats.fetched / stats.total) * 100);
    }
  }
  
  // Get templates count
  const templatesSheet = ss.getSheetByName('TEMPLATES');
  if (templatesSheet && templatesSheet.getLastRow() > 1) {
    stats.templatesCount = templatesSheet.getLastRow() - 1;
  }
  
  // Get data layer keys count
  const dlSheet = ss.getSheetByName('DATALAYER_DICTIONARY');
  if (dlSheet && dlSheet.getLastRow() > 1) {
    stats.dataLayerKeysCount = dlSheet.getLastRow() - 1;
  }
  
  return stats;
}
