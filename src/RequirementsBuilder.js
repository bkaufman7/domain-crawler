/**
 * RequirementsBuilder.js
 * Builds the TEMPLATE_REQUIREMENTS matrix by analyzing which data layer keys
 * and events appear on each template type.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Main function to build template requirements
 * Analyzes DATALAYER_DICTIONARY by template and populates TEMPLATE_REQUIREMENTS
 */
function buildTemplateRequirements() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    Logger.log('Starting template requirements build...');
    
    const templates = getSheetDataAsObjects('TEMPLATES');
    const dataLayerKeys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
    
    if (templates.length === 0) {
      ui.alert('No Templates Found', 
        'No templates in TEMPLATES tab.\n\n' +
        'Please run "Refresh Template Suggestions" first.',
        ui.ButtonSet.OK);
      return;
    }
    
    if (dataLayerKeys.length === 0) {
      ui.alert('No Data Layer Keys Found', 
        'No keys in DATALAYER_DICTIONARY.\n\n' +
        'Please run "Analyze Data Layers" first.',
        ui.ButtonSet.OK);
      return;
    }
    
    ui.alert('Building Requirements', 
      `Building requirements for ${templates.length} template(s).\n\n` +
      `Analyzing ${dataLayerKeys.length} data layer key(s).`,
      ui.ButtonSet.OK);
    
    let requirementsCreated = 0;
    
    // Build requirements for each template
    templates.forEach(template => {
      const templateName = template['Template Name'];
      const templateType = template['Template Type'];
      
      Logger.log(`Building requirements for: ${templateName}`);
      
      // Find keys that appear on this template
      const relevantKeys = dataLayerKeys.filter(key => {
        const templatesWhereSeenStr = key['Templates Where Seen'] || '';
        const templatesWhereSeen = templatesWhereSeenStr.split(',').map(t => t.trim());
        
        return templatesWhereSeen.includes(templateType) || 
               templatesWhereSeen.includes(templateName);
      });
      
      // Classify keys as required, optional, or event-based
      const classification = classifyKeys(relevantKeys, templateType);
      
      // Build requirement row
      const requirementRow = {
        'Template Name': templateName,
        'Required Keys': classification.required.join(', '),
        'Required Events': classification.events.join(', '),
        'Optional Keys': classification.optional.join(', '),
        'Known Gaps / Risks': identifyGaps(classification, templateType),
        'QA Priority': template['Criticality'] || 'Medium',
        'Last Validated Date': new Date(),
        'Validated By': 'Auto-generated'
      };
      
      upsertRow('TEMPLATE_REQUIREMENTS', 'Template Name', templateName, requirementRow);
      requirementsCreated++;
    });
    
    const message = 
      `✅ Requirements Build Complete!\n\n` +
      `Templates Processed: ${requirementsCreated}\n\n` +
      `Check TEMPLATE_REQUIREMENTS tab.\n\n` +
      `You can manually adjust required vs. optional classifications.`;
    
    ui.alert('Requirements Build Complete', message, ui.ButtonSet.OK);
    
  } catch (error) {
    Logger.log('ERROR in buildTemplateRequirements: ' + error.toString());
    ui.alert('Requirements Build Error', 
      'An error occurred:\n\n' + error.toString(), 
      ui.ButtonSet.OK);
    throw error;
  }
}

/**
 * Classifies keys into required, optional, and event categories
 * Based on template type and key characteristics
 * 
 * @param {Array<Object>} keys - Array of data layer key objects
 * @param {string} templateType - Template type being analyzed
 * @returns {Object} Classification object with required, optional, events arrays
 */
function classifyKeys(keys, templateType) {
  const classification = {
    required: [],
    optional: [],
    events: []
  };
  
  keys.forEach(key => {
    const keyPath = key['Key Path'];
    const eventName = key['Event Name (if applicable)'];
    const scope = key['Scope'];
    
    // Extract event names
    if (eventName && eventName.trim() !== '') {
      const events = eventName.split(',').map(e => e.trim());
      events.forEach(event => {
        if (!classification.events.includes(event)) {
          classification.events.push(event);
        }
      });
    }
    
    // Classify as required or optional based on template type and key path
    const isRequired = isKeyRequiredForTemplate(keyPath, templateType, scope);
    
    if (isRequired) {
      classification.required.push(keyPath);
    } else {
      classification.optional.push(keyPath);
    }
  });
  
  return classification;
}

/**
 * Determines if a key should be required for a given template
 * 
 * @param {string} keyPath - Data layer key path
 * @param {string} templateType - Template type
 * @param {string} scope - Key scope (Global, Page View, Event, Other)
 * @returns {boolean} True if key should be required
 */
function isKeyRequiredForTemplate(keyPath, templateType, scope) {
  const lower = keyPath.toLowerCase();
  
  // Global scope keys are typically required everywhere
  if (scope === 'Global') {
    return true;
  }
  
  // Template-specific required keys
  const rules = {
    'Homepage': [
      'pagetype', 'page.type', 'template'
    ],
    
    'PDP': [
      'product', 'productid', 'product.id', 'product.name', 
      'product.price', 'product.category', 'ecommerce.detail'
    ],
    
    'PLP': [
      'category', 'page.category', 'productlist'
    ],
    
    'Cart': [
      'cart', 'ecommerce.add', 'ecommerce.remove'
    ],
    
    'Checkout': [
      'checkout', 'ecommerce.checkout', 'step', 'checkout.step'
    ],
    
    'Confirmation': [
      'transaction', 'transactionid', 'transaction.id',
      'ecommerce.purchase', 'revenue', 'orderid', 'order.id'
    ],
    
    'Account': [
      'user', 'userid', 'user.id'
    ]
  };
  
  // Check if template type has specific rules
  if (rules[templateType]) {
    for (const pattern of rules[templateType]) {
      if (lower.includes(pattern.toLowerCase())) {
        return true;
      }
    }
  }
  
  // Page-scoped keys are generally required for their respective templates
  if (scope === 'Page View') {
    return true;
  }
  
  return false;
}

/**
 * Identifies gaps or risks in template requirements
 * 
 * @param {Object} classification - Classification object
 * @param {string} templateType - Template type
 * @returns {string} Gap/risk description
 */
function identifyGaps(classification, templateType) {
  const gaps = [];
  
  // Check for missing critical keys by template type
  const criticalKeys = {
    'PDP': ['product.id', 'product.name', 'product.price'],
    'Confirmation': ['transaction.id', 'revenue'],
    'Checkout': ['step'],
    'Cart': ['cart']
  };
  
  if (criticalKeys[templateType]) {
    const requiredLower = classification.required.map(k => k.toLowerCase());
    
    criticalKeys[templateType].forEach(criticalKey => {
      const found = requiredLower.some(k => k.includes(criticalKey.toLowerCase()));
      
      if (!found) {
        gaps.push(`Missing expected key: ${criticalKey}`);
      }
    });
  }
  
  // Check for missing events
  const criticalEvents = {
    'PDP': ['view_item'],
    'Confirmation': ['purchase'],
    'Checkout': ['begin_checkout'],
    'Cart': ['add_to_cart', 'remove_from_cart']
  };
  
  if (criticalEvents[templateType]) {
    const eventsLower = classification.events.map(e => e.toLowerCase());
    
    criticalEvents[templateType].forEach(criticalEvent => {
      const found = eventsLower.some(e => e.includes(criticalEvent.toLowerCase()));
      
      if (!found) {
        gaps.push(`Missing expected event: ${criticalEvent}`);
      }
    });
  }
  
  // Check for too few keys (might indicate incomplete implementation)
  if (classification.required.length + classification.optional.length < 3) {
    gaps.push('Very few data layer keys detected - implementation may be incomplete');
  }
  
  return gaps.join('; ') || 'None identified';
}

/**
 * Validates requirements against GA4 recommended events
 * Compares with standard GA4 e-commerce events
 * 
 * @returns {Array<Object>} Array of validation issues
 */
function validateAgainstGA4Standards() {
  const issues = [];
  
  const ga4EcommerceEvents = {
    'Homepage': ['page_view'],
    'PDP': ['page_view', 'view_item'],
    'PLP': ['page_view', 'view_item_list'],
    'Cart': ['page_view', 'add_to_cart', 'remove_from_cart', 'view_cart'],
    'Checkout': ['page_view', 'begin_checkout', 'add_shipping_info', 'add_payment_info'],
    'Confirmation': ['page_view', 'purchase']
  };
  
  const requirements = getSheetDataAsObjects('TEMPLATE_REQUIREMENTS');
  
  requirements.forEach(req => {
    const templateName = req['Template Name'];
    const templateType = req['Template Type'];
    const requiredEvents = (req['Required Events'] || '').split(',').map(e => e.trim().toLowerCase());
    
    if (ga4EcommerceEvents[templateType]) {
      const recommendedEvents = ga4EcommerceEvents[templateType];
      
      recommendedEvents.forEach(event => {
        const found = requiredEvents.some(e => e.includes(event));
        
        if (!found) {
          issues.push({
            template: templateName,
            severity: 'Medium',
            issue: `Missing GA4 recommended event: ${event}`,
            recommendation: `Implement ${event} event on ${templateType} template`
          });
        }
      });
    }
  });
  
  return issues;
}

/**
 * Generates a requirements coverage report
 * Shows what percentage of expected keys are present by template
 * 
 * @returns {string} Formatted report
 */
function getRequirementsCoverageReport() {
  const requirements = getSheetDataAsObjects('TEMPLATE_REQUIREMENTS');
  
  let report = 'Template Requirements Coverage Report\n';
  report += '='.repeat(60) + '\n\n';
  
  requirements.forEach(req => {
    const templateName = req['Template Name'];
    const requiredKeys = (req['Required Keys'] || '').split(',').filter(k => k.trim());
    const requiredEvents = (req['Required Events'] || '').split(',').filter(e => e.trim());
    const gaps = req['Known Gaps / Risks'];
    
    report += `${templateName}\n`;
    report += `  Required Keys: ${requiredKeys.length}\n`;
    report += `  Required Events: ${requiredEvents.length}\n`;
    
    if (gaps && gaps !== 'None identified') {
      report += `  ⚠️ Gaps: ${gaps}\n`;
    } else {
      report += `  ✅ No gaps identified\n`;
    }
    
    report += '\n';
  });
  
  return report;
}

/**
 * Suggests additional mappings for GA4, CM360, etc.
 * Populates mapping tabs with initial suggestions
 */
function suggestPlatformMappings() {
  const requirements = getSheetDataAsObjects('TEMPLATE_REQUIREMENTS');
  const dataLayerKeys = getSheetDataAsObjects('DATALAYER_DICTIONARY');
  
  let ga4MappingsAdded = 0;
  let cm360MappingsAdded = 0;
  
  requirements.forEach(req => {
    const templateName = req['Template Name'];
    const templateType = req['Template Type'];
    const requiredEvents = (req['Required Events'] || '').split(',').map(e => e.trim()).filter(e => e);
    
    // Suggest GA4 mappings for e-commerce templates
    if (['PDP', 'Cart', 'Checkout', 'Confirmation'].includes(templateType)) {
      requiredEvents.forEach(dlEvent => {
        const ga4Event = mapToGA4Event(dlEvent);
        
        // Find related keys
        const relatedKeys = dataLayerKeys.filter(key => {
          const eventName = key['Event Name (if applicable)'] || '';
          return eventName.includes(dlEvent);
        });
        
        relatedKeys.forEach(key => {
          const ga4Param = mapToGA4Parameter(key['Key Path']);
          
          const mappingRow = {
            'Template Name': templateName,
            'GA4 Event Name': ga4Event,
            'Data Layer Event Name': dlEvent,
            'GA4 Parameter': ga4Param,
            'Data Layer Key Path': key['Key Path'],
            'Notes': 'Auto-suggested mapping'
          };
          
          // Check if mapping already exists
          const existing = getSheetDataAsObjects('GA4_MAPPING').filter(row => 
            row['Template Name'] === templateName && 
            row['Data Layer Key Path'] === key['Key Path']
          );
          
          if (existing.length === 0) {
            appendRows('GA4_MAPPING', [buildRowFromObject(
              ['Template Name', 'GA4 Event Name', 'Data Layer Event Name', 
               'GA4 Parameter', 'Data Layer Key Path', 'Notes'],
              mappingRow
            )]);
            ga4MappingsAdded++;
          }
        });
      });
    }
    
    // Suggest CM360 Floodlight mappings for conversion templates
    if (['Confirmation'].includes(templateType)) {
      const conversionKeys = dataLayerKeys.filter(key => {
        const path = key['Key Path'].toLowerCase();
        return path.includes('transaction') || path.includes('revenue') || path.includes('order');
      });
      
      conversionKeys.forEach(key => {
        const mappingRow = {
          'Template Name': templateName,
          'Floodlight Activity / Group': 'Purchase / Conversion',
          'CM360 Parameter Name': mapToCM360Parameter(key['Key Path']),
          'Data Layer Key Path': key['Key Path'],
          'Notes': 'Auto-suggested for conversion tracking'
        };
        
        const existing = getSheetDataAsObjects('CM360_MAPPING').filter(row => 
          row['Template Name'] === templateName && 
          row['Data Layer Key Path'] === key['Key Path']
        );
        
        if (existing.length === 0) {
          appendRows('CM360_MAPPING', [buildRowFromObject(
            ['Template Name', 'Floodlight Activity / Group', 'CM360 Parameter Name', 
             'Data Layer Key Path', 'Notes'],
            mappingRow
          )]);
          cm360MappingsAdded++;
        }
      });
    }
  });
  
  Logger.log(`Added ${ga4MappingsAdded} GA4 mapping(s) and ${cm360MappingsAdded} CM360 mapping(s)`);
  
  return {
    ga4: ga4MappingsAdded,
    cm360: cm360MappingsAdded
  };
}

/**
 * Maps a data layer event name to GA4 event name
 * 
 * @param {string} dlEvent - Data layer event name
 * @returns {string} GA4 event name
 */
function mapToGA4Event(dlEvent) {
  const mapping = {
    'purchase': 'purchase',
    'checkout': 'begin_checkout',
    'addtocart': 'add_to_cart',
    'add_to_cart': 'add_to_cart',
    'removefromcart': 'remove_from_cart',
    'remove_from_cart': 'remove_from_cart',
    'productdetail': 'view_item',
    'view_item': 'view_item',
    'productclick': 'select_item',
    'productimpressions': 'view_item_list'
  };
  
  const normalized = dlEvent.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return mapping[normalized] || dlEvent;
}

/**
 * Maps a data layer key path to GA4 parameter name
 * 
 * @param {string} keyPath - Data layer key path
 * @returns {string} GA4 parameter name
 */
function mapToGA4Parameter(keyPath) {
  const lower = keyPath.toLowerCase();
  
  if (lower.includes('transaction.id') || lower.includes('orderid')) return 'transaction_id';
  if (lower.includes('revenue') || lower.includes('total')) return 'value';
  if (lower.includes('currency')) return 'currency';
  if (lower.includes('product.id') || lower.includes('sku')) return 'item_id';
  if (lower.includes('product.name')) return 'item_name';
  if (lower.includes('product.category')) return 'item_category';
  if (lower.includes('product.price')) return 'price';
  if (lower.includes('quantity')) return 'quantity';
  
  // Default: snake_case version of key path
  return keyPath.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/**
 * Maps a data layer key path to CM360 parameter name
 * 
 * @param {string} keyPath - Data layer key path
 * @returns {string} CM360 parameter name (u1, u2, etc. or custom)
 */
function mapToCM360Parameter(keyPath) {
  const lower = keyPath.toLowerCase();
  
  if (lower.includes('transaction.id') || lower.includes('orderid')) return 'ord (Order ID)';
  if (lower.includes('revenue') || lower.includes('total')) return 'cost (Revenue)';
  if (lower.includes('quantity')) return 'qty (Quantity)';
  
  // Custom variables
  return 'u1 (Custom - ' + keyPath + ')';
}
