# Chicago Bears Media Clips - Styling & Document Guide

## Overview
This document describes the exact styling, layout, and formatting requirements for the generated DOCX files. All generated documents must follow this style guide to match the template.

---

## Title Page (Page 1)

### Layout
- **Centered content** with significant vertical spacing
- White/light gray background
- Professional, clean appearance

### Elements (in order)

1. **Main Title**
   - Text: "CHICAGO BEARS MEDIA CLIPS"
   - Font: Serif (appears to be Times New Roman or similar)
   - Size: ~36-40pt
   - Weight: Bold
   - Alignment: Center
   - Color: Black
   - Spacing: Large top and bottom margins

2. **Date Section**
   - Text: formatted as "DAY OF WEEK, MONTH DATEth"
   - Example: "TUESDAY, FEBRUARY 17th"
   - Font: Serif (same as title)
   - Size: ~28-32pt
   - Weight: Normal
   - Alignment: Center
   - Color: **RED** (#FF0000 or similar bright red)
   - Spacing: Below title with medium spacing

3. **Logo/Image**
   - Chicago Bears logo (bear head)
   - Colors: Orange (#FF6600 or similar) and Navy Blue (#00205B or similar)
   - Size: Approximately 250-300px in width
   - Position: Centered below date
   - Spacing: Significant vertical spacing around the image

### Spacing
- Top margin: ~1.5-2 inches
- Bottom margin: ~1.5-2 inches
- The entire page should feel balanced with the logo prominently centered

---

## Content Pages (Pages 2+)

### Header (appears on each content page)

Located at the top-right of the page in **italics** and **small font**:
- Format: `[Publication Source] - [Day of Week], [Month] [Date], [Year]`
- Examples seen:
  - "chicagobears.com - Tuesday, February 17, 2026"
  - "Chicago Sun-Times - Tuesday, February 17, 2026"
  - "Daily Herald - Tuesday, February 17, 2026"
- Font: Serif (Times New Roman or similar)
- Size: 8-10pt
- Weight: Italic
- Color: **RED** (#FF0000)
- Alignment: Right-aligned
- Spacing: Small top margin

### Article Header

1. **Article Title**
   - Font: Courier New
   - Size: ~18-22pt
   - Weight: Bold
   - Color: Black
   - Alignment: Left
   - Spacing: Below the publication header

2. **Byline**
   - Format: "BY [AUTHOR NAME], [PUBLICATION NAME]"
   - Font: Courier New
   - Size: 10-11pt
   - Weight: Normal (NOT bold)
   - Color: Black
   - Alignment: Left
   - Example: "BY CASEY HANULAR, CHICAGOBEARS.COM"
   - Spacing: Small space below title

3. **Page Number**
   - Format: "Page X of Y"
   - Font: Serif
   - Size: 9-10pt
   - Weight: Normal
   - Color: **RED** (#FF0000)
   - Alignment: Right
   - Position: Top-right of page (below publication header if space)
   - Example: "Page 1 of 4"

### Article Body Text

- **Font**: Courier New (explicitly specified in template)
- **Size**: 10pt (explicitly specified in template)
- **Weight**: Normal
- **Color**: Black
- **Alignment**: Left (with justified alignment possible)
- **Line Spacing**: Single or 1.15
- **Layout**: Two-column format (as seen in example)
- **Margins**: Standard (0.5-1 inch on sides)
- **Spacing**: Articles flow naturally; paragraph breaks may be preserved from source

### Article Separation

- Articles appear to be separated by **leaving space** or a **page break**
- Blank pages may separate major sections
- When a new article starts on a page, it begins with the publication header, title, byline, and page number again

---

## Color Scheme

- **Body Text**: Black (#000000)
- **Accent/Metadata Text**: **RED** (#FF0000) - Used for:
  - Title page date
  - Publication headers (top-right)
  - Page numbers (top-right)
- **Background**: White (#FFFFFF)
- **Logo Colors**: 
  - Orange: #FF6600 (approximately)
  - Navy Blue: #00205B (approximately)

---
 Color |
|---------|------|------|--------|-------|-------|
| Title Page - Main | Serif (Times New Roman) | 36-40pt | Bold | - | Black |
| Title Page - Date | Serif | 28-32pt | Normal | - | **RED** |
| Publication Header | Serif | 8-10pt | Normal | Italic | **RED** |
| Article Title | Courier New | 18-22pt | Bold | - | Black |
| Byline | Courier New | 10-11pt | Normal | - | Black |
| Page Number | Serif | 9-10pt | Normal | - | **RED** |
| Body Text | Courier New | 10pt | Normal | - | Black
| Byline | Serif | 10-11pt | Normal | - |
| Page Number | Serif | 9-10pt | Normal | - |
| Body Text | Monospace (Courier New) | 10-11pt | Normal | - |

---

## Page Layout Details

- **Page Size**: Standard Letter (8.5" x 11")
- **Margins**: 
  - Top: 0.75-1 inch (with publication header at top-right)
  - Bottom: 0.75-1 inch
  - Left/Right: 0.75-1 inch
- **Two-Column Layout**: Article text flows in 2-column format on content pages
- **Spacing Between Columns**: ~0.3-0.5 inches

---

## Key Formatting Rules

1. **First Page ALWAYS**: Title page with "CHICAGO BEARS MEDIA CLIPS", date, and logo
2. **Subsequent Pages**: Each article starts with publication header, title, byline, and page number
3. **Body Text**: Always in monospace font (critical for professional appearance)
4. **Date Generation**: The date on the title page must be generated dynamically based on the current date
5. **Consistency**: All articles follow the same header/title/byline format regardless of publication source
6. **Page Numbering**: "Page X of Y" format appears on top-right of each content page

---

## Template Notes

- The template provided has 3 pages: title page + 2 blank pages (for user content)
- The example shows a fully populated 4-page document with multiple articles
- Generated documents should follow the exact same structure and styling
