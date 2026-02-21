import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, BorderStyle, WidthType, Header } from 'docx';

/**
 * Format date as "DAY OF WEEK, MONTH DATEth"
 */
function formatDate(date) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  
  let suffix = 'th';
  if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = 'st';
  if (dayNum === 2 || dayNum === 22) suffix = 'nd';
  if (dayNum === 3 || dayNum === 23) suffix = 'rd';
  
  return `${dayName}, ${monthName} ${dayNum}${suffix}`;
}

/**
 * Return cover date parts: day name, and month + day
 */
function formatCoverDateParts(date) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  return { dayName, monthDay: `${monthName} ${dayNum}` };
}

/**
 * Create title page section
 */
function createTitlePage(date) {
  return [
    new Paragraph({ text: '', spacing: { line: 600 } }),

    new Paragraph({
      children: [
        new TextRun({
          text: 'CHICAGO BEARS',
          font: 'Arial',
          size: 70
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { line: 200 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: 'MEDIA CLIPS',
          font: 'Arial',
          size: 70
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { line: 600 }
    }),

    new Paragraph({ text: '', spacing: { line: 400 } }),

    // Cover date: day on first line, then month + day on next
    (() => {
      const parts = formatCoverDateParts(date);
      return new Paragraph({
        children: [
          new TextRun({ text: parts.dayName, font: 'Arial', size: 50 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { line: 200 }
      });
    })(),
    new Paragraph({
      children: [
        new TextRun({ text: formatCoverDateParts(date).monthDay, font: 'Arial', size: 40 })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { line: 400 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: '[Chicago Bears Logo Here]',
          font: 'Arial',
          size: 22,
          italics: true,
          color: '999999'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 }
    }),

    // single page break to start articles
    new Paragraph({ text: '', pageBreakBefore: true })
  ];
}

/**
 * Create publication header (top right, in RED, italic)
 */
function createPublicationHeader(source, date) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return new Paragraph({
    children: [
      new TextRun({
        text: `${source} - ${formattedDate}`,
        font: 'Times New Roman',
        size: 20,
        color: '000000',
        italics: true
      })
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { line: 200, before: 100 }
  });
}

/**
 * Create article title
 */
function createArticleTitle(title) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        font: 'Courier New',
        size: 40,
        bold: true,
        color: '000000'
      })
    ],
    alignment: AlignmentType.LEFT,
    spacing: { line: 240, after: 100 }
  });
}

/**
 * Create byline
 */
function createByline(author, source) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `BY ${author}, ${source}`,
        font: 'Courier New',
        size: 20,
        color: '000000',
        bold: true
      })
    ],
    alignment: AlignmentType.LEFT,
    spacing: { line: 240, after: 200 }
  });
}

/**
 * Create page number header (Page X of Y, in RED, right-aligned)
 */
function createPageNumber(currentPage, totalPages) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `Page ${currentPage} of ${totalPages}`,
        font: 'Times New Roman',
        size: 20,
        color: '000000'
      })
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { line: 200 }
  });
}

/**
 * Create article body text in two-column layout
 */
function createArticleBody(bodyText) {
  const paragraphs = bodyText.split('\n').filter(p => p.trim());

  return paragraphs.map(para => new Paragraph({
    children: [
      new TextRun({
        text: para.trim(),
        font: 'Courier New',
        size: 20,
        color: '000000'
      })
    ],
    alignment: AlignmentType.LEFT,
    spacing: { line: 240, after: 100 }
  }));
}

/**
 * Generate DOCX document from articles
 */
export async function generateDocx(articles, currentDate = new Date()) {
  const totalPages = articles.length;
  const sections = [];
  
  // Title page section
  sections.push({
    children: createTitlePage(currentDate),
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 }
      }
    }
  });
  
  // Article sections
  articles.forEach((article, index) => {
    const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const pageNum = index + 1;
    
    const articleChildren = [
      createArticleTitle(article.title),
      createByline(article.author, article.source.toUpperCase()),
      new Paragraph({ text: '', spacing: { line: 200, after: 100 } }),
      ...createArticleBody(article.content)
    ];

    sections.push({
      children: articleChildren,
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        },
        column: {
          space: 708,
          count: 2
        }
      },
      headers: {
        default: new Header({
          children: [
            createPublicationHeader(article.source, article.publishedAt),
            createPageNumber(pageNum, totalPages)
          ]
        })
      }
    });
  });
  
  const doc = new Document({
    sections: sections
  });
  
  return doc;
}

/**
 * Generate and download DOCX file
 */
export async function downloadDocx(articles, filename = 'Chicago-Bears-Clips.docx') {
  const doc = await generateDocx(articles);
  const blob = await Packer.toBlob(doc);
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
