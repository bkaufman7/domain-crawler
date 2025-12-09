/**
 * Crawler.js
 * Core crawling logic with automatic resume capability.
 * Respects Apps Script execution time limits and can resume from last position.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Main crawl function triggered from menu
 * Implements resume capability by checking PAGES_INVENTORY status
 */
function runCrawl() {
  const startTime = new Date();
  const MAX_EXECUTION_TIME = 5.5 * 60 * 1000; // 5.5 minutes (Apps Script limit is 6 min)
  
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Load and validate configuration
    const config = getConfig();
    Logger.log('Starting crawl with configuration:');
    Logger.log(getConfigSummary());
    
    // Initialize or resume crawl
    const crawlState = initializeCrawl(config);
    
    if (crawlState.isComplete) {
      ui.alert('Crawl Complete', 
        `All pages have been crawled.\n\n` +
        `Total pages: ${crawlState.totalPages}\n` +
        `Fetched: ${crawlState.fetchedPages}\n` +
        `Errors: ${crawlState.errorPages}\n\n` +
        `Run "Analyze Data Layers" to extract data layer information.`,
        ui.ButtonSet.OK);
      return;
    }
    
    ui.alert('Starting Crawl', 
      `Crawl initialized. Starting from:\n${config.startUrl}\n\n` +
      `Max Pages: ${config.maxPages}\n` +
      `Max Depth: ${config.maxDepth}\n\n` +
      `This may take several minutes. You'll be notified when complete or if it needs to resume.`,
      ui.ButtonSet.OK);
    
    let pagesFetched = 0;
    let pagesSkipped = 0;
    let errors = 0;
    
    // Main crawl loop
    while (true) {
      // Check time limit
      const elapsed = new Date() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        Logger.log('Approaching execution time limit, stopping to allow resume');
        break;
      }
      
      // Get next pending page
      const nextPage = getNextPendingPage();
      
      if (!nextPage) {
        Logger.log('No more pending pages, crawl complete');
        break;
      }
      
      // Check if we've hit max pages
      const currentTotal = getTotalFetchedPages();
      if (currentTotal >= config.maxPages) {
        Logger.log(`Reached max pages limit (${config.maxPages})`);
        break;
      }
      
      // Skip if depth exceeds limit
      if (nextPage.depth > config.maxDepth) {
        updatePageStatus(nextPage.url, 'Skipped', null, 'Depth limit exceeded');
        pagesSkipped++;
        continue;
      }
      
      // Fetch the page
      try {
        Logger.log(`Fetching [Depth ${nextPage.depth}]: ${nextPage.url}`);
        
        const result = fetchPage(nextPage.url, config);
        
        if (result.success) {
          // Update page status
          updatePageStatus(nextPage.url, 'Fetched', result.statusCode, '');
          
          // Extract and queue new links if within depth limit
          if (nextPage.depth < config.maxDepth) {
            const newLinks = extractAndQueueLinks(
              result.html,
              nextPage.url,
              nextPage.depth + 1,
              config
            );
            Logger.log(`  Found ${newLinks} new link(s)`);
          }
          
          pagesFetched++;
          
          // Polite delay
          if (config.crawlDelay > 0) {
            Utilities.sleep(config.crawlDelay);
          }
          
        } else {
          updatePageStatus(nextPage.url, 'Error', result.statusCode, result.error);
          errors++;
        }
        
      } catch (error) {
        Logger.log(`ERROR fetching ${nextPage.url}: ${error.toString()}`);
        updatePageStatus(nextPage.url, 'Error', null, error.toString().substring(0, 500));
        errors++;
      }
    }
    
    // Show completion summary
    const finalStats = getCrawlStatistics();
    const isComplete = finalStats.pending === 0;
    
    const message = isComplete 
      ? `✅ Crawl Complete!\n\n` +
        `Total Pages: ${finalStats.total}\n` +
        `Fetched: ${finalStats.fetched}\n` +
        `Errors: ${finalStats.error}\n\n` +
        `Next step: Run "Analyze Data Layers" to extract data layer information.`
      : `⏸️ Crawl Paused\n\n` +
        `This session:\n` +
        `  Fetched: ${pagesFetched}\n` +
        `  Errors: ${errors}\n\n` +
        `Overall progress:\n` +
        `  Total: ${finalStats.total}\n` +
        `  Fetched: ${finalStats.fetched}\n` +
        `  Pending: ${finalStats.pending}\n` +
        `  Errors: ${finalStats.error}\n\n` +
        `Run "Run Crawl" again to continue from where you left off.`;
    
    ui.alert(isComplete ? 'Crawl Complete' : 'Crawl Paused', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('FATAL ERROR in runCrawl: ' + error.toString());
    ui.alert('Crawl Error', 
      'An error occurred during crawling:\n\n' + error.toString(), 
      ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Initializes the crawl or determines resume state
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Crawl state information
 */
function initializeCrawl(config) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PAGES_INVENTORY');
  
  if (!sheet) {
    throw new Error('PAGES_INVENTORY sheet not found. Run "Setup Sheet Structure" first.');
  }
  
  // Check if we have any pages
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    // Fresh start - add the start URL
    Logger.log('Fresh crawl - adding start URL to queue');
    queuePage(config.startUrl, 0, '', config.environment);
    
    return {
      isComplete: false,
      totalPages: 1,
      fetchedPages: 0,
      errorPages: 0,
      pendingPages: 1
    };
  }
  
  // Resume - count statuses
  const stats = getCrawlStatistics();
  
  return {
    isComplete: stats.pending === 0,
    totalPages: stats.total,
    fetchedPages: stats.fetched,
    errorPages: stats.error,
    pendingPages: stats.pending
  };
}

/**
 * Fetches a single page and returns result
 * 
 * @param {string} url - URL to fetch
 * @param {Object} config - Configuration object
 * @returns {Object} Result object with success, html, statusCode, error
 */
function fetchPage(url, config) {
  try {
    const options = {
      'method': 'get',
      'headers': {
        'User-Agent': config.userAgent
      },
      'muteHttpExceptions': true, // Don't throw on HTTP errors
      'followRedirects': true,
      'validateHttpsCertificates': false // Allow self-signed certs in staging
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const html = response.getContentText();
    
    // Consider 2xx and 3xx as success
    const success = statusCode >= 200 && statusCode < 400;
    
    return {
      success: success,
      html: html,
      statusCode: statusCode,
      error: success ? null : `HTTP ${statusCode}`
    };
    
  } catch (error) {
    return {
      success: false,
      html: null,
      statusCode: null,
      error: error.toString()
    };
  }
}

/**
 * Extracts links from HTML and queues new pages
 * 
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL of the page
 * @param {number} depth - Depth level for discovered links
 * @param {Object} config - Configuration object
 * @returns {number} Number of new links queued
 */
function extractAndQueueLinks(html, baseUrl, depth, config) {
  const links = extractLinks(html, baseUrl, config);
  let queuedCount = 0;
  
  links.forEach(link => {
    // Check if already in inventory
    if (!isPageInInventory(link)) {
      queuePage(link, depth, baseUrl, config.environment);
      queuedCount++;
    }
  });
  
  return queuedCount;
}

/**
 * Extracts and normalizes all links from HTML
 * 
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {Object} config - Configuration object
 * @returns {Array<string>} Array of normalized URLs
 */
function extractLinks(html, baseUrl, config) {
  const links = new Set();
  
  // Regex to find href attributes
  // This is a simplified regex - real-world may need more sophistication
  const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    
    // Skip anchors, javascript:, mailto:, tel:, etc.
    if (href.startsWith('#') || 
        href.startsWith('javascript:') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:')) {
      continue;
    }
    
    // Resolve relative URLs
    const absoluteUrl = resolveUrl(href, baseUrl);
    
    // Filter based on domain
    if (shouldCrawlUrl(absoluteUrl, config)) {
      links.add(absoluteUrl);
    }
  }
  
  return Array.from(links);
}

/**
 * Resolves a potentially relative URL to absolute
 * 
 * @param {string} href - URL or relative path
 * @param {string} baseUrl - Base URL for resolution
 * @returns {string} Absolute URL
 */
function resolveUrl(href, baseUrl) {
  // Already absolute
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return cleanUrl(href);
  }
  
  // Protocol-relative
  if (href.startsWith('//')) {
    const baseProtocol = baseUrl.split(':')[0];
    return cleanUrl(baseProtocol + ':' + href);
  }
  
  // Parse base URL
  const baseUrlObj = parseUrl(baseUrl);
  
  // Absolute path
  if (href.startsWith('/')) {
    return cleanUrl(baseUrlObj.origin + href);
  }
  
  // Relative path
  const basePath = baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
  return cleanUrl(baseUrlObj.origin + basePath + href);
}

/**
 * Simple URL parser (since Apps Script doesn't have URL class)
 * 
 * @param {string} url - URL to parse
 * @returns {Object} Parsed URL components
 */
function parseUrl(url) {
  const match = url.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/);
  
  if (!match) {
    throw new Error('Invalid URL: ' + url);
  }
  
  return {
    protocol: match[1],
    host: match[2],
    pathname: match[3] || '/',
    origin: match[1] + '//' + match[2]
  };
}

/**
 * Cleans a URL by removing fragments and normalizing
 * 
 * @param {string} url - URL to clean
 * @returns {string} Cleaned URL
 */
function cleanUrl(url) {
  // Remove fragment
  url = url.split('#')[0];
  
  // Remove trailing slash (except for domain root)
  if (url.endsWith('/') && url.split('/').length > 3) {
    url = url.slice(0, -1);
  }
  
  return url;
}

/**
 * Determines if a URL should be crawled based on config
 * 
 * @param {string} url - URL to check
 * @param {Object} config - Configuration object
 * @returns {boolean} True if should crawl
 */
function shouldCrawlUrl(url, config) {
  // Must start with primary domain (unless followExternalLinks is true)
  if (!config.followExternalLinks && !url.startsWith(config.primaryDomain)) {
    return false;
  }
  
  // Skip common binary/media file extensions
  const skipExtensions = [
    '.pdf', '.zip', '.exe', '.dmg', '.pkg',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
    '.mp4', '.mov', '.avi', '.mp3', '.wav',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.css', '.js', '.xml', '.json'
  ];
  
  const lowerUrl = url.toLowerCase();
  if (skipExtensions.some(ext => lowerUrl.endsWith(ext))) {
    return false;
  }
  
  return true;
}

/**
 * Adds a page to the inventory queue
 * 
 * @param {string} url - URL to queue
 * @param {number} depth - Depth level
 * @param {string} discoveredFrom - Parent URL
 * @param {string} environment - Environment name
 */
function queuePage(url, depth, discoveredFrom, environment) {
  const row = {
    'Page ID': '', // Will auto-increment
    'URL': url,
    'Canonical URL': '',
    'Template Type': '',
    'HTTP Status': '',
    'Depth': depth,
    'Discovered From URL': discoveredFrom,
    'Environment': environment,
    'Crawl Status': 'Pending',
    'Last Fetched': '',
    'Notes': ''
  };
  
  upsertRow('PAGES_INVENTORY', 'URL', url, row);
}

/**
 * Updates the status of a page in inventory
 * 
 * @param {string} url - URL to update
 * @param {string} status - New status (Pending/Fetched/Error/Skipped)
 * @param {number} statusCode - HTTP status code
 * @param {string} notes - Notes/error message
 */
function updatePageStatus(url, status, statusCode, notes) {
  const updates = {
    'Crawl Status': status,
    'Last Fetched': new Date(),
    'HTTP Status': statusCode || '',
    'Notes': notes || ''
  };
  
  upsertRow('PAGES_INVENTORY', 'URL', url, updates);
}

/**
 * Checks if a page is already in the inventory
 * 
 * @param {string} url - URL to check
 * @returns {boolean} True if page exists in inventory
 */
function isPageInInventory(url) {
  const pages = getRowsWhere('PAGES_INVENTORY', 'URL', url);
  return pages.length > 0;
}

/**
 * Gets the next pending page to crawl
 * 
 * @returns {Object|null} Page object or null if no pending pages
 */
function getNextPendingPage() {
  const pages = getRowsWhere('PAGES_INVENTORY', 'Crawl Status', 'Pending');
  
  if (pages.length === 0) return null;
  
  // Sort by depth (crawl breadth-first)
  pages.sort((a, b) => a.Depth - b.Depth);
  
  return {
    url: pages[0].URL,
    depth: pages[0].Depth
  };
}

/**
 * Gets count of successfully fetched pages
 * 
 * @returns {number} Count of fetched pages
 */
function getTotalFetchedPages() {
  return countRowsWhere('PAGES_INVENTORY', 'Crawl Status', 'Fetched');
}
