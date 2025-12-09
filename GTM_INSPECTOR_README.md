# GTM Container Inspector

A Google Apps Script tool for inspecting live GTM containers without accessing the GTM UI. This tool fetches and parses the public GTM container JavaScript to extract tags, triggers, variables, and vendor information.

## 🎯 Purpose

The GTM Inspector allows you to:
- **Audit live GTM containers** using only the container ID
- **Extract tag configurations** including types, vendors, and trigger associations
- **Analyze triggers** and their firing conditions
- **Catalog variables** and their types
- **Detect vendor IDs** (GA4, UA, Google Ads, Floodlight, Meta, TikTok, LinkedIn, Pinterest)

Perfect for:
- Client audits and discovery
- Container documentation
- Migration planning
- Vendor inventory
- Tag compliance review

## 🚀 Quick Start

### 1. Setup
1. Open your Google Sheet
2. Go to menu: **GTM Inspector → Setup GTM Sheets**
3. This creates: `GTM_CONFIG`, `GTM_README`, and output sheets

### 2. Configure
1. Navigate to the `GTM_CONFIG` sheet
2. In cell `A2`, enter a GTM container ID (e.g., `GTM-XXXXXXX`)
3. The container must be **published** (not just in preview)

### 3. Inspect
1. Go to menu: **GTM Inspector → Inspect Container**
2. Wait 30-60 seconds for the script to run
3. Review results in the output sheets

## 📊 Output Sheets

### GTM_Tags
Extracted tags with:
- Container ID
- Tag ID (internal identifier)
- Tag Name
- Tag Type (GA4 Event, GA4 Config, UA, Floodlight, Custom HTML, etc.)
- Vendor (Google Analytics, Google Ads, Meta, TikTok, etc.)
- Associated Triggers (comma-separated IDs)
- Raw JSON configuration

### GTM_Triggers
Extracted triggers with:
- Container ID
- Trigger ID
- Trigger Name
- Trigger Type (Page View, Custom Event, Click, etc.)
- Conditions Summary (readable filter descriptions)
- Raw JSON configuration

### GTM_Variables
Extracted variables with:
- Container ID
- Variable ID
- Variable Name
- Variable Type (Data Layer Variable, URL, Constant, Custom JavaScript, etc.)
- Details Summary (key configuration info)
- Raw JSON configuration

### GTM_Vendors
Detected vendor IDs using regex patterns:
- Container ID
- Vendor Name (Google Analytics, Google Ads, Floodlight, Meta, TikTok, LinkedIn, Pinterest)
- ID Type (GA4 Measurement ID, UA Property ID, Conversion ID, Pixel ID, etc.)
- ID Value
- Extra notes

## 🔧 Menu Options

### GTM Inspector Menu

**Setup GTM Sheets**
- Creates all required sheets with proper structure
- Safe to run multiple times
- Does not overwrite existing README

**Inspect Container**
- Main function - fetches and parses GTM container
- Populates all output sheets
- Shows summary alert on completion

**Clear Output Sheets**
- Clears: GTM_Tags, GTM_Triggers, GTM_Variables, GTM_Vendors
- Does NOT clear GTM_CONFIG or GTM_README
- Useful before re-running inspection

**Show README**
- Opens the GTM_README sheet
- Contains detailed documentation

## ⚙️ Technical Details

### How It Works

1. **Fetch**: Downloads `https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX`
2. **Extract**: Locates the internal `resource` object using brace-counting parser
3. **Parse**: Extracts `tags`, `predicates`, `rules`, and `macros` arrays
4. **Normalize**: Converts GTM's internal structure to readable format
5. **Scan**: Uses regex patterns to detect vendor IDs (GA4, Ads, Meta, etc.)
6. **Populate**: Writes structured data to output sheets

### Parsing Strategy

GTM's published JavaScript is:
- **Obfuscated** - variable names are minified
- **Structured** - contains a JSON-like resource object
- **Versioned** - structure may change without notice

The parser uses a **best-effort** approach:
- ✅ Graceful degradation if parsing fails
- ✅ Logs warnings for unparsed elements
- ✅ Stores raw JSON for manual review
- ✅ Works with current GTM structure (as of Dec 2025)

### Tag Type Detection

Identifies tags by `function` property and content patterns:

| Pattern | Tag Type |
|---------|----------|
| `gaawe`, `gaawc` | GA4 Event |
| `__googtag` | GA4 Config |
| `__ua` | Universal Analytics |
| `__gclidw` | Google Ads Conversion Linker |
| `awct` | Google Ads Conversion Tracking |
| `flc`, `fls` | Floodlight |
| `__html` | Custom HTML |
| `__img` | Custom Image |

### Vendor Detection Patterns

Regex-based scanning for:

| Vendor | Pattern | Example |
|--------|---------|---------|
| GA4 | `G-[A-Z0-9]{7,12}` | G-XXXXXXXXX |
| UA | `UA-\d{4,10}-\d{1,4}` | UA-12345678-1 |
| Google Ads | `AW-\d{6,12}` | AW-123456789 |
| Floodlight | `DC-\d{6,12}` | DC-12345678 |
| Meta Pixel | `fbq('init','nnnn')` | 123456789012345 |
| TikTok | `ttq.load('xxx')` | 20-char ID |
| LinkedIn | `_linkedin_partner_id` | Partner ID |
| Pinterest | `pintrk('load','xxx')` | Tag ID |

## ⚠️ Limitations

### Access Restrictions
- ❌ Cannot access GTM UI or workspace
- ❌ Cannot read unpublished changes
- ❌ Cannot determine tag pause/active status
- ❌ Cannot see version history
- ✅ **Only inspects LIVE PUBLISHED container**

### Parsing Limitations
- **Best effort** - may not capture all advanced configurations
- **Structure dependent** - GTM updates may break parsing
- **Custom code** - complex Custom HTML may not parse vendor IDs
- **Obfuscation** - some internal IDs may not have readable names

### Quota Limits
- **UrlFetchApp**: 20,000 calls/day (Apps Script standard)
- **Execution time**: 6 minutes max per run
- **Container size**: Very large containers may time out

## 🐛 Troubleshooting

### HTTP Errors (Failed to Fetch)

**Problem**: "Failed to fetch GTM container GTM-XXXXXXX (HTTP 404)"

**Solutions**:
1. Verify container ID is correct (check GTM_CONFIG!A2)
2. Ensure container is **published** (not just in preview)
3. Check for typos (must start with `GTM-`)
4. Confirm container is public (not access-restricted)

### Empty Output Sheets

**Problem**: Inspect runs successfully but sheets are blank

**Possible Causes**:
1. Container is newly created with no tags
2. Parsing failed (check Execution log)
3. GTM structure changed (parser needs update)

**Solutions**:
1. Check `Logger.log()` output in Apps Script
2. Look for warnings like "Could not find resource object"
3. Verify container has tags in GTM UI
4. Try "Clear Output Sheets" and re-run

### Incomplete Data

**Problem**: Some tags are missing or incomplete

**Causes**:
- Advanced tag configurations may not parse correctly
- Custom macros may not match expected patterns
- Trigger conditions may be too complex to summarize

**Solutions**:
- Check the `raw` column for unparsed JSON
- Manually review complex configurations in GTM UI
- Custom HTML tags: check vendor patterns manually

### Vendor Detection Misses

**Problem**: Known vendor IDs not appearing in GTM_Vendors

**Causes**:
- ID is in custom JavaScript not matched by regex
- Non-standard implementation (hardcoded vs. variable)
- Obfuscated vendor code

**Solutions**:
- Search raw GTM JS manually (Extensions → Apps Script → Execution log)
- Check Custom HTML tag raw JSON
- Look for variations (e.g., `window.fbq` vs direct `fbq`)

## 🔄 Workflow Examples

### Audit New Client Container

```
1. Get container ID from client (GTM-XXXXXXX)
2. Enter in GTM_CONFIG!A2
3. Run: GTM Inspector → Inspect Container
4. Review GTM_Vendors for tracking inventory
5. Check GTM_Tags for tag types and counts
6. Export sheets for documentation
```

### Compare Staging vs. Production

```
1. Inspect staging container (GTM-STAGING)
2. Copy output sheets to separate tab
3. Change GTM_CONFIG to production ID
4. Re-run inspection
5. Compare tag counts, vendor IDs, configurations
```

### Pre-Migration Audit

```
1. Inspect current GTM container
2. Document all UA tags (type = "Universal Analytics")
3. Check GTM_Vendors for UA-XXXXXXXX IDs
4. Identify GA4 migration candidates
5. Export for migration planning worksheet
```

## 🔐 Security & Privacy

### Data Access
- **Public data only**: Fetches publicly available GTM JS
- **No authentication**: Does not access GTM API
- **No storage**: Data stays in your Google Sheet
- **No external calls**: Only calls googletagmanager.com

### Sensitive Information
The tool may expose:
- ✅ GA4 Measurement IDs (public in page source)
- ✅ Google Ads Conversion IDs (public in tags)
- ✅ Meta Pixel IDs (public in pixel code)
- ⚠️ Custom data layer keys (may contain PII references)

**Best Practice**: Do not share output sheets externally without reviewing for sensitive configuration details.

## 📈 Advanced Usage

### Batch Processing Multiple Containers

You can modify the script to loop through multiple containers:

```javascript
function inspectMultipleContainers() {
  const containerIds = ['GTM-AAAA', 'GTM-BBBB', 'GTM-CCCC'];
  
  containerIds.forEach(id => {
    // Update config
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName('GTM_CONFIG')
      .getRange('A2').setValue(id);
    
    // Run inspection
    inspectGtmContainer();
    
    // Wait to avoid rate limits
    Utilities.sleep(2000);
  });
}
```

### Custom Vendor Patterns

To add custom vendor detection, modify `analyzeVendorsFromRawJs_()` in `GtmInspector.js`:

```javascript
// Example: Add Hotjar detection
const hjPattern = /hjid:\s*(\d{6,8})/g;
while ((match = hjPattern.exec(rawJs)) !== null) {
  const id = match[1];
  if (!seen.has('hj_' + id)) {
    seen.add('hj_' + id);
    vendors.push({
      containerId: containerId,
      vendor: 'Hotjar',
      type: 'Site ID',
      id: id,
      extra: ''
    });
  }
}
```

### Export to CSV

```javascript
function exportTagsToCSV() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GTM_Tags');
  const data = sheet.getDataRange().getValues();
  const csv = data.map(row => row.join(',')).join('\n');
  
  Logger.log(csv);
  // Or use DriveApp to save to file
}
```

## 🆘 Support

### Resources
- **Apps Script Docs**: https://developers.google.com/apps-script
- **GTM Developer Guide**: https://developers.google.com/tag-manager
- **Execution Logs**: Extensions → Apps Script → Executions

### Common Questions

**Q: Can this access GTM workspaces or versions?**  
A: No, it only reads the live published container JS.

**Q: Will this work with GTM Server-Side containers?**  
A: No, only web containers (GTM-XXXXXXX format).

**Q: Can I schedule automatic inspections?**  
A: Yes, use Apps Script triggers (Edit → Current project's triggers).

**Q: Does this work with AMP containers?**  
A: No, AMP containers use a different structure.

## 📝 Version History

### v1.0.0 (December 8, 2025)
- Initial release
- Tag, trigger, variable extraction
- Vendor detection (8 vendors)
- Best-effort parsing with graceful degradation
- Complete documentation

---

**Built by**: Brian Kaufman - Horizon Media Platform Solutions  
**License**: Internal use - Horizon Media  
**Last Updated**: December 8, 2025
