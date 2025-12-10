# Phase 1 Implementation Guide - Quick Wins

**Estimated Time:** 1-2 hours  
**Files to Modify:** `src/GtmInspector.js`  
**Value:** Increase field coverage from ~45% to ~75%

---

## 🎯 GOALS

Add **8 new fields** with minimal code changes:
1. Tag Priority
2. Tag Consent Settings
3. Tag Firing Option
4. Tag Setup Tags
5. Trigger Exception Conditions
6. Trigger Event Names
7. Variable Default Values
8. Variable Data Layer Paths

---

## 📝 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Enhance parseTagData_()

**Location:** `src/GtmInspector.js` around line 450-550

**Current code structure:**
```javascript
parseTagData_(data) {
  const tags = [];
  const rawTags = data?.resource?.tags || [];
  
  for (let i = 0; i < rawTags.length; i++) {
    const tagObj = rawTags[i];
    const tagId = tagObj.tag_id || i;
    const functionName = tagObj.function || '';
    const name = this.resolveTagName_(tagObj, tagId);
    const type = functionName;
    const vendor = this.detectVendor_(tagObj, functionName);
    const triggerIds = this.extractTriggerIds_(tagObj, data.runtime);
    
    tags.push([
      this.containerId_,
      tagId,
      name,
      type,
      vendor,
      triggerIds.join(', '),
      JSON.stringify(tagObj)
    ]);
  }
  return tags;
}
```

**Enhanced code:**
```javascript
parseTagData_(data) {
  const tags = [];
  const rawTags = data?.resource?.tags || [];
  
  for (let i = 0; i < rawTags.length; i++) {
    const tagObj = rawTags[i];
    const tagId = tagObj.tag_id || i;
    const functionName = tagObj.function || '';
    const name = this.resolveTagName_(tagObj, tagId);
    const type = functionName;
    const vendor = this.detectVendor_(tagObj, functionName);
    const triggerIds = this.extractTriggerIds_(tagObj, data.runtime);
    
    // ✨ NEW: Extract additional fields
    const priority = this.extractTagPriority_(tagObj);
    const consent = this.parseConsentSettings_(tagObj);
    const firingOption = this.parseTagFiringOption_(tagObj);
    const setupTags = this.extractSetupTags_(tagObj);
    
    tags.push([
      this.containerId_,
      tagId,
      name,
      type,
      vendor,
      priority,                    // ✨ NEW
      triggerIds.join(', '),
      consent,                     // ✨ NEW
      firingOption,                // ✨ NEW
      setupTags.join(', '),        // ✨ NEW
      JSON.stringify(tagObj)
    ]);
  }
  return tags;
}
```

**Add these helper methods AFTER parseTagData_():**

```javascript
/**
 * Extract tag priority (higher = loads earlier)
 * @param {Object} tagObj - Raw tag object
 * @return {number} Priority value (default: 0)
 */
extractTagPriority_(tagObj) {
  return tagObj.priority || 0;
}

/**
 * Parse consent settings from tag
 * @param {Object} tagObj - Raw tag object
 * @return {string} Consent types (e.g., "ad_storage, analytics_storage")
 */
parseConsentSettings_(tagObj) {
  if (!tagObj.consent || !Array.isArray(tagObj.consent)) {
    return 'None';
  }
  
  // Format: ["list", "ad_storage", "analytics_storage"]
  if (tagObj.consent[0] === 'list') {
    const consentTypes = tagObj.consent.slice(1).filter(x => typeof x === 'string');
    return consentTypes.length > 0 ? consentTypes.join(', ') : 'None';
  }
  
  return 'None';
}

/**
 * Parse tag firing option
 * @param {Object} tagObj - Raw tag object
 * @return {string} "Once per event" or "Unlimited"
 */
parseTagFiringOption_(tagObj) {
  if (tagObj.once_per_event === true) {
    return 'Once per event';
  }
  if (tagObj.once_per_load === true) {
    return 'Once per page';
  }
  return 'Unlimited';
}

/**
 * Extract setup tags (tags that must fire before this one)
 * @param {Object} tagObj - Raw tag object
 * @return {Array<number>} Array of setup tag IDs
 */
extractSetupTags_(tagObj) {
  const setupTags = [];
  
  // Format: ["list", ["tag", 631, 0]]
  if (tagObj.setup_tags && Array.isArray(tagObj.setup_tags)) {
    for (const item of tagObj.setup_tags) {
      if (Array.isArray(item) && item[0] === 'tag' && typeof item[1] === 'number') {
        setupTags.push(item[1]);
      }
    }
  }
  
  return setupTags;
}
```

---

### STEP 2: Enhance parseTriggerData_()

**Location:** `src/GtmInspector.js` around line 600-700

**Current code structure:**
```javascript
parseTriggerData_(data) {
  const triggers = [];
  const predicates = data?.resource?.predicates || [];
  const rules = data.runtime || [];
  
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const triggerId = `trigger_${i}`;
    const name = `Trigger #${i}`;
    const type = 'Custom Trigger';
    const conditionsSummary = this.summarizeConditions_(rule, predicates);
    
    triggers.push([
      this.containerId_,
      triggerId,
      name,
      type,
      conditionsSummary,
      JSON.stringify(rule)
    ]);
  }
  return triggers;
}
```

**Enhanced code:**
```javascript
parseTriggerData_(data) {
  const triggers = [];
  const predicates = data?.resource?.predicates || [];
  const rules = data.runtime || [];
  
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const triggerId = `trigger_${i}`;
    const name = `Trigger #${i}`;
    const type = 'Custom Trigger';
    const conditionsSummary = this.summarizeConditions_(rule, predicates);
    
    // ✨ NEW: Extract exception conditions and event names
    const exceptions = this.extractExceptionConditions_(rule, predicates);
    const eventName = this.extractEventName_(rule, predicates);
    
    triggers.push([
      this.containerId_,
      triggerId,
      name,
      type,
      eventName,                   // ✨ NEW
      conditionsSummary,
      exceptions,                  // ✨ NEW
      JSON.stringify(rule)
    ]);
  }
  return triggers;
}
```

**Add these helper methods:**

```javascript
/**
 * Extract exception conditions (unless predicates) from trigger rule
 * @param {Array} rule - Runtime rule array
 * @param {Array} predicates - All predicates
 * @return {string} Exception summary (e.g., "Block on Support pages")
 */
extractExceptionConditions_(rule, predicates) {
  const exceptions = [];
  
  for (const condition of rule) {
    if (!Array.isArray(condition)) continue;
    
    // Find "unless" conditions
    if (condition[0] === 'unless') {
      for (let i = 1; i < condition.length; i++) {
        const predicateId = condition[i];
        const predicate = predicates[predicateId];
        if (predicate) {
          const summary = this.summarizePredicate_(predicate);
          exceptions.push(summary);
        }
      }
    }
  }
  
  return exceptions.length > 0 ? exceptions.join('; ') : 'None';
}

/**
 * Extract event name for custom event triggers
 * @param {Array} rule - Runtime rule array
 * @param {Array} predicates - All predicates
 * @return {string} Event name or empty string
 */
extractEventName_(rule, predicates) {
  // Look for custom event predicates
  for (const condition of rule) {
    if (!Array.isArray(condition) || condition[0] !== 'if') continue;
    
    for (let i = 1; i < condition.length; i++) {
      const predicateId = condition[i];
      const predicate = predicates[predicateId];
      
      if (!predicate || !Array.isArray(predicate)) continue;
      
      // Check if this is a custom event predicate
      // Format varies, but typically checks event name
      if (predicate[0] === 'equals' || predicate[0] === 'cn') {
        // Look for event variable reference
        const arg0 = predicate[1];
        if (Array.isArray(arg0) && arg0[0] === 'macro') {
          // This might be checking an event name
          const arg1 = predicate[2];
          if (typeof arg1 === 'string' && !arg1.startsWith('http')) {
            return arg1; // Likely an event name
          }
        }
      }
    }
  }
  
  return '';
}

/**
 * Summarize a single predicate for readability
 * @param {Array} predicate - Predicate array
 * @return {string} Human-readable summary
 */
summarizePredicate_(predicate) {
  if (!Array.isArray(predicate)) return 'Unknown';
  
  const [operator, ...args] = predicate;
  
  // Simple format for exceptions
  if (operator === 'contains' || operator === 'cn') {
    return `Contains: ${args[1] || 'value'}`;
  }
  if (operator === 'equals') {
    return `Equals: ${args[1] || 'value'}`;
  }
  if (operator === 'matches') {
    return `Matches: ${args[1] || 'pattern'}`;
  }
  
  return `${operator} condition`;
}
```

---

### STEP 3: Enhance parseVariableData_()

**Location:** `src/GtmInspector.js` around line 750-850

**Current code structure:**
```javascript
parseVariableData_(data) {
  const variables = [];
  const macros = data?.resource?.macros || [];
  
  for (let i = 0; i < macros.length; i++) {
    const macroObj = macros[i];
    const functionName = macroObj.function || '';
    const name = this.resolveVariableName_(macroObj, i);
    const type = this.detectVariableType_(functionName);
    const detailsSummary = this.summarizeVariableDetails_(macroObj);
    
    variables.push([
      this.containerId_,
      i,
      name,
      type,
      detailsSummary,
      JSON.stringify(macroObj)
    ]);
  }
  return variables;
}
```

**Enhanced code:**
```javascript
parseVariableData_(data) {
  const variables = [];
  const macros = data?.resource?.macros || [];
  
  for (let i = 0; i < macros.length; i++) {
    const macroObj = macros[i];
    const functionName = macroObj.function || '';
    const name = this.resolveVariableName_(macroObj, i);
    const type = this.detectVariableType_(functionName);
    const detailsSummary = this.summarizeVariableDetails_(macroObj);
    
    // ✨ NEW: Extract additional variable fields
    const defaultValue = this.extractDefaultValue_(macroObj);
    const dataLayerPath = this.extractDataLayerPath_(macroObj);
    
    variables.push([
      this.containerId_,
      i,
      name,
      type,
      defaultValue,                // ✨ NEW
      dataLayerPath,               // ✨ NEW
      detailsSummary,
      JSON.stringify(macroObj)
    ]);
  }
  return variables;
}
```

**Add these helper methods:**

```javascript
/**
 * Extract default value from variable
 * @param {Object} macroObj - Raw macro object
 * @return {string} Default value or empty string
 */
extractDefaultValue_(macroObj) {
  if (macroObj.vtp_setDefaultValue === true && macroObj.vtp_defaultValue !== undefined) {
    return String(macroObj.vtp_defaultValue);
  }
  return '';
}

/**
 * Extract data layer variable path
 * @param {Object} macroObj - Raw macro object
 * @return {string} Data layer path (e.g., "ecommerce.items")
 */
extractDataLayerPath_(macroObj) {
  // For data layer variables (function: "__v")
  if (macroObj.function === '__v' && macroObj.vtp_name) {
    return macroObj.vtp_name;
  }
  
  // For other variable types that access data layer
  if (macroObj.vtp_dataLayerVariable) {
    return macroObj.vtp_dataLayerVariable;
  }
  
  return '';
}
```

---

### STEP 4: Update Sheet Headers

**Location:** `src/GtmInspector.js` in `writeGtmTable_()` method

**Find the headers section** and update:

```javascript
// OLD TAGS HEADER:
const tagsHeaders = [
  'Container ID', 'Tag ID', 'Name', 'Type', 'Vendor', 'Triggers', 'Raw JSON'
];

// ✨ NEW TAGS HEADER:
const tagsHeaders = [
  'Container ID', 'Tag ID', 'Name', 'Type', 'Vendor', 'Priority', 
  'Triggers', 'Consent', 'Firing Option', 'Setup Tags', 'Raw JSON'
];

// OLD TRIGGERS HEADER:
const triggersHeaders = [
  'Container ID', 'Trigger ID', 'Name', 'Type', 'Conditions', 'Raw JSON'
];

// ✨ NEW TRIGGERS HEADER:
const triggersHeaders = [
  'Container ID', 'Trigger ID', 'Name', 'Type', 'Event Name', 
  'Conditions', 'Exception Conditions', 'Raw JSON'
];

// OLD VARIABLES HEADER:
const variablesHeaders = [
  'Container ID', 'Variable ID', 'Name', 'Type', 'Details', 'Raw JSON'
];

// ✨ NEW VARIABLES HEADER:
const variablesHeaders = [
  'Container ID', 'Variable ID', 'Name', 'Type', 'Default Value',
  'Data Layer Path', 'Details', 'Raw JSON'
];
```

---

### STEP 5: Adjust Column Widths

**Location:** `src/GtmInspector.js` in `writeGtmTable_()` method

**Update column width settings:**

```javascript
// For Tags sheet:
sheet.setColumnWidth(1, 120);  // Container ID
sheet.setColumnWidth(2, 80);   // Tag ID
sheet.setColumnWidth(3, 250);  // Name
sheet.setColumnWidth(4, 120);  // Type
sheet.setColumnWidth(5, 150);  // Vendor
sheet.setColumnWidth(6, 80);   // Priority ✨ NEW
sheet.setColumnWidth(7, 150);  // Triggers
sheet.setColumnWidth(8, 180);  // Consent ✨ NEW
sheet.setColumnWidth(9, 120);  // Firing Option ✨ NEW
sheet.setColumnWidth(10, 100); // Setup Tags ✨ NEW
sheet.setColumnWidth(11, 400); // Raw JSON

// For Triggers sheet:
sheet.setColumnWidth(1, 120);  // Container ID
sheet.setColumnWidth(2, 100);  // Trigger ID
sheet.setColumnWidth(3, 200);  // Name
sheet.setColumnWidth(4, 150);  // Type
sheet.setColumnWidth(5, 150);  // Event Name ✨ NEW
sheet.setColumnWidth(6, 300);  // Conditions
sheet.setColumnWidth(7, 250);  // Exceptions ✨ NEW
sheet.setColumnWidth(8, 400);  // Raw JSON

// For Variables sheet:
sheet.setColumnWidth(1, 120);  // Container ID
sheet.setColumnWidth(2, 100);  // Variable ID
sheet.setColumnWidth(3, 250);  // Name
sheet.setColumnWidth(4, 150);  // Type
sheet.setColumnWidth(5, 150);  // Default Value ✨ NEW
sheet.setColumnWidth(6, 200);  // Data Layer Path ✨ NEW
sheet.setColumnWidth(7, 300);  // Details
sheet.setColumnWidth(8, 400);  // Raw JSON
```

---

## 🧪 TESTING

### Test with Known Container

**Container ID:** GTM-N26LKHCP

**Expected Results:**

**Tags Sheet - First Row:**
```
Container ID: GTM-N26LKHCP
Tag ID: 313
Name: (auto-detected name)
Type: __gclidw
Vendor: Google Ads
Priority: 1005                 ✅ Should show 1005
Triggers: 313
Consent: ad_storage            ✅ Should show ad_storage
Firing Option: Once per event  ✅ Should show this
Setup Tags: (empty)
Raw JSON: {...}
```

**Triggers Sheet - First Row:**
```
Container ID: GTM-N26LKHCP
Trigger ID: trigger_0
Name: Trigger #0
Type: Custom Trigger
Event Name: (empty or detected)  ✅ Should detect if custom event
Conditions: All Pages
Exception Conditions: None        ✅ Should show exceptions if present
Raw JSON: [...[if,0,1],[add,14,60]...]
```

**Variables Sheet - First Row:**
```
Container ID: GTM-N26LKHCP
Variable ID: 0
Name: Environment Name
Type: Environment
Default Value: (empty)           ✅ Should extract if present
Data Layer Path: (empty)         ✅ Should show for __v types
Details: (summary)
Raw JSON: {function: __e}
```

---

## ✅ VERIFICATION CHECKLIST

Run Inspector and verify:

- [ ] Tags sheet has 11 columns (was 7)
- [ ] Triggers sheet has 8 columns (was 6)
- [ ] Variables sheet has 8 columns (was 6)
- [ ] Tag priority shows numbers (1005, 1000, 100, 0)
- [ ] Tag consent shows readable strings (ad_storage, analytics_storage)
- [ ] Tag firing option shows "Once per event" or "Unlimited"
- [ ] Tag setup tags shows tag IDs (comma-separated)
- [ ] Trigger exceptions show condition summaries
- [ ] Trigger event names show for custom events
- [ ] Variable default values show when present
- [ ] Variable data layer paths show for DLV types (ecommerce.items, etc.)

---

## 🐛 TROUBLESHOOTING

### Issue: "Cannot read property 'priority' of undefined"
**Solution:** Check if tagObj exists before accessing:
```javascript
const priority = tagObj?.priority || 0;
```

### Issue: Consent shows "[object Object]" instead of string
**Solution:** Make sure you're converting to string:
```javascript
return consentTypes.join(', '); // NOT: return consentTypes;
```

### Issue: Column widths are wrong
**Solution:** Count your columns carefully - array index in setColumnWidth is 1-based

### Issue: Event names not showing
**Solution:** Event name extraction is complex - may need to check multiple predicate formats

---

## 📊 EXPECTED IMPROVEMENT

### Before Phase 1:
```
Tags:      7 fields  |  47% coverage
Triggers:  6 fields  |  55% coverage  
Variables: 6 fields  |  50% coverage
```

### After Phase 1:
```
Tags:      11 fields  |  73% coverage  (+26%)
Triggers:   8 fields  |  73% coverage  (+18%)
Variables:  8 fields  |  67% coverage  (+17%)
```

**Average improvement: ~20% more data extracted!**

---

## ⏭️ NEXT STEPS

After completing Phase 1:

1. **Test thoroughly** with GTM-N26LKHCP
2. **Compare output** with CSV files in `comparison/with-access/` folder
3. **Deploy** via `clasp push`
4. **Get user feedback**
5. **Move to Phase 2** (Usage Tracking + Folders)

---

## 💾 COMMIT MESSAGE

```
feat: Phase 1 - Add priority, consent, exceptions, defaults

- Extract tag priority, consent settings, firing options, setup tags
- Extract trigger exception conditions and event names  
- Extract variable default values and data layer paths
- Update sheet headers and column widths
- Increase field coverage by ~20%

Related: #comparison-analysis
```

---

## 🎉 SUCCESS CRITERIA

Phase 1 is complete when:
✅ All 8 new fields are extracted correctly
✅ No errors in Apps Script execution log
✅ Output matches expected format
✅ Comparison with GTM export shows accurate data
✅ Code is deployed and working in production
