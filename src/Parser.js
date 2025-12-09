/**
 * Parser.js
 * Extracts and parses data layer structures from HTML content.
 * Handles JSON-LD, dataLayer, digitalData, and other common patterns.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Extracts all potential data layer structures from HTML
 * 
 * @param {string} html - HTML content
 * @param {string} url - Source URL (for logging/context)
 * @returns {Array<Object>} Array of extracted data layer objects with metadata
 */
function extractDataLayerStructures(html, url) {
  const structures = [];
  
  if (!html) {
    return structures;
  }
  
  try {
    // 1. Extract JSON-LD (highest priority)
    const jsonLdObjects = extractJsonLd(html);
    jsonLdObjects.forEach(obj => {
      structures.push({
        source: 'JSON-LD',
        context: 'script[type="application/ld+json"]',
        data: obj,
        url: url
      });
    });
    
    // 2. Extract Google Analytics dataLayer
    const dataLayerObjects = extractDataLayer(html);
    dataLayerObjects.forEach(obj => {
      structures.push({
        source: 'dataLayer',
        context: 'window.dataLayer or dataLayer.push()',
        data: obj,
        url: url
      });
    });
    
    // 3. Extract Adobe digitalData
    const digitalDataObjects = extractDigitalData(html);
    digitalDataObjects.forEach(obj => {
      structures.push({
        source: 'digitalData',
        context: 'window.digitalData or digitalData',
        data: obj,
        url: url
      });
    });
    
    // 4. Extract other common config objects
    const otherObjects = extractOtherConfigObjects(html);
    otherObjects.forEach(obj => {
      structures.push({
        source: obj.name,
        context: obj.context,
        data: obj.data,
        url: url
      });
    });
    
    Logger.log(`Extracted ${structures.length} data layer structure(s) from ${url}`);
    
  } catch (error) {
    Logger.log(`ERROR extracting data layers from ${url}: ${error.toString()}`);
  }
  
  return structures;
}

/**
 * Extracts JSON-LD structured data from script tags
 * 
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of parsed JSON-LD objects
 */
function extractJsonLd(html) {
  const objects = [];
  
  // Find all <script type="application/ld+json"> blocks
  const scriptRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonContent = match[1].trim();
    
    try {
      const parsed = JSON.parse(jsonContent);
      objects.push(parsed);
      Logger.log('  ✓ Parsed JSON-LD structure');
    } catch (error) {
      Logger.log(`  ✗ Failed to parse JSON-LD: ${error.message}`);
    }
  }
  
  return objects;
}

/**
 * Extracts Google Analytics dataLayer objects
 * Looks for window.dataLayer = [...] and dataLayer.push({...}) patterns
 * 
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of dataLayer objects
 */
function extractDataLayer(html) {
  const objects = [];
  
  // Pattern 1: window.dataLayer = [...]
  const assignmentRegex = /(?:window\.)?dataLayer\s*=\s*(\[[\s\S]*?\]);/gi;
  
  let match;
  while ((match = assignmentRegex.exec(html)) !== null) {
    const jsonContent = match[1];
    
    try {
      const parsed = parseJavaScriptObject(jsonContent);
      if (Array.isArray(parsed)) {
        // dataLayer is typically an array of objects
        parsed.forEach(obj => {
          if (typeof obj === 'object' && obj !== null) {
            objects.push(obj);
          }
        });
      }
      Logger.log('  ✓ Parsed dataLayer assignment');
    } catch (error) {
      Logger.log(`  ✗ Failed to parse dataLayer assignment: ${error.message}`);
    }
  }
  
  // Pattern 2: dataLayer.push({...})
  const pushRegex = /dataLayer\.push\s*\(\s*({[\s\S]*?})\s*\)/gi;
  
  while ((match = pushRegex.exec(html)) !== null) {
    const jsonContent = match[1];
    
    try {
      const parsed = parseJavaScriptObject(jsonContent);
      if (typeof parsed === 'object' && parsed !== null) {
        objects.push(parsed);
      }
      Logger.log('  ✓ Parsed dataLayer.push()');
    } catch (error) {
      Logger.log(`  ✗ Failed to parse dataLayer.push(): ${error.message}`);
    }
  }
  
  return objects;
}

/**
 * Extracts Adobe digitalData objects
 * 
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of digitalData objects
 */
function extractDigitalData(html) {
  const objects = [];
  
  // Pattern: window.digitalData = {...} or digitalData = {...}
  const regex = /(?:window\.)?digitalData\s*=\s*({[\s\S]*?});/gi;
  
  let match;
  while ((match = regex.exec(html)) !== null) {
    const jsonContent = match[1];
    
    try {
      const parsed = parseJavaScriptObject(jsonContent);
      if (typeof parsed === 'object' && parsed !== null) {
        objects.push(parsed);
      }
      Logger.log('  ✓ Parsed digitalData');
    } catch (error) {
      Logger.log(`  ✗ Failed to parse digitalData: ${error.message}`);
    }
  }
  
  return objects;
}

/**
 * Extracts other common config objects
 * Looks for patterns like window.__INITIAL_STATE__, window.appConfig, etc.
 * 
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of config objects with metadata
 */
function extractOtherConfigObjects(html) {
  const objects = [];
  
  // Common config object patterns
  const patterns = [
    { name: '__INITIAL_STATE__', regex: /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/gi },
    { name: 'appConfig', regex: /window\.appConfig\s*=\s*({[\s\S]*?});/gi },
    { name: '__NEXT_DATA__', regex: /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/gi },
    { name: '__PRELOADED_STATE__', regex: /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/gi },
    { name: 'pageData', regex: /(?:window\.)?pageData\s*=\s*({[\s\S]*?});/gi },
    { name: 'analyticsData', regex: /(?:window\.)?analyticsData\s*=\s*({[\s\S]*?});/gi }
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(html)) !== null) {
      const jsonContent = match[1];
      
      try {
        const parsed = parseJavaScriptObject(jsonContent);
        if (typeof parsed === 'object' && parsed !== null) {
          objects.push({
            name: pattern.name,
            context: `window.${pattern.name}`,
            data: parsed
          });
          Logger.log(`  ✓ Parsed ${pattern.name}`);
        }
      } catch (error) {
        Logger.log(`  ✗ Failed to parse ${pattern.name}: ${error.message}`);
      }
    }
  });
  
  return objects;
}

/**
 * Attempts to parse JavaScript object literals to JSON
 * Handles common differences like single quotes, trailing commas, etc.
 * 
 * @param {string} jsCode - JavaScript object literal as string
 * @returns {Object|Array} Parsed object or array
 * @throws {Error} If parsing fails
 */
function parseJavaScriptObject(jsCode) {
  // Try direct JSON.parse first
  try {
    return JSON.parse(jsCode);
  } catch (e) {
    // Failed, try to clean it up
  }
  
  // Clean up common JavaScript-to-JSON issues
  let cleaned = jsCode;
  
  // Replace single quotes with double quotes (naive approach)
  // This is risky with nested strings, but works for simple cases
  cleaned = cleaned.replace(/'/g, '"');
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Remove comments (single-line and multi-line)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\/\/.*/g, '');
  
  // Try parsing again
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Still failed - try eval as last resort (DANGEROUS but in controlled environment)
    try {
      // Wrap in parentheses to ensure it's treated as expression
      const evaluated = (function() { return eval('(' + jsCode + ')'); })();
      return evaluated;
    } catch (evalError) {
      throw new Error(`Could not parse JavaScript object: ${e.message}`);
    }
  }
}

/**
 * Extracts meta tags that might contain structured data
 * 
 * @param {string} html - HTML content
 * @returns {Object} Object with meta tag data
 */
function extractMetaTags(html) {
  const metaData = {};
  
  // Open Graph meta tags
  const ogRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  
  while ((match = ogRegex.exec(html)) !== null) {
    const key = 'og:' + match[1];
    const value = match[2];
    metaData[key] = value;
  }
  
  // Twitter Card meta tags
  const twitterRegex = /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  
  while ((match = twitterRegex.exec(html)) !== null) {
    const key = 'twitter:' + match[1];
    const value = match[2];
    metaData[key] = value;
  }
  
  // Standard meta tags
  const standardMeta = ['description', 'keywords', 'author'];
  standardMeta.forEach(name => {
    const regex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
    const metaMatch = html.match(regex);
    if (metaMatch) {
      metaData[name] = metaMatch[1];
    }
  });
  
  return metaData;
}

/**
 * Extracts canonical URL from HTML
 * 
 * @param {string} html - HTML content
 * @returns {string} Canonical URL or empty string
 */
function extractCanonicalUrl(html) {
  const canonicalRegex = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i;
  const match = html.match(canonicalRegex);
  
  return match ? match[1] : '';
}

/**
 * Extracts title from HTML
 * 
 * @param {string} html - HTML content
 * @returns {string} Page title or empty string
 */
function extractTitle(html) {
  const titleRegex = /<title[^>]*>(.*?)<\/title>/i;
  const match = html.match(titleRegex);
  
  if (match) {
    // Decode HTML entities
    return decodeHtmlEntities(match[1].trim());
  }
  
  return '';
}

/**
 * Simple HTML entity decoder
 * 
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
}

/**
 * Detects e-commerce events in data layer structures
 * Looks for purchase, add_to_cart, begin_checkout, etc.
 * 
 * @param {Object} dataLayerObject - Data layer object to analyze
 * @returns {Array<string>} Array of detected event names
 */
function detectEvents(dataLayerObject) {
  const events = [];
  
  if (!dataLayerObject || typeof dataLayerObject !== 'object') {
    return events;
  }
  
  // Check for explicit event property
  if (dataLayerObject.event) {
    events.push(dataLayerObject.event);
  }
  
  // Check for ecommerce events
  if (dataLayerObject.ecommerce) {
    const ecom = dataLayerObject.ecommerce;
    
    if (ecom.purchase) events.push('purchase');
    if (ecom.checkout) events.push('begin_checkout');
    if (ecom.add) events.push('add_to_cart');
    if (ecom.remove) events.push('remove_from_cart');
    if (ecom.detail) events.push('view_item');
    if (ecom.impressions) events.push('view_item_list');
    if (ecom.click) events.push('select_item');
  }
  
  // Check for GTM-style events
  if (dataLayerObject.eventCategory && dataLayerObject.eventAction) {
    events.push(`${dataLayerObject.eventCategory}:${dataLayerObject.eventAction}`);
  }
  
  return events;
}

/**
 * Sanitizes extracted data for storage
 * Limits string length and handles special characters
 * 
 * @param {*} value - Value to sanitize
 * @param {number} maxLength - Maximum string length
 * @returns {*} Sanitized value
 */
function sanitizeValue(value, maxLength = 500) {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > maxLength) {
      return value.substring(0, maxLength) + '...';
    }
    return value;
  }
  
  if (typeof value === 'object') {
    // Convert objects/arrays to JSON string
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > maxLength) {
        return jsonStr.substring(0, maxLength) + '...';
      }
      return jsonStr;
    } catch (e) {
      return '[Complex Object]';
    }
  }
  
  return String(value);
}

/**
 * Validates if a string looks like valid JSON
 * 
 * @param {string} str - String to validate
 * @returns {boolean} True if valid JSON
 */
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}
