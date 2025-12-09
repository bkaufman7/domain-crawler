# GTM Inspector - Quick Reference

## 🎯 What It Does

Inspects **live published** GTM containers using only the container ID. No GTM UI access required.

## 🚀 How to Use

### First Time Setup
1. Open your Google Sheet
2. Menu: **GTM Inspector → Setup GTM Sheets**
3. Go to **GTM_CONFIG** sheet
4. Enter container ID in cell A2 (e.g., `GTM-XXXXXXX`)

### Run Inspection
1. Menu: **GTM Inspector → Inspect Container**
2. Wait 30-60 seconds
3. Check these sheets:
   - **GTM_Tags** - All tags with types and vendors
   - **GTM_Triggers** - Trigger conditions
   - **GTM_Variables** - Variable configurations
   - **GTM_Vendors** - Detected vendor IDs (GA4, Ads, Meta, etc.)

## 📊 What You Get

### Tags
- Tag names and types (GA4 Event, UA, Floodlight, Custom HTML, etc.)
- Vendor identification (Google Analytics, Google Ads, Meta, TikTok)
- Associated triggers
- Raw JSON config

### Triggers
- Trigger names and types (Page View, Click, Custom Event)
- Readable condition summaries
- Raw JSON config

### Variables
- Variable names and types (Data Layer, URL, Constant, Custom JS)
- Configuration details
- Raw JSON config

### Vendors (Auto-Detected)
- ✅ GA4 Measurement IDs (`G-XXXXXXX`)
- ✅ UA Property IDs (`UA-XXXXXXX-X`)
- ✅ Google Ads Conversion IDs (`AW-XXXXXXX`)
- ✅ Floodlight Advertiser IDs (`DC-XXXXXXX`)
- ✅ Meta Pixel IDs
- ✅ TikTok Pixel IDs
- ✅ LinkedIn Partner IDs
- ✅ Pinterest Tag IDs

## 🔧 Menu Options

| Menu Item | What It Does |
|-----------|--------------|
| Setup GTM Sheets | Creates all required sheets (safe to run multiple times) |
| Inspect Container | Main function - fetches and parses container |
| Clear Output Sheets | Clears output data (keeps config and README) |
| Show README | Opens detailed documentation |

## ⚠️ Important Notes

### What It CAN Do
- ✅ Inspect **live published** containers
- ✅ Extract tags, triggers, variables
- ✅ Detect vendor IDs automatically
- ✅ Work without GTM UI access

### What It CANNOT Do
- ❌ Access unpublished changes
- ❌ See GTM workspace or versions
- ❌ Determine tag active/paused status
- ❌ Access GTM Server-Side containers

## 🐛 Troubleshooting

### "Failed to fetch GTM container"
- ✅ Check container ID (must start with `GTM-`)
- ✅ Ensure container is **published** (not just preview)
- ✅ Verify no typos in GTM_CONFIG

### Empty Output Sheets
- ✅ Container might be new/empty
- ✅ Check Execution log (Extensions → Apps Script)
- ✅ Try "Clear Output Sheets" and re-run

### Missing Vendor IDs
- ✅ Check `raw` column in GTM_Tags
- ✅ Some custom implementations may not match regex
- ✅ Complex Custom HTML may need manual review

## 📋 Common Workflows

### Client Audit
```
1. Get container ID from client
2. Enter in GTM_CONFIG!A2
3. Inspect Container
4. Review GTM_Vendors for tracking inventory
5. Export sheets for documentation
```

### Pre-Migration Check
```
1. Inspect current container
2. Filter GTM_Tags for type = "Universal Analytics"
3. Check GTM_Vendors for UA-* IDs
4. Document for GA4 migration plan
```

### Staging vs. Production Compare
```
1. Inspect staging container
2. Copy sheets to separate tabs
3. Update GTM_CONFIG to production ID
4. Re-inspect
5. Compare differences
```

## 🔗 Full Documentation

See **[GTM_INSPECTOR_README.md](GTM_INSPECTOR_README.md)** for:
- Complete technical details
- Advanced usage examples
- Custom vendor pattern addition
- Batch processing scripts
- Architecture explanation

## 📦 File Locations

- **Code**: `src/GtmInspector.js` (1,053 lines)
- **Menu Integration**: `src/Menu.js` (onOpen function)
- **Apps Script**: https://script.google.com/u/0/home/projects/1yX6f6IhmTQJCwpCrVKpslTZ8kL4sL0IHYttnnUsnR2y18isSxLS3Fqcs/edit
- **GitHub**: https://github.com/bkaufman7/domain-crawler

---

**Need Help?** Check GTM_README sheet in your Google Sheet or see full docs in GTM_INSPECTOR_README.md
