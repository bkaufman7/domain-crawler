# Quick Start Guide
## Site Data Layer Inventory & Glossary

### For New Users - First Time Setup

#### 1. Open Your Google Sheet
- Create a new Google Sheet (one per client)
- The sheet will serve as your data layer inventory workspace

#### 2. Bind the Apps Script
The code has already been deployed to Apps Script project:
- Script ID: `1yX6f6IhmTQJCwpCrVKpslTZ8kL4sL0IHYttnnUsnR2y18isSxLS3Fqcs`
- URL: https://script.google.com/u/0/home/projects/1yX6f6IhmTQJCwpCrVKpslTZ8kL4sL0IHYttnnUsnR2y18isSxLS3Fqcs/edit

**To bind to your sheet:**
1. In your Google Sheet, go to Extensions → Apps Script
2. Delete any existing code
3. Copy all code from the Apps Script project above
4. Save (Ctrl+S or Cmd+S)
5. Refresh your Google Sheet

#### 3. Initial Setup (First Time Only)
1. You should now see a custom menu: **"Site Data Layer Tools"**
2. Click: **Site Data Layer Tools → 1) Setup Sheet Structure**
3. This creates all required tabs with headers

#### 4. Configure Your Project
1. Go to the **DETAILS** tab
2. Fill in these required fields:
   - **Primary Domain**: `https://www.clientsite.com` (your client's domain)
   - **Start URL**: `https://www.clientsite.com/` (where to start crawling)
   - **Max Pages**: `500` (adjust as needed)
   - **Max Depth**: `3` (how many link levels to follow)
   - **Client Name**: Your client's name
   - **Project Owner**: Your name

#### 5. Run the Workflow

##### Step 1: Crawl the Site
- Menu: **Site Data Layer Tools → 2) Run Crawl (Domain/Start URL)**
- This will:
  - Start from your Start URL
  - Follow links within the domain
  - Populate the **PAGES_INVENTORY** tab
  - May take 3-6 minutes per run
  - Can be resumed if it times out (just run again)

##### Step 2: Analyze Data Layers
- Menu: **Site Data Layer Tools → 3) Analyze Data Layers**
- This will:
  - Re-fetch each page's HTML
  - Extract JSON-LD, dataLayer, digitalData, and other patterns
  - Flatten all data structures
  - Populate the **DATALAYER_DICTIONARY** tab
  - May take 3-6 minutes per run

##### Step 3: Classify Templates
- Menu: **Site Data Layer Tools → 4) Refresh Template Suggestions**
- This will:
  - Analyze URL patterns
  - Classify pages as Homepage, PDP, PLP, Cart, Checkout, etc.
  - Populate the **TEMPLATES** tab

##### Step 4: Build Requirements
- Menu: **Site Data Layer Tools → 5) Build Template Requirements**
- This will:
  - Map which data layer keys appear on which templates
  - Identify required vs. optional keys
  - Populate the **TEMPLATE_REQUIREMENTS** tab

##### Step 5: Export Summary
- Menu: **Site Data Layer Tools → 6) Export Summary**
- This creates a formatted summary report
- Useful for stakeholder presentations

#### 6. Manual Review & Refinement
After automation completes, review and refine:

1. **DATALAYER_DICTIONARY**
   - Add business meaning for each key
   - Mark which keys are required
   - Update status (As-is / Needs Cleanup / Deprecated)

2. **TEMPLATE_REQUIREMENTS**
   - Verify required vs. optional classifications
   - Add notes about gaps or risks

3. **Mapping Tabs** (GA4_MAPPING, CM360_MAPPING, DV360_MAPPING)
   - Complete platform-specific mappings
   - Map data layer keys to GA4 parameters
   - Map to Floodlight variables

4. **ISSUES_BACKLOG**
   - Track any data layer implementation issues
   - Assign owners and priorities

---

## Resuming Work on Existing Project

If you're coming back to an existing project:

1. **Continue Crawl** (if not 100% complete):
   - Menu: **Site Data Layer Tools → 2) Run Crawl**
   - It will automatically resume from where it left off

2. **Re-analyze** (if site has changed):
   - Menu: **Site Data Layer Tools → 3) Analyze Data Layers**
   - Will update the dictionary with any new keys

3. **View Progress**:
   - Menu: **Site Data Layer Tools → Advanced → View Crawl Statistics**

---

## Tips & Best Practices

### Performance
- Start with **Max Pages: 100** for initial testing
- Increase to 500-1000 for production analysis
- Each crawl/analysis run takes ~5 minutes before auto-pausing
- The system automatically resumes from last position

### Accuracy
- **Manual template classification** is more accurate than automation
  - Review and adjust template types in PAGES_INVENTORY
  - Automation is 80-90% accurate, especially for e-commerce sites

- **Business meaning** must be added manually
  - The system can't infer business context
  - Add descriptions in DATALAYER_DICTIONARY

### Collaboration
- **One Sheet per Client** - keeps data organized
- **Share with team** - give Editor access to colleagues
- **Version history** - use File → Version History for tracking changes

### Troubleshooting

**"No menu appears"**
- Refresh the sheet (Ctrl+R or Cmd+R)
- Check Extensions → Apps Script - make sure code is saved

**"Crawl not finding pages"**
- Check Primary Domain in DETAILS tab
- Ensure Start URL is accessible (not behind login)
- Try a shorter Max Depth (start with 2)

**"Data layers not detected"**
- This is normal for many sites - they may not have consistent data layers
- Check individual page URLs manually with browser DevTools
- The tool can only detect server-side HTML content (not runtime JavaScript)

**"Execution timeout"**
- This is normal - Apps Script has 6-minute limit per run
- Just run the same menu item again to resume

---

## Development & Updates

### Making Code Changes

If you need to modify the code:

1. **Local Development** (recommended):
   ```bash
   cd "C:\Users\bkaufman\domain crawler"
   
   # Make changes to files in src/
   # Then push to Apps Script:
   clasp push
   ```

2. **Direct in Apps Script**:
   - Edit code in the Apps Script editor
   - Save
   - Pull changes to local:
   ```bash
   clasp pull
   ```

3. **Commit to GitHub**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

### File Structure
```
src/
├── Menu.js                 # Custom menu & UI
├── Config.js              # Configuration reader
├── SheetUtils.js          # Sheet helper functions
├── Crawler.js             # Web crawling logic
├── Parser.js              # HTML/JSON parsing
├── DataLayerAnalyzer.js   # Data layer analysis
├── TemplateInference.js   # Template classification
├── RequirementsBuilder.js # Requirements matrix
└── SummaryExport.js       # Report generation
```

---

## Support & Questions

**Internal Contact:**
- Brian Kaufman - Associate Director, Platform Solutions / Ad Ops
- Horizon Media

**Documentation:**
- Full README: `README.md` in the repo
- GitHub: https://github.com/bkaufman7/domain-crawler

---

**Last Updated:** December 8, 2025
**Version:** 1.0.0
