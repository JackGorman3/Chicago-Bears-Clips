import { generateDocx, downloadDocx } from '../src/docx-generator.js';

// State
let allArticles = [];
let keywords = ['Bears'];
let selectedArticles = new Set();

// DOM Elements
const keywordsList = document.getElementById('keywords-list');
const keywordInput = document.getElementById('keyword-input');
const addKeywordBtn = document.getElementById('add-keyword-btn');
const searchBtn = document.getElementById('search-btn');
const searchSection = document.getElementById('search-section');
const articlesSection = document.getElementById('articles-section');
const articlesList = document.getElementById('articles-list');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const selectionCount = document.getElementById('selection-count');
const generateBtn = document.getElementById('generate-btn');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

/**
 * Render keywords list
 */
function renderKeywords() {
  keywordsList.innerHTML = keywords
    .map(keyword => `
      <div class="keyword-tag">
        ${keyword}
        <button class="keyword-remove" data-keyword="${keyword}">×</button>
      </div>
    `)
    .join('');

  // Add event listeners to remove buttons
  document.querySelectorAll('.keyword-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const keyword = e.target.dataset.keyword;
      keywords = keywords.filter(k => k !== keyword);
      renderKeywords();
    });
  });
}

/**
 * Add keyword
 */
function addKeyword() {
  const keyword = keywordInput.value.trim();
  if (keyword && !keywords.includes(keyword)) {
    keywords.push(keyword);
    keywordInput.value = '';
    renderKeywords();
  }
}

/**
 * Load articles from JSON
 */
async function loadArticles() {
  try {
    loadingDiv.style.display = 'block';
    const response = await fetch('./data/articles.json');
    if (!response.ok) throw new Error('Failed to load articles');
    const data = await response.json();
    allArticles = data.articles;
    loadingDiv.style.display = 'none';
    console.log(`Loaded ${allArticles.length} articles`);
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Error loading articles:', error);
    showMessage('Error loading articles: ' + error.message, 'error');
  }
}

/**
 * Filter articles by keywords
 */
function filterArticles() {
  if (keywords.length === 0) {
    showMessage('Please add at least one keyword', 'info');
    return [];
  }

  console.log(`Filtering with keywords: ${keywords.join(', ')}`);
  console.log(`Total articles to search: ${allArticles.length}`);

  return allArticles.filter(article => {
    const content = (article.content || '').trim();
    const excerpt = (article.excerpt || '').trim();
    const hasFullContent = content && content !== excerpt;
    if (!hasFullContent) return false;

    const searchText = (article.title + ' ' + excerpt + ' ' + content).toLowerCase();
    const matches = keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    if (matches) console.log(`✓ Match: ${article.title}`);
    return matches;
  });
}

/**
 * Render articles for selection
 */
function renderArticles(articles) {
  if (articles.length === 0) {
    articlesList.innerHTML = '<p style="text-align: center; color: #999;">No articles found matching your keywords.</p>';
    return;
  }

  articlesList.innerHTML = articles
    .map(article => {
      const isSelected = selectedArticles.has(article.id);
      return `
        <div class="article-item">
          <input
            type="checkbox"
            class="article-checkbox"
            data-article-id="${article.id}"
            ${isSelected ? 'checked' : ''}
          >
          <div class="article-content">
            <div class="article-title">${article.title}</div>
            <div class="article-meta">
              <span class="article-author">By ${article.author}</span>
              <span class="article-source">${article.source}</span>
            </div>
            <div class="article-excerpt">${article.excerpt}</div>
          </div>
        </div>
      `;
    })
    .join('');

  // Add event listeners to checkboxes
  document.querySelectorAll('.article-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const articleId = e.target.dataset.articleId;
      if (e.target.checked) {
        selectedArticles.add(articleId);
      } else {
        selectedArticles.delete(articleId);
      }
      updateSelectionCount();
    });
  });
}

/**
 * Update selection count
 */
function updateSelectionCount() {
  const count = selectedArticles.size;
  selectionCount.textContent = `${count} selected`;
  generateBtn.disabled = count === 0;
}

/**
 * Handle search
 */
async function handleSearch() {
  const filteredArticles = filterArticles();
  console.log(`Filtered to ${filteredArticles.length} articles`);
  
  if (filteredArticles.length === 0) {
    showMessage('No articles found matching your keywords', 'info');
    articlesSection.style.display = 'none';
    return;
  }

  selectedArticles.clear();
  renderArticles(filteredArticles);
  articlesSection.style.display = 'block';
  updateSelectionCount();
  messageDiv.style.display = 'none';
  
  // Scroll to articles section
  articlesSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Select all articles
 */
function selectAllArticles() {
  const filteredArticles = filterArticles();
  filteredArticles.forEach(article => selectedArticles.add(article.id));
  
  document.querySelectorAll('.article-checkbox').forEach(checkbox => {
    checkbox.checked = true;
  });
  
  updateSelectionCount();
}

/**
 * Deselect all articles
 */
function deselectAllArticles() {
  selectedArticles.clear();
  document.querySelectorAll('.article-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  updateSelectionCount();
}

/**
 * Handle generate
 */
async function handleGenerate() {
  if (selectedArticles.size === 0) {
    showMessage('Please select at least one article', 'error');
    return;
  }

  try {
    generateBtn.disabled = true;
    showMessage('Generating document...', 'info');

    // Get selected articles
    const articlesToInclude = allArticles.filter(article =>
      selectedArticles.has(article.id)
    );

    // Generate and download
    await downloadDocx(articlesToInclude);

    showMessage('Document generated and downloaded successfully!', 'success');
  } catch (error) {
    showMessage('Error generating document: ' + error.message, 'error');
  } finally {
    generateBtn.disabled = selectedArticles.size === 0;
  }
}

/**
 * Show message
 */
function showMessage(text, type = 'info') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';

  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Event listeners
 */
addKeywordBtn.addEventListener('click', addKeyword);
keywordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addKeyword();
});
searchBtn.addEventListener('click', handleSearch);
selectAllBtn.addEventListener('click', selectAllArticles);
deselectAllBtn.addEventListener('click', deselectAllArticles);
generateBtn.addEventListener('click', handleGenerate);

/**
 * Initialize app
 */
async function init() {
  renderKeywords();
  await loadArticles();
}

// Start the app
init();
