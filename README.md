# Site Data Layer Inventory & Glossary

**Production-grade Google Apps Script + Sheets solution for automated data layer discovery and documentation.**

## Overview

This project crawls a client's website, discovers data layer implementations, and builds a comprehensive inventory of:
- Page templates and URLs
- Data layer variables and events
- Requirements mapping by template
- Platform-specific mappings (GA4, CM360, DV360/SA360)

## Project Structure

```
domain-crawler/
├── src/
│   ├── Menu.js                    # Custom menu and onOpen()
│   ├── Config.js                  # Read configuration from DETAILS tab
│   ├── SheetUtils.js              # Sheet helper functions
│   ├── Crawler.js                 # Core crawling logic with resume capability
│   ├── Parser.js                  # HTML/JSON parsing and extraction
│   ├── DataLayerAnalyzer.js       # Flatten and catalog data layer keys
│   ├── TemplateInference.js       # Auto-classify page templates
│   ├── RequirementsBuilder.js     # Build template requirements matrix
│   ├── SummaryExport.js           # Export summary reports
│   └── appsscript.json            # Apps Script manifest
├── .clasp.json                    # Clasp configuration
├── .claspignore                   # Files to exclude from push
└── README.md                      # This file
```

## Setup Instructions

### 1. Prerequisites
- Node.js and npm installed
- Clasp installed globally: `npm install -g @google/clasp`
- Google account with access to Apps Script

### 2. Login to Clasp
```bash
clasp login
```

### 3. Clone or Link Project
This project is already configured to push to the Apps Script project:
- Script ID: `1yX6f6IhmTQJCwpCrVKpslTZ8kL4sL0IHYttnnUsnR2y18isSxLS3Fqcs`

### 4. Push Code to Apps Script
```bash
clasp push
```

### 5. Open in Apps Script Editor
```bash
clasp open
```

Or visit directly:
https://script.google.com/u/0/home/projects/1yX6f6IhmTQJCwpCrVKpslTZ8kL4sL0IHYttnnUsnR2y18isSxLS3Fqcs/edit

## Usage Workflow

### Step 1: Initial Setup
1. Open your Google Sheet (one per client)
2. From the menu: **Site Data Layer Tools → 1) Setup Sheet Structure**
3. This creates all required tabs with proper headers

### Step 2: Configure Details
1. Go to the **DETAILS** tab
2. Fill in:
   - Primary Domain (e.g., `https://www.clientsite.com`)
   - Start URL (e.g., `https://www.clientsite.com/`)
   - Max Pages (e.g., `500`)
   - Max Depth (e.g., `3`)

### Step 3: Run Crawl
1. From the menu: **Site Data Layer Tools → 2) Run Crawl (Domain/Start URL)**
2. The crawler will:
   - Start from your Start URL
   - Follow links within the domain
   - Respect Max Pages and Max Depth settings
   - Populate the **PAGES_INVENTORY** tab
   - Can be re-run to resume from where it left off

### Step 4: Analyze Data Layers
1. From the menu: **Site Data Layer Tools → 3) Analyze Data Layers**
2. The analyzer will:
   - Parse HTML from crawled pages
   - Extract JSON-LD, dataLayer, digitalData, and other patterns
   - Flatten nested objects into dot notation
   - Populate the **DATALAYER_DICTIONARY** tab

### Step 5: Refresh Templates
1. From the menu: **Site Data Layer Tools → 4) Refresh Template Suggestions**
2. The system will:
   - Analyze URL patterns
   - Suggest template classifications (PDP, PLP, Checkout, etc.)
   - Populate the **TEMPLATES** tab

### Step 6: Manual Refinement
- Review and adjust template classifications
- Fill in business meaning for data layer keys
- Complete mapping tabs (GA4, CM360, DV360)
- Track issues in **ISSUES_BACKLOG**

## Sheet Structure

The system creates and manages these tabs:

1. **DETAILS** - Configuration and settings
2. **PAGES_INVENTORY** - All crawled URLs with metadata
3. **TEMPLATES** - Page template definitions
4. **DATALAYER_DICTIONARY** - Flattened catalog of all data layer keys
5. **TEMPLATE_REQUIREMENTS** - Required keys/events by template
6. **EVENTS_LOG** - Event catalog and payloads
7. **ISSUES_BACKLOG** - Tracking for data layer issues
8. **GA4_MAPPING** - Google Analytics 4 mappings
9. **CM360_MAPPING** - Campaign Manager 360 mappings
10. **DV360_MAPPING** - Display & Video 360 / SA360 mappings

## Technical Notes

### Apps Script Limitations
- **Execution time**: 6 minutes max per run (crawler auto-resumes)
- **URL Fetch**: 20,000 calls/day
- **No client-side JS execution**: Can only parse server-rendered HTML

### Resume Capability
The crawler uses the `Crawl Status` column in **PAGES_INVENTORY**:
- `Pending` - Not yet fetched
- `Fetched` - Successfully retrieved
- `Error` - Failed to fetch

Re-running the crawl automatically picks up `Pending` pages.

### Data Layer Detection
The system searches for these patterns in HTML:
1. `<script type="application/ld+json">` (JSON-LD structured data)
2. `window.dataLayer = [...]` or `dataLayer.push(...)`
3. `window.digitalData = {...}`
4. `window.__INITIAL_STATE__ = {...}`
5. Other inline config objects

**Note**: Cannot access runtime `window.dataLayer` values - only static HTML content.

## Development

### Making Changes
1. Edit files in `src/` directory
2. Push to Apps Script: `clasp push`
3. Test in your Google Sheet
4. Pull any web editor changes: `clasp pull`

### Version Control
- Main repo: https://github.com/bkaufman7/domain-crawler
- Commit and push changes regularly
- Each client Sheet can use the same bound script or separate copies

## License

Proprietary - Horizon Media internal use only.

## Author

Brian Kaufman  
Associate Director, Platform Solutions / Ad Ops  
Horizon Media

---

**Last Updated**: December 8, 2025
