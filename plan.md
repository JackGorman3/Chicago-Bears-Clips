We want to automate a tedious task: everyday I have to make a write up of all the articles that were published about the Chicago Bears in the last 24 hours at 6 am (so window of 6am-6am). The predominatly includes the titles, author, followed by the entire article. To do this I want to make a gitHub pages website that can help me automate this task.

## Current Progress (as of Feb 17, 2026)

### Completed ✓
- **Phase 1**: Project Setup
  - Created package.json with dependencies (docx library, Vite)
  - Set up vite.config.js for development
  - Created folder structure (public, src, public/data, public/images)
  - Created sample articles.json for testing

- **DOCX Generator Implementation**
  - Built src/docx-generator.js module
  - Title page with centered title, RED date, and logo placeholder
  - Article pages with publication headers (RED, italic, serif)
  - Article titles, bylines in Courier New
  - Page numbers (RED, right-aligned)
  - Two-column layout for article body text
  - Proper date formatting (DAY, MONTH DATEth format)

- **Frontend UI**
  - Created public/index.html with complete UI structure
  - Keyword management system (add/remove keywords)
  - Search functionality
  - Article selection with checkboxes
  - Select All / Deselect All buttons
  - Generate button
  - Created public/style.css with Bears-themed styling (navy blue & orange)
  - Created public/app.js with all interaction logic

### Next Steps
1. Install dependencies (npm install)
2. Test DOCX generation with sample data (npm run dev)
3. Verify output matches template styling exactly
4. Set up GitHub Actions workflow for scraping (pending sites.txt list)
5. Configure GitHub Pages deployment

Use cases
- User should be able to visit landing page and should be prompted with a search button and a mutable list of key words with "Chicago Bears" loaded in as default
    - clicking search button should kick of the search of articles published by all sites included in the list of determined sites (list not added yet)
- Once loaded, the user should be able to check off which articles they want to include in their write up
    - also should include a select all option
    - the view for each site should be the title - author primary with secondary text being the first sentence where once of the denoted key words show up
- Once there is at least one article selected, there should be a 'Generate' button available
    - clicking the generate button should generate a preview of the write up with an option to download as a docx file

Write up information
- I have included a template that we are using as well as an example of a complete write up with the article information.
- It is important that the exact style of the template.
- There is some information in the template that we are going to need to generate, primarily the date

Style: You can reference https://www.chicagobears.com for the general style of the front end

We also have to be able to handle webites up different styles so it may be worth having a bff to handle all the sanitization logic an else but this is up to you.

To prevent context rot I will be reseting the model so please after creating the initial implementation plan, update it with all our progress so a fresh model will be able to pick up where we left off no problem.