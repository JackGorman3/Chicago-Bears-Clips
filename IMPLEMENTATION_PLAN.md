# Chicago Bears Media Clips - Implementation Plan

## Project Overview

Automate the creation of daily Chicago Bears news aggregation documents. Users visit a web interface, search for articles published in the last 24 hours, select articles to include, and generate a styled DOCX report that matches the official template.

**Key Constraint**: Must work entirely on GitHub Pages (static hosting) - no backend server.

**Solution**: Use GitHub Actions for scraping + static frontend + client-side DOCX generation.

---

## Architecture

```
GitHub Actions (scheduled daily)
    ├── Scrape articles from configured sites
    ├── Clean & structure article data
    └── Output articles.json to repo

GitHub Pages (static site)
    ├── HTML/CSS/JS frontend
    ├── Fetch articles.json
    ├── User selects articles
    └── Client-side DOCX generation
```

---

## Tech Stack Recommendation

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Frontend** | Vanilla JavaScript (or React) | Lightweight, no backend required, runs entirely in browser |
| **Build Tool** | Vite or Webpack | Handle bundling for GitHub Pages |
| **Scraping** | Node.js + Cheerio | Lightweight HTML parsing in GitHub Actions |
| **DOCX Generation** | `docx` npm library | Pure JavaScript, client-side generation, no server needed |
| **Data Storage** | JSON file in repo | Simple, version controlled, no external DB needed |
| **Hosting** | GitHub Pages | Free, already in your repo |

---

## Implementation Phases

### Phase 1: Project Setup
- [ ] Initialize GitHub Pages on branch `gh-pages`
- [ ] Create project folder structure
- [ ] Set up package.json with dependencies
- [ ] Configure GitHub Actions workflow file
- [ ] Create `sites.txt` with list of news sources to scrape

**Dependencies to add:**
```json
{
  "devDependencies": {
    "vite": "^latest",
    "cheerio": "^latest"
  },
  "dependencies": {
    "docx": "^latest"
  }
}
```

### Phase 2: Web Scraping (GitHub Actions)

Create `.github/workflows/scrape-articles.yml`:
- [ ] Trigger: Daily at 6 AM UTC
- [ ] Scrape articles from sites listed in `sites.txt` (published in last 24 hours)
- [ ] Extract for each article:
  - Title
  - Author
  - Publication source
  - Full article text
  - Publication date/time
  - Source URL
- [ ] Clean/sanitize HTML (remove ads, scripts, extra formatting)
- [ ] Output to `public/data/articles.json`
- [ ] Commit and push to repo

**Note**: You'll need to decide on news sources and write site-specific scrapers (each site has different HTML structure). For now, plan for 3-5 major sources (e.g., ESPN, Tribune, Bears official site).

### Phase 3: Frontend - Landing Page

Create `public/index.html` and styling:
- [ ] Header with "Chicago Bears Media Clips" branding
- [ ] Search button
- [ ] Keyword input field
  - Mutable list of keywords
  - "Chicago Bears" as default keyword
  - Add/remove keywords dynamically
- [ ] "Search" button that filters articles
- [ ] Reference styling from https://www.chicagobears.com

### Phase 4: Frontend - Article Selection

After user clicks "Search":
- [ ] Display articles filtered by keywords
- [ ] For each article show:
  - Title (prominent)
  - Author
  - Publication source
  - First sentence(s) containing a keyword (in secondary text)
- [ ] Checkboxes for each article
- [ ] "Select All" / "Deselect All" buttons
- [ ] Count selected articles

### Phase 5: DOCX Generation

Once user has selected articles:
- [ ] "Generate" button appears (only if ≥1 article selected)
- [ ] Clicking "Generate":
  - Creates DOCX matching the template styling
  - Title page with dynamic date
  - Each article on separate page(s)
  - Two-column layout for article text
  - RED publication headers and page numbers
  - Courier New 10pt body text
  - Uses Chicago Bears logo image
- [ ] "Preview" view (can scroll through generated document)
- [ ] "Download as DOCX" button

### Phase 6: DOCX Library Integration

Using the `docx` library:
- [ ] Create title page section
  - "CHICAGO BEARS MEDIA CLIPS" (serif, bold, 36-40pt, centered)
  - Current date (serif, 28-32pt, RED, centered)
  - Chicago Bears logo image (positioned and sized correctly)
- [ ] Create article sections
  - Publication header (serif, 8-10pt, RED, italic, right-aligned)
  - Article title (serif, 18-22pt, bold)
  - Byline (serif, 10-11pt, "BY AUTHOR, SOURCE")
  - Page number (serif, 9-10pt, RED, right-aligned, "Page X of Y")
  - Body text (Courier New, 10pt, two-column layout)
  - Page breaks between articles
- [ ] Implement proper pagination and page numbering
- [ ] Handle long articles (multiple pages)

### Phase 7: Styling & Polish

- [ ] Implement Bears color scheme on website
  - Navy blue (#00205B) and orange (#FF6600) accents
  - Professional typography
- [ ] Responsive design (mobile-friendly)
- [ ] Loading states
- [ ] Error handling (failed scrapes, no articles found)
- [ ] User feedback/notifications

### Phase 8: Testing & Refinement

- [ ] Test with sample articles manually
- [ ] Verify DOCX output matches template exactly
  - Font sizes and families
  - RED color in correct places
  - Logo placement and size
  - Page layout and spacing
  - Two-column layout
- [ ] Test on different browsers
- [ ] Test GitHub Actions workflow
- [ ] Performance testing (load time for articles.json)

---

## Key Files to Create

```
chicago-bears-clips/
├── .github/
│   └── workflows/
│       └── scrape-articles.yml
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── data/
│   │   └── articles.json (generated by GitHub Actions)
│   └── images/
│       └── bears-logo.png
├── src/
│   ├── scraper.js (Node.js script for GitHub Actions)
│   └── docx-generator.js (DOCX creation logic)
├── package.json
├── vite.config.js
└── sites.txt
```

---

## GitHub Actions Workflow Overview

```yaml
name: Scrape Bears Articles
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node src/scraper.js
      - run: git add public/data/articles.json
      - run: git commit -m "Daily article scrape"
      - run: git push
```

---

## DOCX Generation Flow

```javascript
// Pseudocode for DOCX generation
const doc = new Document({
  sections: [
    // Title Page
    {
      children: [
        new Paragraph({ text: "CHICAGO BEARS MEDIA CLIPS", ... }),
        new Paragraph({ text: currentDate, color: "FF0000", ... }),
        new Image({ ... }) // Bears logo
      ]
    },
    // Article Pages (for each selected article)
    {
      children: [
        new Paragraph({ text: publication, color: "FF0000", ... }),
        new Paragraph({ text: title, ... }),
        new Paragraph({ text: byline, ... }),
        new Table({ columns: 2, content: articleText }) // Two columns
      ]
    }
  ]
});

Packer.toBlob(doc).then(blob => {
  download(blob, "Chicago-Bears-Clips.docx");
});
```

---

## Site Configuration (sites.txt)

Format example:
```
name: ESPN Bears
url: https://www.espn.com/nfl/team/chicago-bears
selector: article-body
cheerio-pattern: a.article-link

name: Chicago Bears Official
url: https://www.chicagobears.com/news
selector: .article-item
cheerio-pattern: .headline

name: Chicago Tribune
url: https://www.chicagotribune.com/sports/bears
selector: article
cheerio-pattern: h2
```

Each site may need custom scraping logic due to different HTML structures.

---

## Data Format (articles.json)

```json
{
  "lastUpdated": "2026-02-17T06:00:00Z",
  "articles": [
    {
      "id": "unique-id-1",
      "title": "Bears 2025 position review: Defensive line",
      "author": "Casey Hanular",
      "source": "chicagobears.com",
      "sourceUrl": "https://chicagobears.com/article-url",
      "publishedAt": "2026-02-17T10:30:00Z",
      "excerpt": "While the Bears defensive line dealt with myriad injuries throughout the season...",
      "content": "Full article text here...",
      "scrapedAt": "2026-02-17T06:15:00Z"
    }
  ]
}
```

---

## Implementation Order

1. **Start with Phase 1-3**: Get basic frontend and GitHub Pages setup
2. **Then Phase 4**: Article selection UI
3. **Then Phase 5-6**: DOCX generation (core feature)
4. **Then Phase 2**: Set up GitHub Actions scraping once frontend is ready
5. **Finally Phase 7-8**: Polish and test

---

## Known Challenges

1. **Web Scraping is fragile**: Each news site has different HTML structure. You'll need to monitor for site changes.
2. **Paywalled content**: Some sources may require authentication or won't allow scraping.
3. **Two-column layout in DOCX**: The `docx` library has limitations for perfect column layouts. May need workarounds.
4. **Page numbering**: Implementing "Page X of Y" requires careful planning with the `docx` library.
5. **GitHub Actions quotas**: Ensure scheduled jobs don't exceed GitHub Actions quotas (11,000 minutes/month for public repos).

---

## Next Steps

1. Confirm the news sources you want to scrape (update `sites.txt`)
2. Start with Phase 1: Basic project setup
3. Create HTML mockup for the landing page
4. Build out the article scraping logic
5. Integrate DOCX generation library
6. Test with sample data before setting up GitHub Actions

---

## Progress Tracking

As you complete phases, update this plan with what's been done. This helps fresh context models understand where to pick up.

**Completed:**
- [ ] Phase 1: Project Setup
- [ ] Phase 2: Web Scraping
- [ ] Phase 3: Landing Page
- [ ] Phase 4: Article Selection
- [ ] Phase 5: DOCX Generation
- [ ] Phase 6: DOCX Library Integration
- [ ] Phase 7: Styling & Polish
- [ ] Phase 8: Testing & Refinement
