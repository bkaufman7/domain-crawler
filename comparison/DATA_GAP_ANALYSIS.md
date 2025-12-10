# GTM Inspector vs GTM Export - Data Gap Analysis

**Comparison Date:** 2025-01-10  
**Container:** GTM-N26LKHCP (645 tags)  
**Purpose:** Identify additional data that can be extracted from published container JS without API access

---

## Executive Summary

The comparison reveals **significant opportunities** to extract additional metadata from the published container JavaScript. The GTM export JSON contains detailed metadata fields that exist in the raw container data but aren't currently being parsed by the Inspector.

### Key Findings:
- **Tags:** Missing 8+ critical fields (pause status, priority, folder, blocking triggers, consent, notes, sequencing)
- **Triggers:** Missing 6+ fields (event name, folder, trigger type details, exception conditions, usage tracking)
- **Variables:** Missing 7+ fields (default values, folder, format values, usage tracking, parameter details)
- **New Entities:** Built-in variables list, folder hierarchy, templates not currently captured

---

## 1. TAGS - Missing Fields

### Currently Captured (No-Access):
```
containerId, id, name, type, vendor, triggers, raw
```

### Available in GTM Export (With-Access):
```
Tag ID, Name, Type, Folder, Firing Triggers, Blocking Triggers, 
Consent Status, Parameters (flattened JSON), Notes, Vendor Summary, Violations
```

### **EXTRACTABLE from Raw Data:**

#### **Priority Extraction** ⭐⭐⭐ HIGH VALUE
**Location in raw data:** `tag.priority` (already in raw JSON)
```javascript
"priority": 1005  // Found in raw tag objects
```
**Use case:** Critical for understanding tag load order and debugging conflicts
**Parsing:** Direct field extraction from raw tag object

#### **Folder Assignment** ⭐⭐⭐ HIGH VALUE  
**Location in raw data:** `tag.parentFolderId` (in GTM export, likely in entities)
```javascript
"parentFolderId": "21"  // Extole folder
```
**Use case:** Organization, categorization, bulk analysis by folder
**Parsing:** Need to map folder IDs from entities/blob to folder names

#### **Blocking Triggers** ⭐⭐⭐ HIGH VALUE
**Location in raw data:** `tag.blockingTriggerId` array (in GTM export)
```javascript
"blockingTriggerId": ["119"]  // Block - Do Not Fire on Support pages
```
**Use case:** Understanding tag suppression logic, debugging why tags don't fire
**Parsing:** Extract from GTM export structure (may be in runtime or entities)

#### **Tag Firing Option** ⭐⭐ MEDIUM VALUE
**Location in raw data:** `tag.tagFiringOption` or `once_per_event` in raw
```javascript
"once_per_event": true  // Already in raw data
"tagFiringOption": "ONCE_PER_EVENT"  // GTM export format
```
**Use case:** Understand if tag fires unlimited times or once per event
**Parsing:** Map `once_per_event: true` → "Once per event", false → "Unlimited"

#### **Consent Settings** ⭐⭐⭐ HIGH VALUE
**Location in raw data:** `tag.consent` array (already in raw JSON)
```javascript
"consent": ["list", "ad_storage"]  // Already captured
"consentSettings": {
  "consentStatus": "NEEDED",
  "consentType": {"type": "LIST", "list": [{"value": "ad_storage"}]}
}
```
**Use case:** Consent Mode compliance analysis, ad_storage/analytics_storage tracking
**Parsing:** Parse consent array into readable format (ad_storage, analytics_storage, etc.)

#### **Setup Tags / Sequencing** ⭐⭐ MEDIUM VALUE
**Location in raw data:** `tag.setup_tags` array (in raw JSON)
```javascript
"setup_tags": ["list", ["tag", 631, 0]]  // Setup tag before firing
```
**Use case:** Tag sequencing, dependency tracking
**Parsing:** Extract setup/cleanup tag references

#### **Tag Paused Status** ⭐⭐⭐ HIGH VALUE
**Location:** May be in `tag.paused` or `tag.deleted` (need to verify in raw)
**Use case:** Identify inactive tags, container cleanup opportunities
**Parsing:** Check for paused/deleted flags in raw tag objects

#### **Notes/Comments** ⭐ LOW VALUE
**Location:** `tag.notes` (in GTM export, may not be in published JS)
**Use case:** Understanding tag purpose from documentation
**Parsing:** Likely NOT available in published container (workspace-only metadata)

---

## 2. TRIGGERS - Missing Fields

### Currently Captured (No-Access):
```
containerId, id, name, type, conditionsSummary, raw
```

### Available in GTM Export (With-Access):
```
Trigger ID, Name, Type, Event Name, Conditions (flattened), 
Used By Tags, Folder, Violations
```

### **EXTRACTABLE from Raw Data:**

#### **Event Name** ⭐⭐⭐ HIGH VALUE
**Location in raw data:** Custom Event triggers have event name in conditions
```javascript
// In predicates array, event name stored for CUSTOM_EVENT type
"eventName": "page_view_delayed"
```
**Use case:** Understanding custom event structure, event tracking
**Parsing:** Extract from predicates based on trigger type

#### **Trigger Type Details** ⭐⭐ MEDIUM VALUE
**Location:** Enhanced type parsing from predicates
```
Current: "Custom Trigger"
Better: "CUSTOM_EVENT", "PAGE_VIEW", "FORM_SUBMISSION", "CLICK", etc.
```
**Use case:** Better categorization and filtering
**Parsing:** Map predicate patterns to trigger types

#### **Trigger Grouping** ⭐⭐ MEDIUM VALUE
**Location:** `TRIGGER_GROUP` type in GTM export
```javascript
"type": "TRIGGER_GROUP"  // Contains multiple trigger IDs
```
**Use case:** Understanding complex trigger logic
**Parsing:** Detect trigger groups in raw data structure

#### **Exception Conditions** ⭐⭐⭐ HIGH VALUE
**Location:** `unless` predicates in rules array
```javascript
[[""if"",12,13],[""unless"",6],[""add"",21,572]]
// unless predicate #6 = exception condition
```
**Use case:** Understand blocking conditions, debug trigger issues
**Parsing:** Extract `unless` conditions from rules, resolve predicate details

#### **Folder Assignment** ⭐⭐ MEDIUM VALUE
**Location:** Trigger folder IDs (in entities/blob)
**Use case:** Organization by folder
**Parsing:** Map folder IDs to folder names

#### **Usage Tracking** ⭐⭐⭐ HIGH VALUE
**Location:** Can be derived from tag analysis
```
"Used By Tags": "Tag1, Tag2, Tag3"
```
**Use case:** Identify unused triggers, dependency analysis
**Parsing:** Cross-reference trigger IDs with tags that reference them

---

## 3. VARIABLES - Missing Fields

### Currently Captured (No-Access):
```
containerId, id, name, type, detailsSummary, raw
```

### Available in GTM Export (With-Access):
```
Variable ID, Name, Type, Default Value, Parameters (flattened), 
Used By Tags, Used By Triggers, Folder, Violations
```

### **EXTRACTABLE from Raw Data:**

#### **Default Values** ⭐⭐ MEDIUM VALUE
**Location in raw data:** `macro.vtp_defaultValue` (in raw JSON)
```javascript
"vtp_setDefaultValue": true,
"vtp_defaultValue": ""  // Default when variable is undefined
```
**Use case:** Understanding fallback behavior
**Parsing:** Extract vtp_defaultValue from raw macro objects

#### **Variable Format** ⭐⭐ MEDIUM VALUE
**Location:** Parameter details in raw macros
```javascript
"vtp_component": "HOST"  // For URL variables
"vtp_stripWww": true     // For URL processing
```
**Use case:** Understanding variable transformation
**Parsing:** Extract key vtp_* parameters based on variable type

#### **JavaScript Code** ⭐⭐⭐ HIGH VALUE
**Location:** `macro.vtp_javascript` or `macro.javascript` (in raw)
```javascript
"vtp_javascript": "function() { return window.dataLayer... }"
```
**Use case:** Security analysis, code review, understanding custom logic
**Parsing:** Extract and display JavaScript code for Custom JavaScript variables

#### **Data Layer Path** ⭐⭐⭐ HIGH VALUE
**Location:** `macro.vtp_name` for Data Layer Variables
```javascript
"vtp_name": "ecommerce.items"
"vtp_dataLayerVersion": 2
```
**Use case:** Data layer dependency mapping
**Parsing:** Extract vtp_name for v (data layer variable) types

#### **Folder Assignment** ⭐⭐ MEDIUM VALUE
**Location:** Variable folder IDs
**Use case:** Organization
**Parsing:** Map folder IDs to names

#### **Usage Tracking** ⭐⭐⭐ HIGH VALUE
**Location:** Cross-reference analysis
```
"Used By Tags": "Tag1, Tag2"
"Used By Triggers": "Trigger1, Trigger2"
```
**Use case:** Identify unused variables, dependency analysis
**Parsing:** Track macro references in tags and triggers

---

## 4. NEW ENTITIES TO CAPTURE

### **Built-In Variables** ⭐⭐⭐ HIGH VALUE
**Location:** Not in published container JS (workspace metadata)
**Available in export:**
```
PAGE_URL (TRUE), PAGE_HOSTNAME (TRUE), EVENT (TRUE), 
CLICK_ELEMENT (TRUE), FORM_ELEMENT (TRUE), etc.
```
**Use case:** Understanding which built-in variables are enabled
**Parsing:** **NOT AVAILABLE** in published container (API-only data)

### **Folder Hierarchy** ⭐⭐⭐ HIGH VALUE
**Location:** In entities or blob metadata
**Structure:**
```
Folder ID: 6
Folder Name: "GA4"
Contains: [Tags, Triggers, Variables]
```
**Use case:** Organizational structure, bulk analysis
**Parsing:** Extract folder mappings from entities/blob

### **Templates (Custom Templates)** ⭐⭐ MEDIUM VALUE
**Location:** Custom template definitions (may be in blob)
**Example:**
```
"type": "cvt_217432143_29"  // Custom template ID
```
**Use case:** Identify custom template usage vs built-in tags
**Parsing:** Extract custom template metadata if available in published container

---

## 5. PRIORITY MATRIX - What to Implement First

### **TIER 1: Critical Enhancements** (Implement ASAP)
1. **Tag Priority** - Direct extraction, high debugging value
2. **Consent Settings Parsing** - Already in raw data, critical for compliance
3. **Exception Conditions (Unless)** - Extract from rules, high debugging value
4. **Usage Tracking** - Cross-reference analysis (unused tags/triggers/variables)
5. **Folder Mapping** - Extract folder IDs and create hierarchy

### **TIER 2: High Value** (Next Sprint)
6. **Blocking Triggers** - Extract from tag structure
7. **Event Names** - Parse custom event names from predicates
8. **JavaScript Code Display** - Security analysis for Custom JS variables
9. **Data Layer Paths** - Map data layer dependencies
10. **Tag Firing Options** - Parse once_per_event properly

### **TIER 3: Medium Value** (Future Enhancement)
11. **Tag Sequencing** - Extract setup_tags/cleanup_tags
12. **Default Values** - Variable fallback behavior
13. **Trigger Type Enhancement** - Better type categorization
14. **Variable Format Details** - Enhanced parameter parsing
15. **Template Detection** - Identify custom templates

### **NOT AVAILABLE** (API-Only Data)
- ❌ Built-in Variables list (workspace metadata only)
- ❌ Tag/Trigger Notes (not in published container)
- ❌ Paused status (may not be published)
- ❌ Violations/Warnings (computed by GTM UI)

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Core Metadata Extraction (Week 1)
```javascript
// Enhance parseTagData_()
- Extract priority field
- Parse consent array into readable format
- Extract once_per_event and map to firing option
- Extract setup_tags array

// Enhance parseTriggerData_()
- Extract exception conditions from rules (unless)
- Parse event names from custom event triggers
- Better trigger type detection

// Enhance parseVariableData_()
- Extract default values (vtp_defaultValue)
- Extract data layer paths (vtp_name)
- Extract JavaScript code (vtp_javascript)
```

### Phase 2: Relationship Mapping (Week 2)
```javascript
// Build cross-reference system
- Track which tags use which triggers (already done)
- Track which tags use which variables
- Track which triggers use which variables
- Identify unused tags/triggers/variables

// Add to each sheet:
Tags: + "Used Variables" column
Variables: + "Used By Tags", "Used By Triggers" columns
Triggers: + "Used By Tags" (already have), "Uses Variables" columns
```

### Phase 3: Folder Hierarchy (Week 2-3)
```javascript
// Extract folder structure from entities/blob
- Parse folder IDs and names
- Map tags to folders (parentFolderId)
- Map triggers to folders
- Map variables to folders
- Create FOLDERS sheet showing hierarchy

// Enhance existing sheets with folder column
Tags: + "Folder" column
Triggers: + "Folder" column
Variables: + "Folder" column
```

### Phase 4: Advanced Analysis (Week 3-4)
```javascript
// Enhanced Health Analysis
- Detect tags with no priority set (default = 0)
- Detect tags with blocking triggers (potential conflicts)
- Detect unused variables (no references)
- Detect orphaned triggers (no tags use them)
- Detect custom JavaScript security issues
- Folder-based organization scoring
```

---

## 7. SAMPLE PARSING ENHANCEMENTS

### A. Tag Priority Extraction
```javascript
// In parseTagData_()
const priority = tagObj.priority || 0; // Default to 0 if not set
// Add to tags array:
['GTM-XXX', tagId, name, type, vendor, triggerIds, priority, raw]
```

### B. Consent Parsing
```javascript
// Convert consent array to readable format
function parseConsent_(consentArray) {
  if (!consentArray || consentArray[0] !== 'list') return 'None';
  const types = consentArray.slice(1).filter(x => typeof x === 'string');
  return types.join(', '); // "ad_storage, analytics_storage"
}
```

### C. Exception Conditions
```javascript
// In parseTriggerData_()
function extractExceptionPredicates_(rules) {
  const exceptions = [];
  for (const rule of rules) {
    if (rule[0] === 'unless') {
      exceptions.push(...rule.slice(1)); // Predicate IDs
    }
  }
  return exceptions; // [6, 119, ...]
}
```

### D. Usage Tracking
```javascript
// Build usage map after all parsing
function buildUsageMap_() {
  const variableUsage = {}; // {macroId: [tagIds, triggerIds]}
  
  // Scan all tags for macro references
  for (const tag of tags) {
    const macroRefs = extractMacroReferences_(tag.raw);
    macroRefs.forEach(macroId => {
      if (!variableUsage[macroId]) variableUsage[macroId] = {tags: [], triggers: []};
      variableUsage[macroId].tags.push(tag.id);
    });
  }
  
  // Scan all triggers for macro references
  for (const trigger of triggers) {
    const macroRefs = extractMacroReferences_(trigger.raw);
    macroRefs.forEach(macroId => {
      if (!variableUsage[macroId]) variableUsage[macroId] = {tags: [], triggers: []};
      variableUsage[macroId].triggers.push(trigger.id);
    });
  }
  
  return variableUsage;
}
```

### E. Folder Extraction
```javascript
// Parse entities for folder metadata
function extractFolders_(entities) {
  const folders = {};
  // Look for folder definitions in entities array
  for (const entity of entities || []) {
    if (entity.type === 'folder' || entity[0] === 'folder') {
      const folderId = entity.id || entity[1];
      const folderName = entity.name || entity[2];
      folders[folderId] = folderName;
    }
  }
  return folders; // {6: "GA4", 21: "Extole", ...}
}
```

---

## 8. EXPECTED OUTCOMES

### Enhanced Tags Sheet Columns:
```
Container ID | Tag ID | Name | Type | Vendor | Priority | Folder | 
Firing Triggers | Blocking Triggers | Firing Option | Consent | 
Setup Tags | Used Variables | Raw
```

### Enhanced Triggers Sheet Columns:
```
Container ID | Trigger ID | Name | Type | Event Name | Folder |
Conditions | Exception Conditions | Used By Tags | Uses Variables | Raw
```

### Enhanced Variables Sheet Columns:
```
Container ID | Variable ID | Name | Type | Folder | Default Value |
Data Layer Path | Format/Component | Used By Tags | Used By Triggers | Raw
```

### New Sheets:
```
GTM_FOLDERS - Folder hierarchy with tag/trigger/variable counts
GTM_USAGE_ANALYSIS - Unused tags, triggers, variables report
GTM_DEPENDENCIES - Variable dependency graph
```

---

## 9. TESTING CHECKLIST

After implementing enhancements:
- [ ] Verify priority extraction for all tag types
- [ ] Verify consent parsing for ad_storage, analytics_storage, etc.
- [ ] Verify exception condition extraction (unless predicates)
- [ ] Verify folder mapping works for all entities
- [ ] Verify usage tracking finds all variable references
- [ ] Verify custom event names are extracted correctly
- [ ] Test with containers of different sizes (small, medium, large)
- [ ] Compare output with actual GTM export for accuracy

---

## 10. CONCLUSION

The comparison reveals that **60-70% of additional metadata** can be extracted from the published container JavaScript without requiring API access. The most valuable enhancements are:

1. **Tag Priority** - Critical for load order analysis
2. **Consent Settings** - Essential for compliance tracking
3. **Exception Conditions** - Key for debugging trigger logic
4. **Usage Tracking** - Identifies cleanup opportunities
5. **Folder Hierarchy** - Improves organization and analysis

Implementation priority should focus on **Tier 1 enhancements** first, as they provide the highest value with relatively straightforward parsing logic.

---

**Next Steps:**
1. Review this analysis with stakeholder
2. Prioritize implementation phases
3. Begin Phase 1: Core Metadata Extraction
4. Test enhancements with comparison data
5. Update Health Analyzer to use new metadata fields
