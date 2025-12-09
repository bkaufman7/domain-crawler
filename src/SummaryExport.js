/**
 * SummaryExport.js
 * Generates summary reports and exports for stakeholder review.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Main export summary function triggered from menu
 * Creates a formatted summary of the entire data layer inventory
 */
function exportSummary() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('Generating summary export...');
    
    // Build comprehensive summary
    const summary = buildCompleteSummary();
    
    // Show in alert dialog
    ui.alert('Summary Report', summary.text, ui.ButtonSet.OK);
    
    // Optionally create a new sheet with the summary
    const response = ui.alert(
      'Create Summary Sheet?',
      'Would you like to create a new "SUMMARY" sheet with this report?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      createSummarySheet(summary);
      ui.alert('Summary Sheet Created', 
        'A new SUMMARY sheet has been created with the full report.',
        ui.ButtonSet.OK);
    }
    
  } catch (error) {
    Logger.log('ERROR in exportSummary: ' + error.toString());
    ui.alert('Export Error', 
      'An error occurred generating summary:\n\n' + error.toString(), 
      ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Builds a complete summary object with all report sections
 * 
 * @returns {Object} Summary object with text and structured data
 */
function buildCompleteSummary() {
  const config = getConfig();
  const crawlStats = getCrawlStatistics();
  const dlSummary = getDataLayerSummary();
  const templateCounts = getTemplateTypeCounts();
  
  let text = '';
  
  // Header
  text += '═══════════════════════════════════════════════════\n';
  text += '   SITE DATA LAYER INVENTORY & GLOSSARY SUMMARY\n';
  text += '═══════════════════════════════════════════════════\n\n';
  
  // Client & Config Info
  text += '📋 PROJECT INFORMATION\n';
  text += '─────────────────────────────────────────────────\n';
  text += `Client: ${config.clientName || 'Not specified'}\n`;
  text += `Primary Domain: ${config.primaryDomain}\n`;
  text += `Environment: ${config.environment}\n`;
  text += `Project Owner: ${config.projectOwner || 'Not specified'}\n`;
  text += `Report Generated: ${new Date().toLocaleString()}\n`;
  text += '\n';
  
  // Crawl Statistics
  text += '🕷️ CRAWL STATISTICS\n';
  text += '─────────────────────────────────────────────────\n';
  text += `Total Pages Discovered: ${crawlStats.total}\n`;
  text += `  ├─ Successfully Fetched: ${crawlStats.fetched}\n`;
  text += `  ├─ Pending: ${crawlStats.pending}\n`;
  text += `  └─ Errors: ${crawlStats.error}\n`;
  text += `\n`;
  text += `Progress: ${createProgressBar(crawlStats.fetched, crawlStats.total)}\n`;
  text += `Completion: ${crawlStats.percentComplete}%\n`;
  text += '\n';
  
  // Template Distribution
  text += '📄 TEMPLATE DISTRIBUTION\n';
  text += '─────────────────────────────────────────────────\n';
  text += `Unique Templates: ${crawlStats.templatesCount}\n\n`;
  
  const sortedTemplates = Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10
  
  sortedTemplates.forEach(([template, count]) => {
    const percentage = ((count / crawlStats.total) * 100).toFixed(1);
    text += `  ${template.padEnd(25)} ${String(count).padStart(4)} (${percentage}%)\n`;
  });
  text += '\n';
  
  // Data Layer Summary
  text += '🔍 DATA LAYER ANALYSIS\n';
  text += '─────────────────────────────────────────────────\n';
  text += `Total Unique Keys: ${dlSummary.totalKeys}\n`;
  text += `  ├─ Event-related: ${dlSummary.eventKeys}\n`;
  text += `  ├─ E-commerce: ${dlSummary.ecommerceKeys}\n`;
  text += `  └─ User-related: ${dlSummary.userKeys}\n`;
  text += '\n';
  
  if (Object.keys(dlSummary.byType).length > 0) {
    text += 'By Data Type:\n';
    Object.entries(dlSummary.byType).forEach(([type, count]) => {
      text += `  ${type.padEnd(15)} ${count}\n`;
    });
    text += '\n';
  }
  
  if (Object.keys(dlSummary.byScope).length > 0) {
    text += 'By Scope:\n';
    Object.entries(dlSummary.byScope).forEach(([scope, count]) => {
      text += `  ${scope.padEnd(15)} ${count}\n`;
    });
    text += '\n';
  }
  
  // Top Data Layer Keys
  text += '🔑 TOP DATA LAYER KEYS\n';
  text += '─────────────────────────────────────────────────\n';
  const allKeys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
  const topKeys = allKeys
    .slice(0, 15)
    .map(k => `  • ${k['Key Path']} (${k['Type']})`);
  text += topKeys.join('\n') + '\n\n';
  
  // Requirements Summary
  const requirements = getSheetDataAsObjects('TEMPLATE_REQUIREMENTS');
  if (requirements.length > 0) {
    text += '✅ TEMPLATE REQUIREMENTS\n';
    text += '─────────────────────────────────────────────────\n';
    text += `Templates with Requirements: ${requirements.length}\n\n`;
    
    requirements.slice(0, 5).forEach(req => {
      const reqKeys = (req['Required Keys'] || '').split(',').filter(k => k.trim()).length;
      const reqEvents = (req['Required Events'] || '').split(',').filter(e => e.trim()).length;
      const gaps = req['Known Gaps / Risks'];
      
      text += `${req['Template Name']}\n`;
      text += `  Required Keys: ${reqKeys}, Events: ${reqEvents}\n`;
      if (gaps && gaps !== 'None identified') {
        text += `  ⚠️ ${gaps}\n`;
      }
      text += '\n';
    });
  }
  
  // Issues Summary
  const issues = getSheetDataAsObjects('ISSUES_BACKLOG');
  if (issues.length > 0) {
    text += '⚠️ ISSUES & GAPS\n';
    text += '─────────────────────────────────────────────────\n';
    text += `Total Issues: ${issues.length}\n`;
    
    const bySeverity = {};
    const byStatus = {};
    
    issues.forEach(issue => {
      bySeverity[issue['Severity']] = (bySeverity[issue['Severity']] || 0) + 1;
      byStatus[issue['Status']] = (byStatus[issue['Status']] || 0) + 1;
    });
    
    text += '\nBy Severity:\n';
    Object.entries(bySeverity).forEach(([severity, count]) => {
      text += `  ${severity.padEnd(15)} ${count}\n`;
    });
    
    text += '\nBy Status:\n';
    Object.entries(byStatus).forEach(([status, count]) => {
      text += `  ${status.padEnd(15)} ${count}\n`;
    });
    text += '\n';
  }
  
  // Platform Mappings
  const ga4Mappings = getSheetDataAsObjects('GA4_MAPPING');
  const cm360Mappings = getSheetDataAsObjects('CM360_MAPPING');
  const dv360Mappings = getSheetDataAsObjects('DV360_MAPPING');
  
  if (ga4Mappings.length > 0 || cm360Mappings.length > 0 || dv360Mappings.length > 0) {
    text += '🎯 PLATFORM MAPPINGS\n';
    text += '─────────────────────────────────────────────────\n';
    if (ga4Mappings.length > 0) {
      text += `GA4 Mappings: ${ga4Mappings.length}\n`;
    }
    if (cm360Mappings.length > 0) {
      text += `CM360 Mappings: ${cm360Mappings.length}\n`;
    }
    if (dv360Mappings.length > 0) {
      text += `DV360/SA360 Mappings: ${dv360Mappings.length}\n`;
    }
    text += '\n';
  }
  
  // Next Steps
  text += '📌 RECOMMENDED NEXT STEPS\n';
  text += '─────────────────────────────────────────────────\n';
  const nextSteps = generateNextSteps(crawlStats, dlSummary, requirements.length, issues.length);
  nextSteps.forEach((step, i) => {
    text += `${i + 1}. ${step}\n`;
  });
  text += '\n';
  
  text += '═══════════════════════════════════════════════════\n';
  text += `Generated by: Site Data Layer Inventory Tool v1.0\n`;
  text += `Horizon Media - Platform Solutions Team\n`;
  text += '═══════════════════════════════════════════════════\n';
  
  return {
    text: text,
    config: config,
    crawlStats: crawlStats,
    dlSummary: dlSummary,
    templateCounts: templateCounts,
    requirements: requirements,
    issues: issues
  };
}

/**
 * Creates a formatted SUMMARY sheet in the workbook
 * 
 * @param {Object} summary - Summary object from buildCompleteSummary
 */
function createSummarySheet(summary) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Delete existing SUMMARY sheet if it exists
  const existingSheet = ss.getSheetByName('SUMMARY');
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // Create new SUMMARY sheet
  const sheet = ss.insertSheet('SUMMARY', 0); // Insert at beginning
  
  // Write summary text
  const lines = summary.text.split('\n');
  const data = lines.map(line => [line]);
  
  sheet.getRange(1, 1, data.length, 1).setValues(data);
  
  // Format the sheet
  sheet.setColumnWidth(1, 800);
  
  // Apply monospace font for better alignment
  sheet.getRange(1, 1, data.length, 1)
    .setFontFamily('Courier New')
    .setFontSize(10);
  
  // Bold headers (lines with all caps or special chars)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^[═─]+$/) || line.match(/^[A-Z\s]{10,}$/) || line.match(/^[📋🕷️📄🔍🔑✅⚠️🎯📌]/)) {
      sheet.getRange(i + 1, 1).setFontWeight('bold');
    }
  }
  
  Logger.log('SUMMARY sheet created successfully');
}

/**
 * Generates recommended next steps based on current state
 * 
 * @param {Object} crawlStats - Crawl statistics
 * @param {Object} dlSummary - Data layer summary
 * @param {number} requirementsCount - Count of requirements
 * @param {number} issuesCount - Count of issues
 * @returns {Array<string>} Array of next step recommendations
 */
function generateNextSteps(crawlStats, dlSummary, requirementsCount, issuesCount) {
  const steps = [];
  
  // Crawl not complete
  if (crawlStats.pending > 0) {
    steps.push(`Complete crawl - ${crawlStats.pending} page(s) still pending`);
  }
  
  // No data layer analysis yet
  if (dlSummary.totalKeys === 0 && crawlStats.fetched > 0) {
    steps.push('Run "Analyze Data Layers" to extract data layer information');
  }
  
  // No templates classified
  if (crawlStats.templatesCount === 0 && crawlStats.fetched > 0) {
    steps.push('Run "Refresh Template Suggestions" to classify page types');
  }
  
  // No requirements built
  if (requirementsCount === 0 && dlSummary.totalKeys > 0) {
    steps.push('Run "Build Template Requirements" to map keys to templates');
  }
  
  // Manual review needed
  if (dlSummary.totalKeys > 0) {
    steps.push('Review DATALAYER_DICTIONARY and add Business Meaning for key variables');
  }
  
  if (requirementsCount > 0) {
    steps.push('Review TEMPLATE_REQUIREMENTS and adjust Required vs. Optional classifications');
  }
  
  // Issues to address
  if (issuesCount > 0) {
    steps.push(`Address ${issuesCount} issue(s) in ISSUES_BACKLOG`);
  }
  
  // Platform mappings
  if (dlSummary.totalKeys > 0) {
    steps.push('Complete platform mappings in GA4_MAPPING, CM360_MAPPING, and DV360_MAPPING tabs');
  }
  
  // QA
  steps.push('Conduct QA testing to validate data layer implementation on live pages');
  
  // If nothing specific, general guidance
  if (steps.length === 0) {
    steps.push('Project appears complete - conduct stakeholder review');
    steps.push('Export data layer dictionary for development team reference');
    steps.push('Set up ongoing monitoring for data layer changes');
  }
  
  return steps;
}

/**
 * Exports the DATALAYER_DICTIONARY as a downloadable CSV
 * Creates a new sheet with CSV-formatted data
 */
function exportDataLayerDictionaryAsCsv() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const csvContent = exportDataLayerKeysAsCsv();
    
    if (!csvContent) {
      ui.alert('No Data', 'No data layer keys to export.', ui.ButtonSet.OK);
      return;
    }
    
    // Create a new sheet with the CSV content
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const exportSheet = ss.insertSheet('DL_EXPORT_CSV');
    
    const lines = csvContent.split('\n');
    const data = lines.map(line => [line]);
    
    exportSheet.getRange(1, 1, data.length, 1).setValues(data);
    exportSheet.setColumnWidth(1, 1000);
    
    ui.alert('CSV Export Ready', 
      'A new sheet "DL_EXPORT_CSV" has been created.\n\n' +
      'You can copy this content to a .csv file or download the sheet.',
      ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in exportDataLayerDictionaryAsCsv: ' + error.toString());
    ui.alert('Export Error', error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Creates a stakeholder-friendly presentation view
 * Simplified summary for non-technical audiences
 */
function createStakeholderView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or clear stakeholder sheet
  let sheet = ss.getSheetByName('STAKEHOLDER_VIEW');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('STAKEHOLDER_VIEW');
  }
  
  const config = getConfig();
  const crawlStats = getCrawlStatistics();
  const dlSummary = getDataLayerSummary();
  
  // Build stakeholder view
  const data = [
    ['Site Data Layer Inventory - Executive Summary'],
    [''],
    ['Client:', config.clientName || 'Not specified'],
    ['Domain:', config.primaryDomain],
    ['Report Date:', new Date().toLocaleDateString()],
    [''],
    ['COVERAGE'],
    ['Pages Analyzed:', crawlStats.fetched],
    ['Page Templates:', crawlStats.templatesCount],
    ['Data Layer Keys Cataloged:', dlSummary.totalKeys],
    [''],
    ['IMPLEMENTATION STATUS'],
    ['E-commerce Tracking Keys:', dlSummary.ecommerceKeys],
    ['Event Tracking Keys:', dlSummary.eventKeys],
    ['User Tracking Keys:', dlSummary.userKeys],
    [''],
    ['KEY FINDINGS'],
    ['See ISSUES_BACKLOG for detailed findings'],
    [''],
    ['NEXT ACTIONS'],
    ['See SUMMARY sheet for recommended next steps']
  ];
  
  sheet.getRange(1, 1, data.length, 2).setValues(data);
  
  // Format
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 400);
  
  sheet.getRange(1, 1, 1, 2)
    .setFontSize(14)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF');
  
  const sectionHeaders = [7, 12, 17, 20];
  sectionHeaders.forEach(row => {
    sheet.getRange(row, 1, 1, 2)
      .setFontWeight('bold')
      .setBackground('#E8F0FE');
  });
  
  Logger.log('STAKEHOLDER_VIEW sheet created');
  
  SpreadsheetApp.getUi().alert('Stakeholder View Created', 
    'A new STAKEHOLDER_VIEW sheet has been created with a high-level summary.',
    SpreadsheetApp.ButtonSet.OK);
}
