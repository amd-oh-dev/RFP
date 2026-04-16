# RFP Finder — Netlify Version

Deploy to Netlify in ~5 minutes. No server required.

## How it works

Each data source runs as a **Netlify Serverless Function**:
- `/netlify/functions/scrape-sam` → SAM.gov federal API
- `/netlify/functions/scrape-bidnet` → BidNet Direct (10 states)
- `/netlify/functions/scrape-demandstar` → DemandStar API
- `/netlify/functions/scrape-states` → OH, TX, CA, FL, NY state portals

The browser calls all 4 functions in parallel on page load. Results stream in as each source finishes. All filtering/searching happens client-side in the browser — no database needed.

---

## Deploy to Netlify (3 steps)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "rfp finder netlify"
git remote add origin https://github.com/YOURUSERNAME/rfp-finder-netlify.git
git push -u origin main
```

### Step 2 — Connect to Netlify
1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub → select your repo
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy site**

### Step 3 — Done
Netlify gives you a live URL instantly:
`https://your-site-name.netlify.app`

---

## Optional: SAM.gov API Key (increases rate limits)

1. Register free at https://open.gsa.gov/api/get-opportunities-public-api/
2. In Netlify dashboard: **Site settings → Environment variables**
3. Add: `SAM_API_KEY` = your key

---

## Local Development

```bash
npm install -g netlify-cli
npm install
netlify dev
```

Opens at `http://localhost:8888` with all functions running locally.

---

## Folder Structure

```
rfp-finder-netlify/
├── netlify.toml              # Netlify config (routing, functions dir)
├── package.json
├── public/
│   └── index.html            # Frontend (served as static site)
└── netlify/
    └── functions/
        ├── scrape-sam.js     # SAM.gov federal API
        ├── scrape-bidnet.js  # BidNet Direct scraper
        ├── scrape-demandstar.js
        └── scrape-states.js  # OH, TX, CA, FL, NY portals
```

---

## Notes

- Netlify Functions have a **10-second timeout** on the free plan. Each function scrapes one source independently to stay within limits.
- Data is **not cached between visitors** — each page load re-fetches live. For high traffic, consider adding a CDN cache layer or upgrading to Netlify's background functions.
- If a scraper returns 0 results, that source's dot turns red in the sidebar — other sources still work fine.
