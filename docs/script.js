/**
 * LocatePro Documentation - Interactive Script
 * Enhanced with full-text search, collapsible nav, and API tabs
 */

(function() {
  'use strict';

  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const themeToggle = document.getElementById('themeToggle');
  const searchInput = document.getElementById('searchInput');
  const navLinks = document.querySelectorAll('.nav-link');
  const docSections = document.querySelectorAll('.doc-section');
  const breadcrumb = document.getElementById('breadcrumb');
  const tocNav = document.getElementById('tocNav');
  const content = document.getElementById('content');

  // State
  let currentSection = 'overview';
  let searchIndex = [];
  let searchModal = null;
  let selectedSearchIndex = 0;

  // Initialize
  function init() {
    loadTheme();
    buildSearchIndex();
    createSearchModal();
    setupEventListeners();
    setupApiTabs();
    handleHashChange();
    updateTableOfContents();
    highlightCode();
    setupCollapsibleNav();
  }

  // Build search index from content
  function buildSearchIndex() {
    searchIndex = [];
    docSections.forEach(section => {
      const sectionId = section.id;
      const sectionName = getSectionName(sectionId);
      
      // Index headings
      section.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
        searchIndex.push({
          section: sectionId,
          sectionName: sectionName,
          type: 'heading',
          title: heading.textContent,
          content: heading.textContent,
          element: heading
        });
      });
      
      // Index paragraphs
      section.querySelectorAll('p').forEach(para => {
        const text = para.textContent.trim();
        if (text.length > 20) {
          searchIndex.push({
            section: sectionId,
            sectionName: sectionName,
            type: 'content',
            title: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
            content: text,
            element: para
          });
        }
      });
      
      // Index code blocks for API endpoints
      section.querySelectorAll('.api-endpoint code').forEach(code => {
        searchIndex.push({
          section: sectionId,
          sectionName: sectionName,
          type: 'endpoint',
          title: code.textContent,
          content: code.textContent,
          element: code.closest('.api-endpoint') || code
        });
      });
      
      // Index table cells
      section.querySelectorAll('table td:first-child').forEach(cell => {
        const text = cell.textContent.trim();
        if (text) {
          searchIndex.push({
            section: sectionId,
            sectionName: sectionName,
            type: 'table',
            title: text,
            content: cell.closest('tr')?.textContent || text,
            element: cell.closest('tr') || cell
          });
        }
      });
    });
  }

  // Create search modal
  function createSearchModal() {
    searchModal = document.createElement('div');
    searchModal.className = 'search-results-overlay';
    searchModal.innerHTML = `
      <div class="search-results-modal">
        <div class="search-results-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
          <input type="text" id="globalSearchInput" placeholder="Search documentation..." autocomplete="off">
          <span class="search-shortcut">ESC</span>
        </div>
        <div class="search-results-list" id="searchResultsList"></div>
      </div>
    `;
    document.body.appendChild(searchModal);
    
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        closeSearchModal();
      }
    });
  }

  // Open search modal
  function openSearchModal() {
    searchModal.classList.add('active');
    const globalInput = document.getElementById('globalSearchInput');
    globalInput.value = searchInput.value;
    globalInput.focus();
    selectedSearchIndex = 0;
    performGlobalSearch(globalInput.value);
  }

  // Close search modal
  function closeSearchModal() {
    searchModal.classList.remove('active');
    searchInput.value = '';
    document.getElementById('globalSearchInput').value = '';
    handleSearch(''); // Reset nav filtering
  }

  // Perform global search
  function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('searchResultsList');
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      resultsContainer.innerHTML = '<div class="search-no-results">Type to search...</div>';
      return;
    }
    
    const results = searchIndex.filter(item => 
      item.content.toLowerCase().includes(normalizedQuery) ||
      item.title.toLowerCase().includes(normalizedQuery)
    ).slice(0, 20);
    
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }
    
    resultsContainer.innerHTML = results.map((result, index) => {
      const snippet = highlightMatch(result.content, normalizedQuery);
      return `
        <a href="#" class="search-result-item ${index === 0 ? 'selected' : ''}" data-section="${result.section}" data-index="${index}">
          <div class="search-result-section">${result.sectionName}</div>
          <div class="search-result-title">${result.title}</div>
          <div class="search-result-snippet">${snippet}</div>
        </a>
      `;
    }).join('');
    
    selectedSearchIndex = 0;
  }

  // Highlight matching text
  function highlightMatch(text, query) {
    const maxLength = 120;
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);
    
    if (index === -1) return text.substring(0, maxLength) + '...';
    
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + query.length + 40);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    // Escape HTML and highlight
    snippet = snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return snippet.replace(regex, '<mark>$1</mark>');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Setup collapsible navigation
  function setupCollapsibleNav() {
    document.querySelectorAll('.nav-title').forEach(title => {
      // Add chevron icon
      const icon = document.createElement('span');
      icon.className = 'nav-title-icon';
      icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2.5l3.5 3.5-3.5 3.5"/></svg>`;
      title.appendChild(icon);
      
      title.addEventListener('click', () => {
        const section = title.closest('.nav-section');
        section.classList.toggle('collapsed');
        localStorage.setItem(`nav-collapsed-${section.querySelector('.nav-title').textContent.trim()}`, section.classList.contains('collapsed'));
      });
      
      // Restore collapsed state
      const sectionName = title.textContent.trim();
      if (localStorage.getItem(`nav-collapsed-${sectionName}`) === 'true') {
        title.closest('.nav-section').classList.add('collapsed');
      }
    });
  }

  // Setup API tabs
  function setupApiTabs() {
    document.querySelectorAll('.api-tabs').forEach(tabContainer => {
      const tabs = tabContainer.querySelectorAll('.api-tab');
      const contents = tabContainer.parentElement.querySelectorAll('.api-tab-content');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          contents.forEach(c => c.classList.remove('active'));
          
          tab.classList.add('active');
          const targetId = tab.getAttribute('data-tab');
          document.getElementById(targetId)?.classList.add('active');
        });
      });
    });
  }

  // Syntax Highlighting
  function highlightCode() {
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }

  // Theme Management
  function loadTheme() {
    const savedTheme = localStorage.getItem('docs-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('docs-theme', newTheme);
  }

  // Navigation
  function navigateToSection(sectionId) {
    // Hide all sections
    docSections.forEach(section => {
      section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add('active');
      currentSection = sectionId;
    }

    // Update nav links
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === sectionId) {
        link.classList.add('active');
        // Expand parent section if collapsed
        const navSection = link.closest('.nav-section');
        if (navSection?.classList.contains('collapsed')) {
          navSection.classList.remove('collapsed');
        }
      }
    });

    // Update breadcrumb
    updateBreadcrumb(sectionId);

    // Update table of contents
    updateTableOfContents();

    // Update URL hash
    history.pushState(null, '', `#${sectionId}`);

    // Close mobile menu
    closeMobileMenu();

    // Scroll to top of content
    content.scrollTop = 0;
    window.scrollTo(0, 0);

    // Re-highlight code in new section
    setTimeout(highlightCode, 50);
  }

  function getSectionName(sectionId) {
    const sectionNames = {
      'overview': 'Overview',
      'architecture': 'Architecture',
      'setup': 'Installation & Setup',
      'components': 'Components',
      'pages': 'Pages & Routing',
      'state': 'State Management',
      'hooks': 'Custom Hooks',
      'styling': 'Styling',
      'database': 'Database Schema',
      'authentication': 'Authentication',
      'api': 'API Reference',
      'payments': 'Payments & Subscriptions',
      'storage': 'Storage',
      'security': 'Security',
      'store-locator': 'Store Locator',
      'geolocation': 'Geolocation & Near Me',
      'directions': 'Directions',
      'reviews': 'Reviews System',
      'favorites': 'Favorites',
      'photos': 'Photo Gallery',
      'notifications': 'Notifications',
      'appointments': 'Appointments',
      'dashboard': 'Admin Dashboard',
      'submissions': 'Store Submissions',
      'store-import': 'Store Import',
      'contact': 'Contact Messages',
      'territories': 'Store Zone Management',
      'types': 'Type Definitions',
      'testing': 'Testing',
      'error-handling': 'Error Handling',
      'troubleshooting': 'Troubleshooting',
      'deployment': 'Deployment'
    };
    return sectionNames[sectionId] || 'Documentation';
  }

  function updateBreadcrumb(sectionId) {
    const currentSpan = breadcrumb.querySelector('.current');
    if (currentSpan) {
      currentSpan.textContent = getSectionName(sectionId);
    }
  }

  function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
      navigateToSection(hash);
    } else {
      navigateToSection('overview');
    }
  }

  // Table of Contents
  function updateTableOfContents() {
    const activeSection = document.querySelector('.doc-section.active');
    if (!activeSection || !tocNav) return;

    const headings = activeSection.querySelectorAll('h2, h3');
    tocNav.innerHTML = '';

    headings.forEach(heading => {
      const link = document.createElement('a');
      const id = heading.id || heading.textContent.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      heading.id = id;
      
      link.href = `#${id}`;
      link.textContent = heading.textContent;
      link.style.paddingLeft = heading.tagName === 'H3' ? '1.5rem' : '0.75rem';
      
      link.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update active state
        tocNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
      });

      tocNav.appendChild(link);
    });

    // Observe headings for scroll spy
    setupScrollSpy(headings);
  }

  function setupScrollSpy(headings) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocNav.querySelectorAll('a').forEach(link => {
              link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
          }
        });
      },
      { rootMargin: '-100px 0px -66%' }
    );

    headings.forEach(heading => observer.observe(heading));
  }

  // Search (sidebar filter)
  function handleSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      // Reset to show all nav links
      navLinks.forEach(link => {
        link.closest('li').style.display = '';
      });
      document.querySelectorAll('.nav-section').forEach(section => {
        section.style.display = '';
        section.classList.remove('collapsed');
      });
      return;
    }

    // Filter nav links
    navLinks.forEach(link => {
      const text = link.textContent.toLowerCase();
      const matches = text.includes(normalizedQuery);
      link.closest('li').style.display = matches ? '' : 'none';
    });

    // Hide empty sections and expand matching ones
    document.querySelectorAll('.nav-section').forEach(section => {
      const visibleLinks = section.querySelectorAll('.nav-links li:not([style*="display: none"])');
      section.style.display = visibleLinks.length === 0 ? 'none' : '';
      if (visibleLinks.length > 0) {
        section.classList.remove('collapsed');
      }
    });
  }

  // Mobile Menu
  function toggleMobileMenu() {
    sidebar.classList.toggle('open');
    
    // Create or toggle overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', closeMobileMenu);
      document.body.appendChild(overlay);
    }
    overlay.classList.toggle('active', sidebar.classList.contains('open'));
  }

  function closeMobileMenu() {
    sidebar.classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Mobile menu
    mobileMenuToggle.addEventListener('click', toggleMobileMenu);

    // Navigation links
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        navigateToSection(sectionId);
      });
    });

    // Search input - open modal on focus
    searchInput.addEventListener('focus', openSearchModal);
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
    
    // Global search input
    document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
      performGlobalSearch(e.target.value);
    });
    
    // Search result clicks
    document.getElementById('searchResultsList')?.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (item) {
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        navigateToSection(sectionId);
        closeSearchModal();
      }
    });

    // Hash change
    window.addEventListener('hashchange', handleHashChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Focus search with Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
      
      // Close modal with Escape
      if (e.key === 'Escape') {
        if (searchModal.classList.contains('active')) {
          closeSearchModal();
        } else {
          closeMobileMenu();
        }
      }
      
      // Navigate search results with arrows
      if (searchModal.classList.contains('active')) {
        const results = document.querySelectorAll('.search-result-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedSearchIndex = Math.min(selectedSearchIndex + 1, results.length - 1);
          updateSelectedResult(results);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
          updateSelectedResult(results);
        } else if (e.key === 'Enter' && results[selectedSearchIndex]) {
          e.preventDefault();
          const sectionId = results[selectedSearchIndex].getAttribute('data-section');
          navigateToSection(sectionId);
          closeSearchModal();
        }
      }
    });
    
    function updateSelectedResult(results) {
      results.forEach((r, i) => {
        r.classList.toggle('selected', i === selectedSearchIndex);
      });
      results[selectedSearchIndex]?.scrollIntoView({ block: 'nearest' });
    }

    // Smooth scroll for in-page links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link && !link.classList.contains('nav-link') && !link.classList.contains('search-result-item')) {
        const targetId = link.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        
        if (target && target.closest('.doc-section.active')) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    // Handle code block copy functionality
    document.querySelectorAll('pre code').forEach(block => {
      const wrapper = block.closest('pre');
      wrapper.style.position = 'relative';
      
      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy';
      copyButton.className = 'copy-button';
      
      wrapper.appendChild(copyButton);
      
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(block.textContent);
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
