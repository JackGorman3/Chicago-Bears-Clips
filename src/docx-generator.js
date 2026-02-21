import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, TabStopType, SectionType } from 'docx';

// ---------------------------------------------------------------------------
// Constants (from template XML)
// ---------------------------------------------------------------------------
const PAGE_MARGIN = 720;       // 0.5" in twips
const TEXT_WIDTH  = 10800;     // 7.5" text area (12240 - 720*2) in twips
const COL_SPACE   = 720;       // 0.5" between columns in twips

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrdinalSuffix(n) {
  if (n === 1 || n === 21 || n === 31) return 'st';
  if (n === 2 || n === 22) return 'nd';
  if (n === 3 || n === 23) return 'rd';
  return 'th';
}

function formatCoverDate(date) {
  const days   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return {
    dayLine:  days[date.getDay()] + ',',
    monthDay: months[date.getMonth()] + ' ' + date.getDate(),
    suffix:   getOrdinalSuffix(date.getDate()),
  };
}

function formatHeaderDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

async function fetchLogoBuffer() {
  try {
    const resp = await fetch('./images/bears-logo.png');
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

const pageSize = { width: 12240, height: 15840 };
const pageMargin = { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, header: PAGE_MARGIN };

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function createTitlePage(date, logoBuffer) {
  const { dayLine, monthDay, suffix } = formatCoverDate(date);

  const children = [
    // Spacer rows above title (template has ~3 blank lines before "CHICAGO BEARS")
    new Paragraph({ text: '', spacing: { after: 0 } }),
    new Paragraph({ text: '', spacing: { after: 0 } }),
    new Paragraph({ text: '', spacing: { after: 0 } }),

    // CHICAGO BEARS — 35pt, centered, black
    new Paragraph({
      children: [new TextRun({ text: 'CHICAGO BEARS', size: 70 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 276 },
    }),

    // MEDIA CLIPS — 35pt, centered, black
    new Paragraph({
      children: [new TextRun({ text: 'MEDIA CLIPS', size: 70 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),

    // Blank spacer
    new Paragraph({ text: '', spacing: { after: 0 } }),

    // TUESDAY, — 35pt, red, centered
    new Paragraph({
      children: [new TextRun({ text: dayLine, size: 70, color: 'FF0000' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 276 },
    }),

    // FEBRUARY 17th — 35pt, red, centered, superscript suffix (same size)
    new Paragraph({
      children: [
        new TextRun({ text: monthDay, size: 70, color: 'FF0000' }),
        new TextRun({ text: suffix,   size: 70, color: 'FF0000', superScript: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
  ];

  // Logo — ~295x292px (from template EMUs: 2807335 x 2780030 at 9525 EMU/px)
  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 295, height: 292 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  return children;
}

// ---------------------------------------------------------------------------
// Article elements
// ---------------------------------------------------------------------------

// Publication header — body paragraph, not a page header
// "SOURCE – Day, Month Date, Year" | Courier New 10pt | italic | red | right-aligned
function createPublicationHeader(source, publishedAt) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${source} \u2013 ${formatHeaderDate(publishedAt)}`,  // en-dash
        font: 'Courier New',
        size: 20,
        italics: true,
        color: 'FF0000',
      }),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 0, line: 240 },
  });
}

// Title — Courier New 20pt | bold
function createTitle(title) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: 'Courier New',
        size: 40,
        bold: true,
      }),
    ],
    alignment: AlignmentType.LEFT,
    spacing: { after: 0, line: 240 },
  });
}

// Byline + page number on same line
// "BY NAME, OUTLET" [right tab] "Page X of X"
// Courier New 10pt | bold | allCaps | page number in red
function createBylineAndPageNumber(author, source, pageNum, totalPages) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `By ${author || 'Staff'}, ${source}`,
        font: 'Courier New',
        size: 20,
        bold: true,
        allCaps: true,
      }),
      new TextRun({ text: '\t' }),
      new TextRun({
        text: `Page ${pageNum} of ${totalPages}`,
        font: 'Courier New',
        size: 20,
        bold: true,
        allCaps: true,
        color: 'FF0000',
      }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
    spacing: { after: 0, line: 240 },
  });
}

// Body paragraphs — Courier New 10pt | justified | line spacing 259
function createBodyParagraphs(content) {
  const paragraphs = (content || '').split('\n').filter(p => p.trim());
  if (paragraphs.length === 0) return [new Paragraph({ text: '' })];

  return paragraphs.map(para =>
    new Paragraph({
      children: [
        new TextRun({
          text: para.trim(),
          font: 'Courier New',
          size: 20,
        }),
      ],
      alignment: AlignmentType.BOTH,
      spacing: { after: 0, line: 259, lineRule: 'auto' },
    })
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateDocx(articles, currentDate = new Date()) {
  const logoBuffer = await fetchLogoBuffer();
  const totalPages = articles.length;

  const sections = [
    // Cover page
    {
      properties: { page: { size: pageSize, margin: pageMargin } },
      children: createTitlePage(currentDate, logoBuffer),
    },
  ];

  articles.forEach((article, index) => {
    const pageNum = index + 1;
    const body = createBodyParagraphs(article.content || article.excerpt || '');

    // Article header section — single column, starts on new page
    sections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pageSize, margin: pageMargin },
      },
      children: [
        createPublicationHeader(article.source, article.publishedAt),
        createTitle(article.title),
        createBylineAndPageNumber(article.author, article.source, pageNum, totalPages),
      ],
    });

    // Article body section — 2 columns, continuous (no page break)
    sections.push({
      properties: {
        type: SectionType.CONTINUOUS,
        column: { count: 2, space: COL_SPACE, equalWidth: true },
        page: { size: pageSize, margin: pageMargin },
      },
      children: body,
    });
  });

  return new Document({ sections });
}

export async function downloadDocx(articles, filename = 'Chicago-Bears-Clips.docx') {
  const doc = await generateDocx(articles);
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
