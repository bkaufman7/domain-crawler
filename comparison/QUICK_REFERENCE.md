# Data Gap Summary - Quick Reference

## 📊 Current Coverage vs Potential Coverage

### TAGS
```
✅ CURRENTLY CAPTURED (7 fields):
   - Container ID
   - Tag ID  
   - Name
   - Type
   - Vendor
   - Firing Triggers
   - Raw JSON

🎯 CAN ADD (8+ fields):
   ⭐⭐⭐ Priority (HIGH - already in raw data)
   ⭐⭐⭐ Consent Settings (HIGH - already in raw data) 
   ⭐⭐⭐ Blocking Triggers (HIGH - need to parse)
   ⭐⭐⭐ Folder (HIGH - need entities mapping)
   ⭐⭐ Tag Firing Option (MEDIUM - parse once_per_event)
   ⭐⭐ Setup Tags/Sequencing (MEDIUM - already in raw)
   ⭐⭐⭐ Used Variables (HIGH - cross-reference)
   ⭐⭐ Paused Status (MEDIUM - may not be published)

❌ NOT AVAILABLE (workspace-only):
   - Notes/Comments
   - Violations/Warnings
```

### TRIGGERS
```
✅ CURRENTLY CAPTURED (5 fields):
   - Container ID
   - Trigger ID
   - Name
   - Type (basic)
   - Conditions Summary
   - Raw JSON

🎯 CAN ADD (6+ fields):
   ⭐⭐⭐ Exception Conditions (HIGH - parse unless predicates)
   ⭐⭐⭐ Event Name (HIGH - for custom events)
   ⭐⭐⭐ Used By Tags (HIGH - cross-reference)
   ⭐⭐ Enhanced Type (MEDIUM - better categorization)
   ⭐⭐ Folder (MEDIUM - need entities mapping)
   ⭐⭐ Uses Variables (MEDIUM - cross-reference)
   ⭐⭐ Trigger Groups (MEDIUM - detect grouped triggers)

❌ NOT AVAILABLE:
   - Violations/Warnings
```

### VARIABLES
```
✅ CURRENTLY CAPTURED (5 fields):
   - Container ID
   - Variable ID
   - Name
   - Type
   - Details Summary
   - Raw JSON

🎯 CAN ADD (7+ fields):
   ⭐⭐⭐ Data Layer Path (HIGH - vtp_name field)
   ⭐⭐⭐ JavaScript Code (HIGH - security analysis)
   ⭐⭐⭐ Used By Tags (HIGH - cross-reference)
   ⭐⭐⭐ Used By Triggers (HIGH - cross-reference)
   ⭐⭐ Default Value (MEDIUM - vtp_defaultValue)
   ⭐⭐ Folder (MEDIUM - need entities mapping)
   ⭐⭐ Format/Component (MEDIUM - URL variables)
   ⭐ Parameter Details (LOW - enhanced parsing)

❌ NOT AVAILABLE:
   - Violations/Warnings
```

### NEW ENTITIES
```
🎯 CAN ADD:
   ⭐⭐⭐ Folder Hierarchy (HIGH - from entities/blob)
   ⭐⭐⭐ Usage Analysis (HIGH - unused items report)
   ⭐⭐⭐ Dependency Graph (HIGH - variable usage tree)
   ⭐⭐ Custom Templates (MEDIUM - if in published JS)

❌ NOT AVAILABLE (API-only):
   - Built-In Variables List
   - Workspace Settings
   - User Permissions
```

---

## 🎯 IMPLEMENTATION PRIORITY

### PHASE 1: Quick Wins (1-2 days)
```javascript
Tags:
✅ Extract priority field                    [EASY - direct field]
✅ Parse consent array                       [EASY - format string]
✅ Parse once_per_event → firing option      [EASY - boolean to string]

Triggers:
✅ Extract unless predicates → exceptions    [MEDIUM - array parsing]
✅ Extract event names for custom events     [MEDIUM - conditional parse]

Variables:
✅ Extract vtp_defaultValue → default value  [EASY - direct field]
✅ Extract vtp_name → data layer path        [EASY - direct field]
```

### PHASE 2: High Impact (3-5 days)
```javascript
All Entities:
✅ Build usage tracking system               [COMPLEX - cross-reference]
   - Tags → which variables they use
   - Variables → which tags/triggers use them
   - Triggers → which tags use them

✅ Extract folder hierarchy                  [MEDIUM - entities parsing]
   - Parse folder definitions from entities
   - Map tags/triggers/variables to folders
   - Create FOLDERS sheet
```

### PHASE 3: Advanced Features (5-7 days)
```javascript
✅ Blocking triggers extraction              [MEDIUM - structure parsing]
✅ Setup tags / sequencing                   [MEDIUM - array parsing]
✅ JavaScript code display for variables     [EASY - direct field]
✅ Enhanced trigger type detection           [MEDIUM - pattern matching]
✅ Unused items analysis                     [EASY - usage map filtering]
```

---

## 📈 VALUE ESTIMATION

### Current Inspector Coverage
```
Tags:       7/15 fields  = 47%  ⬜⬜⬜⬜⬜⬛⬛⬛⬛⬛
Triggers:   5/11 fields  = 45%  ⬜⬜⬜⬜⬛⬛⬛⬛⬛⬛
Variables:  5/12 fields  = 42%  ⬜⬜⬜⬜⬛⬛⬛⬛⬛⬛
```

### After Phase 1 (Quick Wins)
```
Tags:       12/15 fields = 80%  ⬜⬜⬜⬜⬜⬜⬜⬜⬛⬛
Triggers:   8/11 fields  = 73%  ⬜⬜⬜⬜⬜⬜⬜⬛⬛⬛
Variables:  9/12 fields  = 75%  ⬜⬜⬜⬜⬜⬜⬜⬜⬛⬛
```

### After Phase 2 (High Impact)
```
Tags:       14/15 fields = 93%  ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛
Triggers:   10/11 fields = 91%  ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛
Variables:  11/12 fields = 92%  ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛
+ New: Folders, Usage Analysis, Dependencies
```

### After Phase 3 (Complete)
```
Tags:       15/15 fields = 100% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
Triggers:   11/11 fields = 100% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
Variables:  12/12 fields = 100% ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜
+ Enhanced analysis capabilities
```

---

## 🔍 SAMPLE BEFORE/AFTER

### BEFORE (Current Tags Sheet)
```csv
Container ID | Tag ID | Name              | Type        | Vendor        | Triggers | Raw
GTM-N26LKHCP | 313    | Conversion Linker | gclidw      | Google Ads    | 313      | {...}
GTM-N26LKHCP | 1702   | DC-9124178        | googtag     | Google Analytics | 1702   | {...}
```

### AFTER (Enhanced Tags Sheet)
```csv
Container ID | Tag ID | Name              | Type    | Vendor    | Priority | Folder | Firing Triggers | Blocking Triggers | Firing Option    | Consent     | Used Variables | Raw
GTM-N26LKHCP | 313    | Conversion Linker | gclidw  | Google Ads | 1005    | -      | 313            | -                 | Once per event   | ad_storage  | -              | {...}
GTM-N26LKHCP | 1702   | DC-9124178        | googtag | GA        | 1000    | GA4    | 1702           | -                 | Once per event   | ad_storage  | [85]           | {...}
```

**VALUE ADD:**
- ✅ See load priority (1005 vs 1000) for conflict debugging
- ✅ Know consent requirements at a glance
- ✅ Understand tag grouping by folder
- ✅ Track variable dependencies
- ✅ See firing behavior (once vs unlimited)

---

## 📝 CODE CHANGES REQUIRED

### Files to Modify:
```
✏️ src/GtmInspector.js
   - parseTagData_()       → Add priority, consent, folder, firing option
   - parseTriggerData_()   → Add exceptions, event name, folder
   - parseVariableData_()  → Add default value, DL path, folder
   - NEW: extractFolders_()           → Parse folder hierarchy
   - NEW: buildUsageMap_()            → Cross-reference tracking
   - NEW: extractExceptionPredicates_() → Parse unless conditions
   - ENHANCE: writeGtmTable_()        → Handle new columns

✏️ src/GtmAnalyzer.js
   - analyzeContainer_()   → Use new priority, consent, folder data
   - detectIssues_()       → Check for missing priorities, unused items
   - NEW: analyzeFolderStructure_()  → Folder organization scoring
   - NEW: detectUnusedItems_()       → Find orphaned tags/triggers/variables
```

### New Files to Create:
```
📄 src/GtmUsageAnalyzer.js   → Dedicated usage tracking
📄 src/GtmFolderMapper.js    → Folder hierarchy management
```

### Estimated Lines of Code:
```
Phase 1:  ~200 LOC (parsing enhancements)
Phase 2:  ~400 LOC (usage tracking + folders)
Phase 3:  ~300 LOC (advanced features)
Total:    ~900 LOC additional code
```

---

## ✅ TESTING STRATEGY

### Comparison Testing:
```bash
1. Run enhanced Inspector on GTM-N26LKHCP
2. Export results to CSV
3. Compare with GTM Export CSVs (with-access folder)
4. Validate field accuracy:
   ✓ Priority matches
   ✓ Consent matches
   ✓ Folder assignments match
   ✓ Usage counts match
   ✓ Exception conditions match
```

### Edge Cases to Test:
```
✓ Tags with no priority set (default = 0)
✓ Tags with multiple blocking triggers
✓ Triggers with complex exception logic (multiple unless)
✓ Variables with no default value
✓ Variables with complex JavaScript
✓ Entities not assigned to folders
✓ Unused tags/triggers/variables
✓ Circular variable dependencies (macro → macro → macro)
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Starting:
- [ ] Review DATA_GAP_ANALYSIS.md in detail
- [ ] Prioritize which fields to implement first
- [ ] Set up test container with known values
- [ ] Backup current working code

### During Development:
- [ ] Implement Phase 1 fields (priority, consent, etc.)
- [ ] Test with GTM-N26LKHCP comparison data
- [ ] Verify accuracy against GTM export CSV
- [ ] Deploy Phase 1 via clasp push
- [ ] Get user feedback

### After Completion:
- [ ] Update documentation
- [ ] Create user guide for new features
- [ ] Update Health Analyzer to use new fields
- [ ] Performance test with large containers (1000+ tags)

---

## 📞 QUESTIONS TO RESOLVE

1. **Folder Mapping:** Where exactly are folder definitions stored in the published container?
   - Check entities array
   - Check blob metadata
   - May need to reverse engineer from tag parentFolderId references

2. **Blocking Triggers:** Are these in the published JS or export-only?
   - Check GTM export JSON structure
   - Look for blockingTriggerId references
   - May need to extract from runtime configuration

3. **Paused Status:** Is this published or workspace-only?
   - Test by pausing a tag in GTM
   - Re-fetch published container
   - Check if paused flag appears in raw data

4. **Built-In Variables:** Confirmed NOT in published JS
   - This is workspace configuration only
   - Cannot be extracted without API access

---

**READY TO START IMPLEMENTATION?**

Recommend starting with **Phase 1: Quick Wins** to get immediate value:
1. Tag priority extraction (5 min)
2. Consent parsing (10 min)
3. Firing option parsing (5 min)
4. Default value extraction (5 min)

**Total time: ~30 minutes for 4 high-value fields!**
