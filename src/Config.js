/**
 * Config.js
 * Handles reading and validating configuration from the DETAILS tab.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Reads configuration from the DETAILS tab and returns as an object
 * 
 * @returns {Object} Configuration object with all settings
 * @throws {Error} If required configuration values are missing
 */
function getConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DETAILS');
  
  if (!sheet) {
    throw new Error('DETAILS tab not found. Please run "Setup Sheet Structure" first.');
  }
  
  const data = sheet.getDataRange().getValues();
  const config = {};
  
  // Parse all parameter-value pairs (skip header row)
  for (let i = 1; i < data.length; i++) {
    const parameter = data[i][0];
    const value = data[i][1];
    
    if (parameter) {
      // Convert parameter name to camelCase key
      const key = parameterToCamelCase(parameter);
      config[key] = value;
    }
  }
  
  // Validate and set defaults
  return validateAndNormalizeConfig(config);
}

/**
 * Converts a parameter name to camelCase
 * Example: "Primary Domain" -> "primaryDomain"
 * 
 * @param {string} parameter - Parameter name from DETAILS tab
 * @returns {string} camelCase version
 */
function parameterToCamelCase(parameter) {
  return parameter
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      word = word.toLowerCase();
      if (index === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('')
    .replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
}

/**
 * Validates configuration and applies defaults where needed
 * 
 * @param {Object} config - Raw configuration object
 * @returns {Object} Validated and normalized configuration
 * @throws {Error} If critical configuration is missing or invalid
 */
function validateAndNormalizeConfig(config) {
  const normalized = {};
  
  // Primary Domain (required)
  if (!config.primaryDomain) {
    throw new Error('Primary Domain is required in DETAILS tab');
  }
  normalized.primaryDomain = normalizeUrl(config.primaryDomain);
  
  // Start URL (required)
  if (!config.startUrl) {
    throw new Error('Start URL is required in DETAILS tab');
  }
  normalized.startUrl = normalizeUrl(config.startUrl);
  
  // Validate that Start URL is within Primary Domain
  if (!normalized.startUrl.startsWith(normalized.primaryDomain)) {
    Logger.log(`WARNING: Start URL (${normalized.startUrl}) is not within Primary Domain (${normalized.primaryDomain})`);
  }
  
  // Max Pages (default: 500)
  normalized.maxPages = parseInt(config.maxPages) || 500;
  if (normalized.maxPages < 1) {
    throw new Error('Max Pages must be at least 1');
  }
  
  // Max Depth (default: 3)
  normalized.maxDepth = parseInt(config.maxDepth) || 3;
  if (normalized.maxDepth < 1) {
    throw new Error('Max Depth must be at least 1');
  }
  
  // User Agent (default)
  normalized.userAgent = config.userAgent || 
    'Mozilla/5.0 (compatible; HorizonDataCrawler/1.0; +https://horizonmedia.com)';
  
  // Crawl Delay in milliseconds (default: 500ms)
  normalized.crawlDelay = parseInt(config.crawlDelayMs) || 500;
  
  // Follow External Links (default: false)
  normalized.followExternalLinks = parseBooleanValue(config.followExternalLinks, false);
  
  // Respect Robots.txt (default: true)
  normalized.respectRobotsTxt = parseBooleanValue(config.respectRobotsTxt, true);
  
  // Environment (default: Production)
  normalized.environment = config.environment || 'Production';
  
  // Optional metadata
  normalized.clientName = config.clientName || '';
  normalized.projectOwner = config.projectOwner || '';
  normalized.lastUpdated = config.lastUpdated || new Date();
  
  Logger.log('Configuration loaded and validated successfully');
  Logger.log(`Primary Domain: ${normalized.primaryDomain}`);
  Logger.log(`Start URL: ${normalized.startUrl}`);
  Logger.log(`Max Pages: ${normalized.maxPages}, Max Depth: ${normalized.maxDepth}`);
  
  return normalized;
}

/**
 * Normalizes a URL by ensuring it has a protocol and removing trailing slashes
 * 
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  url = url.trim();
  
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Remove trailing slash for consistency
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  return url;
}

/**
 * Parses a boolean value from various string representations
 * 
 * @param {*} value - Value to parse (can be string, boolean, or other)
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} Parsed boolean value
 */
function parseBooleanValue(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === 'yes' || lower === '1') {
      return true;
    }
    if (lower === 'false' || lower === 'no' || lower === '0') {
      return false;
    }
  }
  
  return defaultValue;
}

/**
 * Updates a specific configuration parameter in the DETAILS tab
 * 
 * @param {string} parameter - Parameter name
 * @param {*} value - New value
 */
function updateConfigParameter(parameter, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DETAILS');
  
  if (!sheet) {
    throw new Error('DETAILS tab not found');
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Find the parameter row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === parameter) {
      sheet.getRange(i + 1, 2).setValue(value);
      Logger.log(`Updated config parameter: ${parameter} = ${value}`);
      return;
    }
  }
  
  // If not found, append new row
  sheet.appendRow([parameter, value, '']);
  Logger.log(`Added new config parameter: ${parameter} = ${value}`);
}

/**
 * Gets a single configuration parameter value
 * 
 * @param {string} parameter - Parameter name
 * @param {*} defaultValue - Default value if parameter not found
 * @returns {*} Parameter value
 */
function getConfigParameter(parameter, defaultValue = null) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DETAILS');
  
  if (!sheet) {
    return defaultValue;
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Find the parameter row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === parameter) {
      return data[i][1] || defaultValue;
    }
  }
  
  return defaultValue;
}

/**
 * Validates configuration and returns array of issues
 * Used by menu validation function
 * 
 * @returns {Array<string>} Array of validation error messages (empty if valid)
 */
function validateConfigurationDetailed() {
  const issues = [];
  
  try {
    const config = getConfig();
    
    // Check Primary Domain
    if (!config.primaryDomain) {
      issues.push('Primary Domain is missing');
    } else if (!config.primaryDomain.match(/^https?:\/\/.+/)) {
      issues.push('Primary Domain must be a valid URL with http:// or https://');
    }
    
    // Check Start URL
    if (!config.startUrl) {
      issues.push('Start URL is missing');
    } else if (!config.startUrl.match(/^https?:\/\/.+/)) {
      issues.push('Start URL must be a valid URL with http:// or https://');
    }
    
    // Check Max Pages
    if (config.maxPages < 1 || config.maxPages > 10000) {
      issues.push('Max Pages should be between 1 and 10,000');
    }
    
    // Check Max Depth
    if (config.maxDepth < 1 || config.maxDepth > 10) {
      issues.push('Max Depth should be between 1 and 10');
    }
    
    // Warn about high crawl settings
    if (config.maxPages > 1000) {
      issues.push('WARNING: Max Pages > 1000 may take multiple runs and significant time');
    }
    
    if (config.maxDepth > 5) {
      issues.push('WARNING: Max Depth > 5 may result in crawling a very large number of pages');
    }
    
  } catch (error) {
    issues.push('Configuration error: ' + error.message);
  }
  
  return issues;
}

/**
 * Returns a summary of current configuration as a formatted string
 * Useful for logging or display
 * 
 * @returns {string} Formatted configuration summary
 */
function getConfigSummary() {
  try {
    const config = getConfig();
    
    return `Configuration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary Domain:    ${config.primaryDomain}
Start URL:         ${config.startUrl}
Max Pages:         ${config.maxPages}
Max Depth:         ${config.maxDepth}
Crawl Delay:       ${config.crawlDelay}ms
Follow External:   ${config.followExternalLinks}
Respect Robots:    ${config.respectRobotsTxt}
Environment:       ${config.environment}
Client:            ${config.clientName || 'Not specified'}
Owner:             ${config.projectOwner || 'Not specified'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    
  } catch (error) {
    return 'Configuration Error: ' + error.message;
  }
}
