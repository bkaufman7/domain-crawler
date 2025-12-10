/**
 * GTM ANALYZER - Tagstack-style Container Health Analysis
 * 
 * This module provides comprehensive GTM container health scoring,
 * issue detection, best practices audit, and martech vendor analysis.
 * Modeled after the Tagstack.io GTM Setup Analyzer methodology.
 */

// ===== MAIN ANALYZER ENTRY POINT =====

/**
 * Generates a comprehensive Tagstack-style analysis report
 */
function generateTagstackAnalysis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Get container ID
    const containerId = getGtmContainerId_();
    if (!containerId) {
      ui.alert('Configuration Required', 
        'Please enter a GTM container ID in the GTM_CONFIG sheet first.',
        ui.ButtonSet.OK);
      return;
    }
    
    // Check if inspection data exists
    const tagsSheet = ss.getSheetByName('GTM_Tags');
    const triggersSheet = ss.getSheetByName('GTM_Triggers');
    const variablesSheet = ss.getSheetByName('GTM_Variables');
    
    // Check if sheets exist and have data (more than just header row)
    const hasData = tagsSheet && tagsSheet.getLastRow() > 1 &&
                    triggersSheet && triggersSheet.getLastRow() > 1 &&
                    variablesSheet && variablesSheet.getLastRow() > 1;
    
    let tags, triggers, variables;
    
    if (!hasData) {
      const response = ui.alert('No Container Data Found', 
        'Container inspection data not found. Would you like to run the inspection now?\n\n' +
        'This will fetch and analyze the GTM container data.',
        ui.ButtonSet.YES_NO);
      
      if (response === ui.Button.YES) {
        // Run inspection
        inspectGtmContainer();
        
        // Wait a moment for sheets to be created
        SpreadsheetApp.flush();
        
        // Re-read the data
        tags = getSheetDataAsObjects(ss.getSheetByName('GTM_Tags'));
        triggers = getSheetDataAsObjects(ss.getSheetByName('GTM_Triggers'));
        variables = getSheetDataAsObjects(ss.getSheetByName('GTM_Variables'));
        
        if (!tags || tags.length === 0) {
          ui.alert('Inspection Failed', 
            'The container inspection did not return any data.\n\n' +
            'Please run "Inspect Container" manually from the menu and try again.',
            ui.ButtonSet.OK);
          return;
        }
      } else {
        return;
      }
    } else {
      // Data already exists, read it
      tags = getSheetDataAsObjects(tagsSheet);
      triggers = getSheetDataAsObjects(triggersSheet);
      variables = getSheetDataAsObjects(variablesSheet);
    }
    
    ui.alert('Generating Analysis', 
      `Analyzing container ${containerId}...\n\n` +
      'This will create a comprehensive Tagstack-style report.\n' +
      'Please wait 30-60 seconds.',
      ui.ButtonSet.OK);
    
    // Perform analysis
    const analysis = analyzeContainer_(tags, triggers, variables, containerId);
    
    // Create report sheets
    createAnalysisSummarySheet_(analysis);
    createIssuesSheet_(analysis);
    createMartechSheet_(analysis);
    createEventsSheet_(analysis);
    createBestPracticesSheet_(analysis);
    
    // Activate summary
    ss.setActiveSheet(ss.getSheetByName('GTM_ANALYSIS_SUMMARY'));
    
    ui.alert('Analysis Complete!', 
      `Container Health Grade: ${analysis.grade} (${analysis.score}%)\n\n` +
      `✅ Created 5 analysis sheets:\n` +
      `• GTM_ANALYSIS_SUMMARY\n` +
      `• GTM_ISSUES\n` +
      `• GTM_MARTECH\n` +
      `• GTM_EVENTS\n` +
      `• GTM_BEST_PRACTICES`,
      ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in generateTagstackAnalysis: ' + error.stack);
    ui.alert('Analysis Error', error.message, ui.ButtonSet.OK);
  }
}

// ===== CONTAINER ANALYSIS ENGINE =====

/**
 * Performs comprehensive container analysis
 * Returns analysis object with scores, issues, vendors, events
 */
function analyzeContainer_(tags, triggers, variables, containerId) {
  const analysis = {
    containerId: containerId,
    timestamp: new Date().toLocaleString(),
    
    // Counts
    counts: {
      tags: tags.length,
      triggers: triggers.length,
      variables: variables.length,
      customHtml: tags.filter(t => t.type === 'Custom HTML').length,
      customImage: tags.filter(t => t.type === 'Custom Image').length,
      templates: tags.filter(t => t.type && t.type.includes('Custom Template')).length,
      paused: 0, // TODO: detect paused tags from raw data
      deadTags: 0 // TODO: detect tags without triggers
    },
    
    // Detected features
    features: {
      consentMode: false,
      cmp: false,
      serverSide: false,
      ga4: false,
      googleAds: false,
      floodlight: false,
      facebook: false,
      tiktok: false,
      linkedin: false
    },
    
    // Issues
    issues: [],
    
    // Vendors/Martech
    martech: [],
    
    // Events by vendor
    events: {
      facebook: [],
      tiktok: [],
      microsoft: [],
      linkedin: [],
      other: []
    },
    
    // Best practices
    recommendations: [],
    
    // Scoring
    score: 0,
    grade: 'F'
  };
  
  // Detect features
  detectFeatures_(analysis, tags);
  
  // Detect martech vendors
  detectMartech_(analysis, tags);
  
  // Detect events
  detectEvents_(analysis, tags);
  
  // Run issue detection
  detectIssues_(analysis, tags, triggers, variables);
  
  // Generate best practices recommendations
  generateRecommendations_(analysis, tags, triggers, variables);
  
  // Calculate health score
  calculateHealthScore_(analysis);
  
  return analysis;
}

// ===== FEATURE DETECTION =====

function detectFeatures_(analysis, tags) {
  tags.forEach(tag => {
    const type = tag.type || '';
    const raw = String(tag.raw || '').toLowerCase();
    
    // GA4
    if (type.includes('Google Tag') || type.includes('GA4') || raw.includes('gtag') || raw.includes('g-')) {
      analysis.features.ga4 = true;
    }
    
    // Google Ads
    if (type.includes('Google Ads') || type.includes('Conversion') || type.includes('Remarketing') || 
        raw.includes('aw-') || raw.includes('conversion')) {
      analysis.features.googleAds = true;
    }
    
    // Floodlight
    if (type.includes('Floodlight')) {
      analysis.features.floodlight = true;
    }
    
    // Facebook
    if (raw.includes('fbq') || raw.includes('facebook')) {
      analysis.features.facebook = true;
    }
    
    // TikTok
    if (raw.includes('ttq') || raw.includes('tiktok')) {
      analysis.features.tiktok = true;
    }
    
    // LinkedIn
    if (raw.includes('linkedin') || raw.includes('_linkedin_')) {
      analysis.features.linkedin = true;
    }
    
    // Consent Mode
    if (raw.includes('consent') || raw.includes('gtag(\'consent\'')) {
      analysis.features.consentMode = true;
    }
    
    // CMP
    if (raw.includes('cookiebot') || raw.includes('onetrust') || raw.includes('cookiepro') ||
        raw.includes('trustarc') || raw.includes('quantcast')) {
      analysis.features.cmp = true;
    }
    
    // Server-side
    if (raw.includes('server-side') || raw.includes('sgtm') || raw.includes('analytics.google.com/g/collect')) {
      analysis.features.serverSide = true;
    }
  });
}

// ===== MARTECH DETECTION =====

function detectMartech_(analysis, tags) {
  const vendors = new Set();
  const vendorDetails = [];
  
  tags.forEach(tag => {
    const raw = String(tag.raw || '').toLowerCase();
    const type = tag.type || '';
    
    // Google family
    if (type.includes('Google') || raw.includes('google')) {
      if (type.includes('Analytics') || raw.includes('analytics')) vendors.add('Google Analytics');
      if (type.includes('Ads') || raw.includes('googleads')) vendors.add('Google Ads');
      if (type.includes('Tag Manager')) vendors.add('Google Tag Manager');
      if (raw.includes('doubleclick')) vendors.add('Google DoubleClick');
      if (type.includes('Floodlight')) vendors.add('Google Floodlight');
    }
    
    // Meta/Facebook
    if (raw.includes('facebook') || raw.includes('fbq') || raw.includes('fb.')) {
      vendors.add('Meta (Facebook) Pixel');
    }
    
    // TikTok
    if (raw.includes('tiktok') || raw.includes('ttq')) {
      vendors.add('TikTok Pixel');
    }
    
    // LinkedIn
    if (raw.includes('linkedin') || raw.includes('_linkedin_')) {
      vendors.add('LinkedIn Insight Tag');
    }
    
    // Microsoft/Bing
    if (raw.includes('bing') || raw.includes('bat.bing.com') || raw.includes('uetq')) {
      vendors.add('Microsoft Advertising');
    }
    
    // Pinterest
    if (raw.includes('pinterest') || raw.includes('pintrk')) {
      vendors.add('Pinterest Tag');
    }
    
    // Snapchat
    if (raw.includes('snapchat') || raw.includes('snap.licdn.com') || type.includes('snap.licdn')) {
      vendors.add('Snapchat Pixel');
    }
    
    // Twitter/X
    if (raw.includes('twitter') || raw.includes('twq')) {
      vendors.add('Twitter (X) Pixel');
    }
    
    // Criteo
    if (raw.includes('criteo')) {
      vendors.add('Criteo');
    }
    
    // Hotjar
    if (raw.includes('hotjar')) {
      vendors.add('Hotjar');
    }
    
    // Optimizely
    if (raw.includes('optimizely')) {
      vendors.add('Optimizely');
    }
    
    // VWO
    if (raw.includes('visualwebsiteoptimizer') || raw.includes('vwo')) {
      vendors.add('VWO');
    }
    
    // Segment
    if (raw.includes('segment') || raw.includes('analytics.js')) {
      vendors.add('Segment');
    }
    
    // Amplitude
    if (raw.includes('amplitude')) {
      vendors.add('Amplitude');
    }
    
    // Mixpanel
    if (raw.includes('mixpanel')) {
      vendors.add('Mixpanel');
    }
    
    // Heap
    if (raw.includes('heap')) {
      vendors.add('Heap');
    }
    
    // Qualtrics
    if (raw.includes('qualtrics')) {
      vendors.add('Qualtrics');
    }
    
    // Salesforce
    if (raw.includes('salesforce') || raw.includes('pardot')) {
      vendors.add('Salesforce');
    }
    
    // HubSpot
    if (raw.includes('hubspot') || raw.includes('hs-analytics')) {
      vendors.add('HubSpot');
    }
    
    // Marketo
    if (raw.includes('marketo') || raw.includes('munchkin')) {
      vendors.add('Marketo');
    }
    
    // Adobe Analytics
    if (raw.includes('omniture') || raw.includes('adobe') || raw.includes('s_code')) {
      vendors.add('Adobe Analytics');
    }
    
    // Crazy Egg
    if (raw.includes('crazyegg')) {
      vendors.add('Crazy Egg');
    }
    
    // FullStory
    if (raw.includes('fullstory')) {
      vendors.add('FullStory');
    }
    
    // Lucky Orange
    if (raw.includes('luckyorange')) {
      vendors.add('Lucky Orange');
    }
    
    // Mouseflow
    if (raw.includes('mouseflow')) {
      vendors.add('Mouseflow');
    }
    
    // Intercom
    if (raw.includes('intercom')) {
      vendors.add('Intercom');
    }
    
    // Drift
    if (raw.includes('drift')) {
      vendors.add('Drift');
    }
    
    // Shopify
    if (raw.includes('shopify')) {
      vendors.add('Shopify');
    }
    
    // Klaviyo
    if (raw.includes('klaviyo')) {
      vendors.add('Klaviyo');
    }
  });
  
  analysis.martech = Array.from(vendors).sort();
  analysis.counts.martech = analysis.martech.length;
}

// ===== EVENT DETECTION =====

function detectEvents_(analysis, tags) {
  tags.forEach(tag => {
    const raw = String(tag.raw || '');
    const name = tag.name || '';
    
    // Facebook Pixel events
    if (raw.includes('fbq(')) {
      const fbEvents = raw.match(/fbq\(['"]track['"],\s*['"]([^'"]+)['"]/g) || [];
      fbEvents.forEach(evt => {
        const eventName = evt.match(/['"]([^'"]+)['"]$/);
        if (eventName) {
          analysis.events.facebook.push({
            event: eventName[1],
            tag: name,
            type: 'Standard'
          });
        }
      });
      
      const fbCustomEvents = raw.match(/fbq\(['"]trackCustom['"],\s*['"]([^'"]+)['"]/g) || [];
      fbCustomEvents.forEach(evt => {
        const eventName = evt.match(/['"]([^'"]+)['"]$/);
        if (eventName) {
          analysis.events.facebook.push({
            event: eventName[1],
            tag: name,
            type: 'Custom'
          });
        }
      });
    }
    
    // TikTok Pixel events
    if (raw.includes('ttq.track(')) {
      const ttEvents = raw.match(/ttq\.track\(['"]([^'"]+)['"]/g) || [];
      ttEvents.forEach(evt => {
        const eventName = evt.match(/['"]([^'"]+)['"]/);
        if (eventName) {
          analysis.events.tiktok.push({
            event: eventName[1],
            tag: name
          });
        }
      });
    }
    
    // Microsoft/Bing UET events
    if (raw.includes('uetq.push(')) {
      const msEvents = raw.match(/event['"]:\s*['"]([^'"]+)['"]/g) || [];
      msEvents.forEach(evt => {
        const eventName = evt.match(/['"]([^'"]+)['"]$/);
        if (eventName) {
          analysis.events.microsoft.push({
            event: eventName[1],
            tag: name
          });
        }
      });
    }
    
    // LinkedIn events
    if (raw.includes('_linkedin_')) {
      analysis.events.linkedin.push({
        event: 'Conversion',
        tag: name
      });
    }
  });
  
  // Deduplicate events
  analysis.events.facebook = deduplicateEvents_(analysis.events.facebook);
  analysis.events.tiktok = deduplicateEvents_(analysis.events.tiktok);
  analysis.events.microsoft = deduplicateEvents_(analysis.events.microsoft);
  analysis.events.linkedin = deduplicateEvents_(analysis.events.linkedin);
}

function deduplicateEvents_(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.event}_${e.tag}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===== ISSUE DETECTION =====

function detectIssues_(analysis, tags, triggers, variables) {
  const issues = [];
  
  // HIGH IMPACT ISSUES
  
  // No server-side GTM
  if (!analysis.features.serverSide) {
    issues.push({
      severity: 'HIGH',
      category: 'CRO / Site Speed',
      title: 'Enable GTM Server-side',
      description: 'Server-side tagging reduces client-side JavaScript, improving page speed and SEO.',
      impact: 'Performance, Privacy, Accuracy',
      affected: []
    });
  }
  
  // No consent mode with Google Ads
  if (analysis.features.googleAds && !analysis.features.consentMode) {
    issues.push({
      severity: 'HIGH',
      category: 'Privacy / Data Insights',
      title: 'Enable Consent Mode for Google Ads',
      description: 'Consent Mode helps recover conversions lost due to cookie consent while respecting privacy.',
      impact: 'Conversion tracking accuracy, GDPR compliance',
      affected: []
    });
  }
  
  // MEDIUM IMPACT ISSUES
  
  // Paused tags (TODO: need raw data to detect)
  // For now, estimating based on tag count
  if (analysis.counts.tags > 100) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Container Hygiene',
      title: 'Review for paused tags',
      description: 'Paused tags add bloat to the container without providing value.',
      impact: 'Container size, load time',
      affected: []
    });
  }
  
  // Too much Custom HTML
  const customHtmlRatio = analysis.counts.customHtml / analysis.counts.tags;
  if (customHtmlRatio > 0.3 && analysis.counts.customHtml > 10) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Best Practices',
      title: `Use GTM Templates instead of Custom HTML (${analysis.counts.customHtml} found)`,
      description: 'Custom HTML tags are harder to maintain and audit. GTM templates provide better governance.',
      impact: 'Maintainability, Security, Auditability',
      affected: tags.filter(t => t.type === 'Custom HTML').map(t => t.id || t.name).slice(0, 10)
    });
  }
  
  // Universal Analytics still present
  const hasUA = tags.some(t => String(t.raw || '').includes('UA-') || (t.type || '').includes('Universal Analytics'));
  if (hasUA) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Migration',
      title: 'Migrate Universal Analytics to GA4',
      description: 'Universal Analytics stopped collecting data July 1, 2023. All tracking should use GA4.',
      impact: 'Data collection, Future-proofing',
      affected: tags.filter(t => String(t.raw || '').includes('UA-')).map(t => t.id || t.name)
    });
  }
  
  // Missing conversion linker
  if (analysis.features.googleAds) {
    const hasConversionLinker = tags.some(t => (t.type || '').includes('Conversion Linker'));
    if (!hasConversionLinker) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Google Ads',
        title: 'Add Google Ads Conversion Linker tag',
        description: 'The conversion linker improves the accuracy of conversion tracking and remarketing.',
        impact: 'Conversion attribution accuracy',
        affected: []
      });
    }
  }
  
  // No User-ID for GA4
  if (analysis.features.ga4) {
    const hasUserId = variables.some(v => String(v.name || '').toLowerCase().includes('user') && 
                                           String(v.name || '').toLowerCase().includes('id'));
    if (!hasUserId) {
      issues.push({
        severity: 'LOW',
        category: 'Data Insights',
        title: 'Use GA4 User-ID for cross-device tracking',
        description: 'User-ID provides a more complete view of user journeys across devices and sessions.',
        impact: 'Cross-device attribution, User analytics',
        affected: []
      });
    }
  }
  
  analysis.issues = issues;
}

// ===== RECOMMENDATIONS =====

function generateRecommendations_(analysis, tags, triggers, variables) {
  const recommendations = [];
  
  // Container organization
  recommendations.push({
    category: 'Organization',
    title: 'Use naming conventions',
    description: 'Adopt consistent naming for tags, triggers, and variables (e.g., "GA4 - Event - Purchase")',
    priority: 'Medium'
  });
  
  // Performance
  if (analysis.counts.tags > 50) {
    recommendations.push({
      category: 'Performance',
      title: 'Audit tag firing conditions',
      description: 'Review all tags to ensure they only fire when necessary. Consider lazy loading non-critical tags.',
      priority: 'High'
    });
  }
  
  // Privacy
  if (!analysis.features.cmp) {
    recommendations.push({
      category: 'Privacy',
      title: 'Implement a Consent Management Platform',
      description: 'Use a CMP like OneTrust, Cookiebot, or Usercentrics for GDPR/CCPA compliance.',
      priority: 'High'
    });
  }
  
  // Testing
  recommendations.push({
    category: 'Testing',
    title: 'Use GTM Preview Mode regularly',
    description: 'Test all changes in Preview Mode before publishing to catch errors early.',
    priority: 'High'
  });
  
  // Documentation
  recommendations.push({
    category: 'Documentation',
    title: 'Maintain a tagging plan',
    description: 'Document what each tag does, when it fires, and why it exists.',
    priority: 'Medium'
  });
  
  analysis.recommendations = recommendations;
}

// ===== HEALTH SCORING =====

function calculateHealthScore_(analysis) {
  let score = 100; // Start at perfect
  
  // Deduct points for issues
  analysis.issues.forEach(issue => {
    if (issue.severity === 'HIGH') score -= 15;
    else if (issue.severity === 'MEDIUM') score -= 8;
    else if (issue.severity === 'LOW') score -= 3;
  });
  
  // Deduct for missing best practices
  if (!analysis.features.consentMode) score -= 10;
  if (!analysis.features.cmp) score -= 10;
  if (!analysis.features.serverSide) score -= 5;
  
  // Bonus for good practices
  if (analysis.counts.templates > analysis.counts.customHtml) score += 5;
  if (analysis.features.ga4) score += 5;
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Assign grade
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  analysis.score = score;
  analysis.grade = grade;
}

// ===== SHEET GENERATORS =====

/**
 * Creates the main analysis summary sheet (Tagstack-style dashboard)
 */
function createAnalysisSummarySheet_(analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_ANALYSIS_SUMMARY');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_ANALYSIS_SUMMARY');
  } else {
    sheet.clear();
  }
  
  const data = [];
  
  // Header
  data.push(['GTM CONTAINER HEALTH ANALYSIS', '', '', '']);
  data.push([`Container: ${analysis.containerId}`, '', '', '']);
  data.push([`Scan Date: ${analysis.timestamp}`, '', '', '']);
  data.push(['', '', '', '']);
  
  // Health Grade
  data.push(['CONTAINER HEALTH GRADE', '', '', '']);
  data.push(['Grade', analysis.grade, '', '']);
  data.push(['Score', `${analysis.score}%`, '', '']);
  data.push(['', '', '', '']);
  
  // Legend
  data.push(['ISSUE SEVERITY LEGEND', '', '', '']);
  data.push(['🔴 High Impact', 'Critical issues affecting performance, privacy, or accuracy', '', '']);
  data.push(['🟡 Medium Impact', 'Important improvements for best practices', '', '']);
  data.push(['🟢 Low Impact', 'Minor optimizations', '', '']);
  data.push(['✅ Passed', 'No issues detected', '', '']);
  data.push(['', '', '', '']);
  
  // Container metrics
  data.push(['CONTAINER METRICS', '', '', '']);
  data.push(['Total Tags', analysis.counts.tags, '', '']);
  data.push(['Total Triggers', analysis.counts.triggers, '', '']);
  data.push(['Total Variables', analysis.counts.variables, '', '']);
  data.push(['Custom HTML Tags', analysis.counts.customHtml, '', '']);
  data.push(['Template Tags', analysis.counts.templates, '', '']);
  data.push(['Custom Image Tags', analysis.counts.customImage, '', '']);
  data.push(['', '', '', '']);
  
  // Feature detection
  data.push(['DETECTED FEATURES', '', '', '']);
  data.push(['Consent Mode', analysis.features.consentMode ? '✅ Yes' : '❌ No', '', '']);
  data.push(['Consent Management Platform', analysis.features.cmp ? '✅ Yes' : '❌ No', '', '']);
  data.push(['Server-Side GTM', analysis.features.serverSide ? '✅ Yes' : '❌ No', '', '']);
  data.push(['GA4', analysis.features.ga4 ? '✅ Yes' : '❌ No', '', '']);
  data.push(['Google Ads', analysis.features.googleAds ? '✅ Yes' : '❌ No', '', '']);
  data.push(['Floodlight', analysis.features.floodlight ? '✅ Yes' : '❌ No', '', '']);
  data.push(['Facebook Pixel', analysis.features.facebook ? '✅ Yes' : '❌ No', '', '']);
  data.push(['TikTok Pixel', analysis.features.tiktok ? '✅ Yes' : '❌ No', '', '']);
  data.push(['LinkedIn Tag', analysis.features.linkedin ? '✅ Yes' : '❌ No', '', '']);
  data.push(['', '', '', '']);
  
  // Martech summary
  data.push(['MARTECH STACK', '', '', '']);
  data.push(['Technologies Detected', analysis.counts.martech, '', '']);
  data.push(['Industry Average', '5-8', '', '']);
  data.push(['', '', '', '']);
  
  // Top issues
  data.push(['TOP ISSUES DETECTED', '', '', '']);
  const highIssues = analysis.issues.filter(i => i.severity === 'HIGH');
  const mediumIssues = analysis.issues.filter(i => i.severity === 'MEDIUM');
  
  if (highIssues.length === 0 && mediumIssues.length === 0) {
    data.push(['✅ No critical issues found!', '', '', '']);
  } else {
    highIssues.forEach(issue => {
      data.push([`🔴 ${issue.title}`, issue.category, '', '']);
    });
    mediumIssues.slice(0, 5).forEach(issue => {
      data.push([`🟡 ${issue.title}`, issue.category, '', '']);
    });
  }
  
  // Write data
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 4).setValues(data);
  }
  
  // Format
  formatAnalysisSummarySheet_(sheet);
}

function formatAnalysisSummarySheet_(sheet) {
  // Main header
  sheet.getRange('A1:D1').merge()
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center');
  
  // Grade display
  const gradeRow = findRowWithText_(sheet, 'CONTAINER HEALTH GRADE');
  if (gradeRow > 0) {
    sheet.getRange(gradeRow + 1, 2).setFontSize(24).setFontWeight('bold');
    sheet.getRange(gradeRow + 2, 2).setFontSize(18);
  }
  
  // Section headers
  const lastRow = sheet.getLastRow();
  for (let i = 1; i <= lastRow; i++) {
    const cellValue = sheet.getRange(i, 1).getValue();
    if (typeof cellValue === 'string' && cellValue === cellValue.toUpperCase() && cellValue.length > 5) {
      sheet.getRange(i, 1, 1, 4).merge()
        .setFontSize(12)
        .setFontWeight('bold')
        .setBackground('#E8F0FE')
        .setFontColor('#1A73E8');
    }
  }
  
  sheet.setColumnWidth(1, 350);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 200);
}

function findRowWithText_(sheet, text) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === text) return i + 1;
  }
  return -1;
}

/**
 * Creates detailed issues sheet
 */
function createIssuesSheet_(analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_ISSUES');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_ISSUES');
  } else {
    sheet.clear();
  }
  
  const data = [];
  
  data.push(['GTM Container Issues & Recommendations', '', '', '', '']);
  data.push([`Container: ${analysis.containerId}`, '', '', '', '']);
  data.push(['', '', '', '', '']);
  data.push(['Severity', 'Issue Title', 'Category', 'Description', 'Affected Items']);
  
  analysis.issues.forEach(issue => {
    const icon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
    const affected = issue.affected && issue.affected.length > 0 ? 
      issue.affected.join(', ') : 'N/A';
    
    data.push([
      `${icon} ${issue.severity}`,
      issue.title,
      issue.category,
      issue.description,
      affected
    ]);
  });
  
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 5).setValues(data);
  }
  
  // Format
  sheet.getRange('A1:E1').merge().setFontSize(14).setFontWeight('bold')
    .setBackground('#EA4335').setFontColor('#FFFFFF');
  sheet.getRange('A4:E4').setFontWeight('bold').setBackground('#F1F3F4');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 400);
  sheet.setColumnWidth(5, 200);
}

/**
 * Creates martech vendors sheet
 */
function createMartechSheet_(analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_MARTECH');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_MARTECH');
  } else {
    sheet.clear();
  }
  
  const data = [];
  
  data.push(['Marketing Technologies Detected', '', '']);
  data.push([`Container: ${analysis.containerId}`, '', '']);
  data.push([`Total Technologies: ${analysis.counts.martech}`, '', '']);
  data.push([`Industry Average: 5-8 technologies`, '', '']);
  data.push(['', '', '']);
  data.push(['#', 'Technology', 'Category']);
  
  analysis.martech.forEach((tech, idx) => {
    const category = categorizeTechnology_(tech);
    data.push([idx + 1, tech, category]);
  });
  
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 3).setValues(data);
  }
  
  sheet.getRange('A1:C1').merge().setFontSize(14).setFontWeight('bold')
    .setBackground('#34A853').setFontColor('#FFFFFF');
  sheet.getRange('A6:C6').setFontWeight('bold').setBackground('#F1F3F4');
  sheet.setColumnWidth(1, 50);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 200);
}

function categorizeTechnology_(tech) {
  if (tech.includes('Analytics') || tech.includes('Google Analytics') || tech.includes('Adobe')) return 'Analytics';
  if (tech.includes('Ads') || tech.includes('Advertising')) return 'Advertising';
  if (tech.includes('Pixel') || tech.includes('Tag')) return 'Marketing Pixel';
  if (tech.includes('Hotjar') || tech.includes('Crazy Egg') || tech.includes('FullStory')) return 'Session Recording';
  if (tech.includes('Optimizely') || tech.includes('VWO')) return 'A/B Testing';
  if (tech.includes('Segment') || tech.includes('Amplitude') || tech.includes('Mixpanel')) return 'Product Analytics';
  if (tech.includes('Salesforce') || tech.includes('HubSpot') || tech.includes('Marketo')) return 'Marketing Automation';
  if (tech.includes('Intercom') || tech.includes('Drift')) return 'Customer Communication';
  return 'Other';
}

/**
 * Creates events tracking sheet
 */
function createEventsSheet_(analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_EVENTS');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_EVENTS');
  } else {
    sheet.clear();
  }
  
  const data = [];
  
  data.push(['Event Tracking Analysis', '', '', '']);
  data.push([`Container: ${analysis.containerId}`, '', '', '']);
  data.push(['', '', '', '']);
  
  // Facebook events
  data.push(['FACEBOOK PIXEL EVENTS', '', '', '']);
  data.push(['Event Name', 'Type', 'Tag', '']);
  if (analysis.events.facebook.length > 0) {
    analysis.events.facebook.forEach(evt => {
      data.push([evt.event, evt.type || 'Standard', evt.tag, '']);
    });
  } else {
    data.push(['No Facebook events detected', '', '', '']);
  }
  data.push(['', '', '', '']);
  
  // TikTok events
  data.push(['TIKTOK PIXEL EVENTS', '', '', '']);
  data.push(['Event Name', 'Tag', '', '']);
  if (analysis.events.tiktok.length > 0) {
    analysis.events.tiktok.forEach(evt => {
      data.push([evt.event, evt.tag, '', '']);
    });
  } else {
    data.push(['No TikTok events detected', '', '', '']);
  }
  data.push(['', '', '', '']);
  
  // Microsoft events
  data.push(['MICROSOFT ADVERTISING EVENTS', '', '', '']);
  data.push(['Event Name', 'Tag', '', '']);
  if (analysis.events.microsoft.length > 0) {
    analysis.events.microsoft.forEach(evt => {
      data.push([evt.event, evt.tag, '', '']);
    });
  } else {
    data.push(['No Microsoft events detected', '', '', '']);
  }
  
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 4).setValues(data);
  }
  
  sheet.getRange('A1:D1').merge().setFontSize(14).setFontWeight('bold')
    .setBackground('#FBBC04').setFontColor('#FFFFFF');
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
}

/**
 * Creates best practices sheet
 */
function createBestPracticesSheet_(analysis) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('GTM_BEST_PRACTICES');
  
  if (!sheet) {
    sheet = ss.insertSheet('GTM_BEST_PRACTICES');
  } else {
    sheet.clear();
  }
  
  const data = [];
  
  data.push(['GTM Best Practices & Recommendations', '', '']);
  data.push([`Container: ${analysis.containerId}`, '', '']);
  data.push(['', '', '']);
  data.push(['Priority', 'Recommendation', 'Description']);
  
  analysis.recommendations.forEach(rec => {
    const icon = rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢';
    data.push([
      `${icon} ${rec.priority}`,
      rec.title,
      rec.description
    ]);
  });
  
  if (data.length > 0) {
    sheet.getRange(1, 1, data.length, 3).setValues(data);
  }
  
  sheet.getRange('A1:C1').merge().setFontSize(14).setFontWeight('bold')
    .setBackground('#9C27B0').setFontColor('#FFFFFF');
  sheet.getRange('A4:C4').setFontWeight('bold').setBackground('#F1F3F4');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 500);
}
