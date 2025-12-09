/**
 * TemplateInference.js
 * Automatically classifies pages into templates based on URL patterns and content.
 * Suggests template types like PDP, PLP, Checkout, etc.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Main function to refresh template suggestions
 * Analyzes URLs and updates PAGES_INVENTORY and TEMPLATES tabs
 */
function refreshTemplateSuggestions() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('Starting template inference...');
    
    const pages = getSheetDataAsObjects('PAGES_INVENTORY');
    
    if (pages.length === 0) {
      ui.alert('No Pages Found', 
        'No pages in PAGES_INVENTORY.\n\n' +
        'Please run "Run Crawl" first.',
        ui.ButtonSet.OK);
      return;
    }
    
    ui.alert('Analyzing Templates', 
      `Analyzing ${pages.length} page(s) to suggest template classifications.\n\n` +
      'This will update the Template Type column in PAGES_INVENTORY.',
      ui.ButtonSet.OK);
    
    let pagesClassified = 0;
    let templatesCreated = 0;
    const templateExamples = {};
    
    // Classify each page
    pages.forEach(page => {
      const url = page.URL;
      const currentTemplate = page['Template Type'];
      
      // Skip if already manually classified (has a value that's not empty)
      // To override, user should clear the field first
      if (currentTemplate && currentTemplate.trim() !== '' && currentTemplate !== 'Unknown') {
        return;
      }
      
      const suggestion = classifyUrlTemplate(url);
      
      if (suggestion) {
        // Update page template
        updatePageTemplate(url, suggestion.templateType);
        pagesClassified++;
        
        // Track example URLs for each template
        if (!templateExamples[suggestion.templateName]) {
          templateExamples[suggestion.templateName] = {
            type: suggestion.templateType,
            pattern: suggestion.pattern,
            urls: []
          };
        }
        
        if (templateExamples[suggestion.templateName].urls.length < 3) {
          templateExamples[suggestion.templateName].urls.push(url);
        }
      }
    });
    
    // Create/update template entries
    Object.keys(templateExamples).forEach(templateName => {
      const template = templateExamples[templateName];
      
      const templateRow = {
        'Template Name': templateName,
        'Template Type': template.type,
        'Example URL': template.urls[0] || '',
        'Canonical Pattern': template.pattern,
        'Criticality': inferCriticality(template.type),
        'Description': generateTemplateDescription(template.type),
        'Owner': '',
        'Notes': `Auto-generated on ${new Date().toLocaleDateString()}`
      };
      
      const result = upsertRow('TEMPLATES', 'Template Name', templateName, templateRow);
      
      if (result === 'inserted') {
        templatesCreated++;
      }
    });
    
    const message = 
      `✅ Template Classification Complete!\n\n` +
      `Pages Classified: ${pagesClassified}\n` +
      `Templates Created/Updated: ${templatesCreated}\n\n` +
      `Check PAGES_INVENTORY and TEMPLATES tabs.\n\n` +
      `You can manually adjust template classifications as needed.`;
    
    ui.alert('Template Suggestions Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in refreshTemplateSuggestions: ' + error.toString());
    ui.alert('Template Inference Error', 
      'An error occurred:\n\n' + error.toString(), 
      ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Classifies a URL into a template type
 * 
 * @param {string} url - URL to classify
 * @returns {Object|null} Classification object or null if no match
 */
function classifyUrlTemplate(url) {
  const path = extractPath(url).toLowerCase();
  
  // Template classification rules (order matters - more specific first)
  const rules = [
    // E-commerce checkout flow
    {
      pattern: /\/checkout\/confirmation|\/order-confirmation|\/thank-you|\/receipt/,
      templateType: 'Confirmation',
      templateName: 'Order Confirmation'
    },
    {
      pattern: /\/checkout\/payment|\/checkout\/step-?3/,
      templateType: 'Checkout',
      templateName: 'Checkout - Payment'
    },
    {
      pattern: /\/checkout\/shipping|\/checkout\/step-?2/,
      templateType: 'Checkout',
      templateName: 'Checkout - Shipping'
    },
    {
      pattern: /\/checkout\/review|\/checkout\/step-?4/,
      templateType: 'Checkout',
      templateName: 'Checkout - Review'
    },
    {
      pattern: /\/checkout|\/cart\/checkout/,
      templateType: 'Checkout',
      templateName: 'Checkout - Step 1'
    },
    {
      pattern: /\/cart|\/shopping-cart|\/bag/,
      templateType: 'Cart',
      templateName: 'Shopping Cart'
    },
    
    // Product pages
    {
      pattern: /\/product\/|\/p\/|\/products\/[^\/]+$/,
      templateType: 'PDP',
      templateName: 'PDP - Standard'
    },
    {
      pattern: /\/item\/|\/sku\//,
      templateType: 'PDP',
      templateName: 'PDP - Standard'
    },
    
    // Category/Listing pages
    {
      pattern: /\/category\/|\/c\/|\/categories\//,
      templateType: 'PLP',
      templateName: 'PLP - Category'
    },
    {
      pattern: /\/shop\/|\/products\/?$|\/catalog/,
      templateType: 'PLP',
      templateName: 'PLP - All Products'
    },
    {
      pattern: /\/search|\/results/,
      templateType: 'PLP',
      templateName: 'PLP - Search Results'
    },
    {
      pattern: /\/collection\/|\/collections\//,
      templateType: 'PLP',
      templateName: 'PLP - Collection'
    },
    
    // Account pages
    {
      pattern: /\/account|\/my-account|\/profile/,
      templateType: 'Account',
      templateName: 'Account Dashboard'
    },
    {
      pattern: /\/login|\/signin/,
      templateType: 'Account',
      templateName: 'Login'
    },
    {
      pattern: /\/register|\/signup|\/create-account/,
      templateType: 'Account',
      templateName: 'Registration'
    },
    {
      pattern: /\/orders|\/order-history/,
      templateType: 'Account',
      templateName: 'Order History'
    },
    
    // Content pages
    {
      pattern: /\/blog\/[^\/]+$/,
      templateType: 'Blog Post',
      templateName: 'Blog - Article'
    },
    {
      pattern: /\/blog\/?$/,
      templateType: 'Blog',
      templateName: 'Blog - Listing'
    },
    {
      pattern: /\/article\/|\/articles\//,
      templateType: 'Blog Post',
      templateName: 'Article'
    },
    {
      pattern: /\/about|\/about-us/,
      templateType: 'Content',
      templateName: 'About Us'
    },
    {
      pattern: /\/contact|\/contact-us/,
      templateType: 'Content',
      templateName: 'Contact Us'
    },
    {
      pattern: /\/faq|\/help/,
      templateType: 'Content',
      templateName: 'FAQ / Help'
    },
    {
      pattern: /\/privacy|\/terms|\/legal/,
      templateType: 'Content',
      templateName: 'Legal'
    },
    
    // Homepage (check last to avoid false positives)
    {
      pattern: /^\/?$/,
      templateType: 'Homepage',
      templateName: 'Homepage'
    }
  ];
  
  // Try each rule
  for (const rule of rules) {
    if (rule.pattern.test(path)) {
      return {
        templateType: rule.templateType,
        templateName: rule.templateName,
        pattern: rule.pattern.source
      };
    }
  }
  
  // Default classification
  return {
    templateType: 'Other',
    templateName: 'Other - Uncategorized',
    pattern: '.*'
  };
}

/**
 * Extracts the path portion from a URL
 * 
 * @param {string} url - Full URL
 * @returns {string} Path portion
 */
function extractPath(url) {
  try {
    const match = url.match(/^https?:\/\/[^\/]+(\/.*)?$/);
    return match ? (match[1] || '/') : '/';
  } catch (error) {
    return '/';
  }
}

/**
 * Updates the template type for a page
 * 
 * @param {string} url - Page URL
 * @param {string} templateType - Template type to set
 */
function updatePageTemplate(url, templateType) {
  const updates = {
    'Template Type': templateType
  };
  
  upsertRow('PAGES_INVENTORY', 'URL', url, updates);
}

/**
 * Infers the criticality level for a template type
 * 
 * @param {string} templateType - Template type
 * @returns {string} Criticality (High, Medium, Low)
 */
function inferCriticality(templateType) {
  const highCritical = ['Homepage', 'PDP', 'Cart', 'Checkout', 'Confirmation'];
  const mediumCritical = ['PLP', 'Account', 'Login', 'Registration'];
  
  if (highCritical.includes(templateType)) {
    return 'High';
  }
  
  if (mediumCritical.includes(templateType)) {
    return 'Medium';
  }
  
  return 'Low';
}

/**
 * Generates a description for a template type
 * 
 * @param {string} templateType - Template type
 * @returns {string} Description
 */
function generateTemplateDescription(templateType) {
  const descriptions = {
    'Homepage': 'Site homepage/landing page',
    'PDP': 'Product Detail Page - individual product view',
    'PLP': 'Product Listing Page - category or search results',
    'Cart': 'Shopping cart page',
    'Checkout': 'Checkout process page',
    'Confirmation': 'Order confirmation / thank you page',
    'Account': 'User account management pages',
    'Login': 'User login page',
    'Registration': 'New user registration page',
    'Blog': 'Blog listing or index page',
    'Blog Post': 'Individual blog post or article',
    'Content': 'General content page',
    'Other': 'Uncategorized page type'
  };
  
  return descriptions[templateType] || 'Auto-classified page template';
}

/**
 * Gets all unique template types currently in use
 * 
 * @returns {Array<string>} Array of unique template types
 */
function getUniqueTemplateTypes() {
  return getUniqueValues('PAGES_INVENTORY', 'Template Type');
}

/**
 * Gets page count by template type
 * 
 * @returns {Object} Object with template types as keys and counts as values
 */
function getTemplateTypeCounts() {
  const pages = getSheetDataAsObjects('PAGES_INVENTORY');
  const counts = {};
  
  pages.forEach(page => {
    const templateType = page['Template Type'] || 'Unclassified';
    counts[templateType] = (counts[templateType] || 0) + 1;
  });
  
  return counts;
}

/**
 * Exports template coverage report
 * 
 * @returns {string} Formatted report
 */
function getTemplateCoverageReport() {
  const counts = getTemplateTypeCounts();
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  let report = 'Template Coverage Report\n';
  report += '='.repeat(50) + '\n\n';
  
  // Sort by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  
  sorted.forEach(([template, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    const bar = createProgressBar(count, total, 15);
    report += `${template.padEnd(20)} ${bar}\n`;
  });
  
  report += '\n' + '='.repeat(50) + '\n';
  report += `Total Pages: ${total}\n`;
  
  return report;
}

/**
 * Suggests templates that might be missing based on common patterns
 * 
 * @returns {Array<string>} Array of suggested missing templates
 */
function suggestMissingTemplates() {
  const existingTypes = new Set(getUniqueTemplateTypes());
  
  const commonTemplates = [
    'Homepage',
    'PDP',
    'PLP',
    'Cart',
    'Checkout',
    'Confirmation',
    'Account',
    'Login'
  ];
  
  const missing = commonTemplates.filter(template => !existingTypes.has(template));
  
  return missing;
}

/**
 * Validates template consistency across the inventory
 * Identifies potential issues like:
 * - Multiple homepages
 * - Missing critical templates
 * - Unusual template distributions
 * 
 * @returns {Array<Object>} Array of validation issues
 */
function validateTemplateConsistency() {
  const issues = [];
  const counts = getTemplateTypeCounts();
  
  // Check for multiple homepages
  if (counts['Homepage'] > 1) {
    issues.push({
      severity: 'Medium',
      issue: `Multiple homepages detected (${counts['Homepage']})`,
      suggestion: 'Verify which URL is the actual homepage'
    });
  }
  
  // Check for no homepage
  if (!counts['Homepage']) {
    issues.push({
      severity: 'High',
      issue: 'No homepage detected',
      suggestion: 'Manually classify the homepage URL'
    });
  }
  
  // Check for high number of "Other" templates
  if (counts['Other'] && counts['Other'] > (Object.values(counts).reduce((a,b) => a+b, 0) * 0.3)) {
    issues.push({
      severity: 'Low',
      issue: 'High percentage of uncategorized pages',
      suggestion: 'Review URL patterns and add custom classification rules'
    });
  }
  
  // Check for missing critical templates
  const missing = suggestMissingTemplates();
  if (missing.length > 0) {
    issues.push({
      severity: 'Medium',
      issue: `Possibly missing templates: ${missing.join(', ')}`,
      suggestion: 'Verify if these page types exist on the site'
    });
  }
  
  return issues;
}
