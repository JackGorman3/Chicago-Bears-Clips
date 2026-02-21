import { Document, Packer, Paragraph, TextRun, AlignmentType, Header, ImageRun, TabStopType } from 'docx';

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
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return {
    dayLine: days[date.getDay()] + ',',
    monthDay: months[date.getMonth()] + ' ' + date.getDate(),
    suffix: getOrdinalSuffix(date.getDate()),
  };
}

function formatHeaderDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr || '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function createTitlePage(date, logoBuffer) {
  const { dayLine, monthDay, suffix } = formatCoverDate(date);
  const FONT = 'Arial';
  const TITLE_PT = 72;  // 36pt in half-points
  const DATE_PT = 72;

  const children = [
    new Paragraph({ text: '', spacing: { before: 1440 } }),

    // CHICAGO BEARS
    new Paragraph({
      children: [new TextRun({ text: 'CHICAGO BEARS', font: FONT, size: TITLE_PT })],
      alignment: AlignmentType.CENTER,
      spacing: { line: 276 },
    }),

    // MEDIA CLIPS
    new Paragraph({
      children: [new TextRun({ text: 'MEDIA CLIPS', font: FONT, size: TITLE_PT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 720 },
    }),

    // TUESDAY,
    new Paragraph({
      children: [new TextRun({ text: dayLine, font: FONT, size: DATE_PT })],
      alignment: AlignmentType.CENTER,
      spacing: { line: 276 },
    }),

    // FEBRUARY 17th  (suffix is superscript)
    new Paragraph({
      children: [
        new TextRun({ text: monthDay, font: FONT, size: DATE_PT }),
        new TextRun({ text: suffix, font: FONT, size: Math.round(DATE_PT * 0.55), superScript: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
    }),
  ];

  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 260, height: 240 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  children.push(new Paragraph({ text: '', pageBreakBefore: true }));
  return children;
}

// ---------------------------------------------------------------------------
// Article pages
// ---------------------------------------------------------------------------

function createPublicationHeader(source, publishedAt) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${source} - ${formatHeaderDate(publishedAt)}`,
        font: 'Courier New',
        size: 18,       // 9pt
        color: 'FF0000',
        italics: true,
      }),
    ],
    alignment: AlignmentType.RIGHT,
  });
}

function createArticleTitle(title) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: 'Courier New',
        size: 36,       // 18pt
        bold: true,
      }),
    ],
    alignment: AlignmentType.LEFT,
    spacing: { after: 80 },
  });
}

// Byline on left, page number on right — same line via tab stop
function createBylineAndPageNumber(author, source, pageNum, totalPages) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `BY ${(author || 'STAFF').toUpperCase()}, ${source.toUpperCase()}`,
        font: 'Courier New',
        size: 20,       // 10pt
        bold: true,
      }),
      new TextRun({ text: '\t' }),
      new TextRun({
        text: `Page ${pageNum} of ${totalPages}`,
        font: 'Courier New',
        size: 20,       // 10pt
        bold: true,
        color: 'FF0000',
      }),
    ],
    tabStops: [
      { type: TabStopType.RIGHT, position: 9360 },
    ],
    spacing: { after: 200 },
  });
}

function createBodyParagraphs(content) {
  const paragraphs = (content || '').split('\n').filter(p => p.trim());
  if (paragraphs.length === 0) return [];

  return paragraphs.map(para =>
    new Paragraph({
      children: [
        new TextRun({
          text: para.trim(),
          font: 'Courier New',
          size: 20,     // 10pt
        }),
      ],
      alignment: AlignmentType.BOTH,  // justified
      spacing: { after: 120 },
    })
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function generateDocx(articles, currentDate = new Date()) {
  const logoBuffer = await fetchLogoBuffer();
  const totalPages = articles.length;

  const sections = [
    {
      children: createTitlePage(currentDate, logoBuffer),
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
    },
  ];

  articles.forEach((article, index) => {
    const pageNum = index + 1;
    const body = createBodyParagraphs(article.content || article.excerpt || '');

    sections.push({
      headers: {
        default: new Header({
          children: [createPublicationHeader(article.source, article.publishedAt)],
        }),
      },
      children: [
        createArticleTitle(article.title),
        createBylineAndPageNumber(article.author, article.source, pageNum, totalPages),
        ...body,
      ],
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
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
