/**
 * Veerendra - Digital Document Management System
 * Core Frontend JavaScript Controller
 */

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';

  toast.innerHTML = `
    <i class="fas fa-${icon}" style="font-size: 16px;"></i>
    <div style="flex: 1;">${message}</div>
    <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 14px;" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global user state
let currentUser = null;

// Generic authenticated fetch wrapper
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // If unauthorized and on a protected page, redirect to login
      const path = window.location.pathname.toLowerCase();
      if (!path.includes('login.html') && !path.includes('register.html') && !path.includes('index.html') && path !== '/') {
        window.location.href = '/login.html';
      }
      return null;
    }
    return res;
  } catch (err) {
    console.error('API Fetch error:', err);
    showToast('Network error occurred. Please check connection.', 'error');
    return null;
  }
}

// Utility: Format File Size
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Utility: Format Date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Utility: File Type Icon and Class
function getFileIconMeta(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return { icon: 'fa-file-pdf', class: 'file-icon-pdf', label: 'PDF' };
  } else if (['doc', 'docx'].includes(ext)) {
    return { icon: 'fa-file-word', class: 'file-icon-doc', label: 'DOC' };
  } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return { icon: 'fa-file-image', class: 'file-icon-img', label: 'IMG' };
  }
  return { icon: 'fa-file-alt', class: 'file-icon-other', label: ext.toUpperCase() };
}

// Check session & populate user badges
async function checkAuth() {
  const path = window.location.pathname.toLowerCase();
  const isAuthPage = path.includes('login.html') || path.includes('register.html');
  const isLandingPage = path.includes('index.html') || path === '/';

  const res = await apiFetch('/api/auth/me');
  if (res && res.ok) {
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;

      if (isAuthPage) {
        window.location.href = '/dashboard.html';
        return;
      }

      // Populate user info in UI
      const nameElements = document.querySelectorAll('.js-user-name');
      const emailElements = document.querySelectorAll('.js-user-email');
      const avatarElements = document.querySelectorAll('.js-user-avatar');
      const roleElements = document.querySelectorAll('.js-user-role');

      const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      nameElements.forEach(el => el.textContent = currentUser.name);
      emailElements.forEach(el => el.textContent = currentUser.email);
      avatarElements.forEach(el => el.textContent = initials);
      roleElements.forEach(el => el.textContent = currentUser.role || 'User');
    } else if (!isAuthPage && !isLandingPage) {
      window.location.href = '/login.html';
    }
  } else if (!isAuthPage && !isLandingPage) {
    window.location.href = '/login.html';
  }
}

// Setup Mobile Sidebar Toggle
function setupSidebarToggle() {
  const toggleBtn = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// Setup Global Logout
function setupLogout() {
  const logoutButtons = document.querySelectorAll('.js-btn-logout');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
          showToast('Logged out successfully.', 'info');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 400);
        }
      } catch (err) {
        window.location.href = '/login.html';
      }
    });
  });
}

// ==========================================================================
// Page: Dashboard Initializer
// ==========================================================================
async function initDashboard() {
  const statDocs = document.getElementById('statTotalDocs');
  if (!statDocs) return;

  try {
    // 1. Fetch Stats
    const statsRes = await apiFetch('/api/stats');
    if (statsRes && statsRes.ok) {
      const { stats } = await statsRes.json();
      document.getElementById('statTotalDocs').textContent = stats.totalDocuments;
      document.getElementById('statTotalCategories').textContent = stats.totalCategories;
      document.getElementById('statTotalUsers').textContent = stats.totalUsers;
      document.getElementById('statSharedDocs').textContent = stats.sharedDocuments;

      // Render Category Breakdown Bars
      const catListContainer = document.getElementById('dashboardCategoryStats');
      if (catListContainer && stats.categoryBreakdown) {
        if (stats.categoryBreakdown.length === 0) {
          catListContainer.innerHTML = '<p class="text-muted" style="padding: 12px 0;">No categories available.</p>';
        } else {
          const maxCount = Math.max(...stats.categoryBreakdown.map(c => c.count), 1);
          catListContainer.innerHTML = stats.categoryBreakdown.map(cat => {
            const pct = Math.round((cat.count / maxCount) * 100);
            return `
              <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 5px;">
                  <span>${cat.category_name}</span>
                  <span style="color: var(--text-muted);">${cat.count} doc${cat.count === 1 ? '' : 's'}</span>
                </div>
                <div style="background-color: #f1f5f9; border-radius: 99px; height: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #4f46e5, #0ea5e9); width: ${pct}%; height: 100%; border-radius: 99px; transition: width 0.5s ease;"></div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }

    // 2. Fetch Recent Documents
    const recentRes = await apiFetch('/api/documents/recent');
    if (recentRes && recentRes.ok) {
      const { recent } = await recentRes.json();
      const recentTbody = document.getElementById('recentDocumentsTable');
      if (recentTbody) {
        if (!recent || recent.length === 0) {
          recentTbody.innerHTML = `
            <tr>
              <td colspan="5" class="empty-state">
                <i class="fas fa-folder-open empty-state-icon"></i>
                <h3>No documents uploaded yet</h3>
                <p>Upload your first document to see it listed here.</p>
                <a href="/upload.html" class="btn btn-primary btn-sm"><i class="fas fa-cloud-upload-alt"></i> Upload Now</a>
              </td>
            </tr>
          `;
        } else {
          recentTbody.innerHTML = recent.map(doc => {
            const meta = getFileIconMeta(doc.file_name);
            const st = (doc.status || '').toLowerCase();
            const statusClass = st === 'active' ? 'badge-active' : (st === 'draft' ? 'badge-draft' : 'badge-archived');
            const canDownload = doc.user_access_role === 'owner' || doc.user_access_role === 'download';

            return `
              <tr>
                <td>
                  <div class="file-cell">
                    <div class="file-icon-box ${meta.class}">
                      <i class="fas ${meta.icon}"></i>
                    </div>
                    <div class="file-details">
                      <h4>${doc.title}</h4>
                      <p>${doc.file_name}</p>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-category">${doc.category_name || 'Uncategorized'}</span></td>
                <td>${formatDate(doc.upload_date)}</td>
                <td><span class="badge ${statusClass}">${doc.status}</span></td>
                <td>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn-icon" title="View Document" onclick="viewDocument(${doc.document_id}, '${escapeQuote(doc.title)}')">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${canDownload ? `
                      <a href="/api/documents/download/${doc.document_id}" class="btn-icon" title="Download Document" download>
                        <i class="fas fa-download"></i>
                      </a>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error initializing dashboard:', err);
  }
}

// Helper to escape quotes in JS string params
function escapeQuote(str = '') {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ==========================================================================
// Page: Documents Initializer
// ==========================================================================
let allDocsData = [];
let currentDocFilter = 'all';

async function initDocumentsPage() {
  const docsContainer = document.getElementById('documentsList');
  if (!docsContainer) return;

  // 1. Populate Category Filter Dropdown
  await loadCategoriesDropdown('categoryFilter');

  // 2. Setup Filter Tabs (All / My Documents / Shared With Me)
  const tabs = document.querySelectorAll('.filter-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentDocFilter = tab.getAttribute('data-filter');
      fetchDocuments();
    });
  });

  // 3. Search and Category Filter Listeners
  const searchInput = document.getElementById('docSearchInput');
  const catFilter = document.getElementById('categoryFilter');

  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(fetchDocuments, 300);
    });
  }

  if (catFilter) {
    catFilter.addEventListener('change', fetchDocuments);
  }

  // 4. Initial Fetch
  await fetchDocuments();
}

async function fetchDocuments() {
  const searchInput = document.getElementById('docSearchInput');
  const catFilter = document.getElementById('categoryFilter');
  const tbody = document.getElementById('documentsTableBody');
  const grid = document.getElementById('documentsGrid');

  const search = searchInput ? searchInput.value.trim() : '';
  const categoryId = catFilter ? catFilter.value : '';

  let url = `/api/documents?filter=${currentDocFilter}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (categoryId) url += `&category_id=${encodeURIComponent(categoryId)}`;

  try {
    const res = await apiFetch(url);
    if (!res || !res.ok) return;

    const data = await res.json();
    allDocsData = data.documents || [];

    renderDocuments(allDocsData);
  } catch (err) {
    console.error('Error fetching documents:', err);
  }
}

function renderDocuments(docs) {
  const tbody = document.getElementById('documentsTableBody');
  const grid = document.getElementById('documentsGrid');
  const docCountBadge = document.getElementById('docTotalCountBadge');

  if (docCountBadge) docCountBadge.textContent = `${docs.length} Document${docs.length === 1 ? '' : 's'}`;

  if (!docs || docs.length === 0) {
    const emptyHtml = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-folder-open empty-state-icon"></i>
        <h3>No documents found</h3>
        <p>No matching documents found in this view. Try adjusting your search or upload a new file.</p>
        <a href="/upload.html" class="btn btn-primary btn-sm"><i class="fas fa-cloud-upload-alt"></i> Upload New Document</a>
      </div>
    `;

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">${emptyHtml}</td></tr>`;
    }
    if (grid) {
      grid.innerHTML = emptyHtml;
    }
    return;
  }

  // Render Table Rows
  if (tbody) {
    tbody.innerHTML = docs.map(doc => {
      const meta = getFileIconMeta(doc.file_name);
      const isOwner = doc.user_access_role === 'owner';
      const canDownload = isOwner || doc.user_access_role === 'download';
      const st = (doc.status || '').toLowerCase();
      const statusClass = st === 'active' ? 'badge-active' : (st === 'draft' ? 'badge-draft' : 'badge-archived');

      return `
        <tr>
          <td>
            <div class="file-cell">
              <div class="file-icon-box ${meta.class}">
                <i class="fas ${meta.icon}"></i>
              </div>
              <div class="file-details">
                <h4>${doc.title}</h4>
                <p>${doc.file_name} • ${formatBytes(doc.file_size)}</p>
              </div>
            </div>
          </td>
          <td><span class="badge badge-category">${doc.category_name || 'Uncategorized'}</span></td>
          <td>
            <div style="font-size: 13px; font-weight: 500;">${doc.owner_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${isOwner ? '<span style="color: #4f46e5; font-weight: 600;">(You)</span>' : doc.owner_email}</div>
          </td>
          <td>${formatDate(doc.upload_date)}</td>
          <td><span class="badge ${statusClass}">${doc.status}</span></td>
          <td>
            ${isOwner 
              ? '<span class="badge" style="background:#eef2ff; color:#4338ca;">Owner</span>' 
              : `<span class="badge ${doc.user_access_role === 'download' ? 'badge-download' : 'badge-view'}">${doc.user_access_role.toUpperCase()}</span>`}
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn-icon" title="View Document" onclick="viewDocument(${doc.document_id}, '${escapeQuote(doc.title)}')">
                <i class="fas fa-eye"></i>
              </button>
              ${canDownload ? `
                <a href="/api/documents/download/${doc.document_id}" class="btn-icon" title="Download Document" download>
                  <i class="fas fa-download"></i>
                </a>
              ` : ''}
              ${isOwner ? `
                <button class="btn-icon" title="Share Document" onclick="openShareModal(${doc.document_id}, '${escapeQuote(doc.title)}')">
                  <i class="fas fa-share-alt"></i>
                </button>
                <button class="btn-icon danger" title="Delete Document" onclick="confirmDeleteDoc(${doc.document_id}, '${escapeQuote(doc.title)}')">
                  <i class="fas fa-trash-alt"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Grid Cards
  if (grid) {
    grid.innerHTML = docs.map(doc => {
      const meta = getFileIconMeta(doc.file_name);
      const isOwner = doc.user_access_role === 'owner';
      const canDownload = isOwner || doc.user_access_role === 'download';
      const st = (doc.status || '').toLowerCase();
      const statusClass = st === 'active' ? 'badge-active' : (st === 'draft' ? 'badge-draft' : 'badge-archived');

      return `
        <div class="doc-card">
          <div class="doc-card-top">
            <div class="file-icon-box ${meta.class}" style="width: 44px; height: 44px; font-size: 20px;">
              <i class="fas ${meta.icon}"></i>
            </div>
            <span class="badge ${statusClass}">${doc.status}</span>
          </div>

          <div class="doc-card-title">${doc.title}</div>
          
          <div class="doc-card-meta">
            <div><i class="fas fa-tag" style="width: 16px; color: var(--primary);"></i> ${doc.category_name || 'Uncategorized'}</div>
            <div><i class="fas fa-user" style="width: 16px; color: var(--text-light);"></i> ${isOwner ? 'Uploaded by You' : doc.owner_name}</div>
            <div><i class="fas fa-calendar-alt" style="width: 16px; color: var(--text-light);"></i> ${formatDate(doc.upload_date)}</div>
            <div><i class="fas fa-hdd" style="width: 16px; color: var(--text-light);"></i> ${formatBytes(doc.file_size)}</div>
          </div>

          <div class="doc-card-actions">
            <div>
              ${isOwner 
                ? '<span class="badge" style="background:#eef2ff; color:#4338ca; font-size: 11px;">Owner</span>' 
                : `<span class="badge ${doc.user_access_role === 'download' ? 'badge-download' : 'badge-view'}" style="font-size: 11px;">${doc.user_access_role.toUpperCase()}</span>`}
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-icon" title="View Document" onclick="viewDocument(${doc.document_id}, '${escapeQuote(doc.title)}')">
                <i class="fas fa-eye"></i>
              </button>
              ${canDownload ? `
                <a href="/api/documents/download/${doc.document_id}" class="btn-icon" title="Download Document" download>
                  <i class="fas fa-download"></i>
                </a>
              ` : ''}
              ${isOwner ? `
                <button class="btn-icon" title="Share Document" onclick="openShareModal(${doc.document_id}, '${escapeQuote(doc.title)}')">
                  <i class="fas fa-share-alt"></i>
                </button>
                <button class="btn-icon danger" title="Delete Document" onclick="confirmDeleteDoc(${doc.document_id}, '${escapeQuote(doc.title)}')">
                  <i class="fas fa-trash-alt"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// View / Preview Document in Modal
function viewDocument(docId, title) {
  const modal = document.getElementById('previewModal');
  const modalTitle = document.getElementById('previewModalTitle');
  const previewBody = document.getElementById('previewModalBody');

  if (!modal || !previewBody) {
    window.open(`/api/documents/view/${docId}`, '_blank');
    return;
  }

  modalTitle.textContent = title || 'Document Preview';
  const url = `/api/documents/view/${docId}`;

  previewBody.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; background-color: #f8fafc; border-radius: var(--radius-md);">
      <iframe src="${url}" style="width: 100%; height: 550px; border: none; border-radius: var(--radius-md);" onload="this.style.opacity=1;"></iframe>
    </div>
  `;

  openModal('previewModal');
}

// Delete Document Confirm
let docToDeleteId = null;
function confirmDeleteDoc(docId, title) {
  docToDeleteId = docId;
  const targetName = document.getElementById('deleteTargetName');
  if (targetName) targetName.textContent = `"${title}"`;
  openModal('deleteDocModal');
}

async function executeDeleteDocument() {
  if (!docToDeleteId) return;

  try {
    const res = await apiFetch(`/api/documents/${docToDeleteId}`, { method: 'DELETE' });
    if (res && res.ok) {
      showToast('Document deleted successfully.', 'success');
      closeModal('deleteDocModal');
      docToDeleteId = null;
      fetchDocuments();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  } catch (e) {
    showToast('Failed to delete document.', 'error');
  }
}

// ==========================================================================
// Page: Document Upload Initializer
// ==========================================================================
function initUploadPage() {
  const uploadForm = document.getElementById('uploadDocumentForm');
  if (!uploadForm) return;

  // Load Categories into dropdown
  loadCategoriesDropdown('uploadCategoryId');

  // Drag and Drop Zone Setup
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('fileInput');
  const previewBox = document.getElementById('selectedFilePreview');
  const titleInput = document.getElementById('docTitle');

  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelected(fileInput.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        handleFileSelected(fileInput.files[0]);
      }
    });
  }

  function handleFileSelected(file) {
    if (!file) return;

    if (previewBox) {
      previewBox.style.display = 'flex';
      const meta = getFileIconMeta(file.name);
      previewBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="file-icon-box ${meta.class}">
            <i class="fas ${meta.icon}"></i>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 14px;">${file.name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${formatBytes(file.size)} • ${file.type || 'Document'}</div>
          </div>
        </div>
        <button type="button" class="btn-icon danger" onclick="clearSelectedFile()"><i class="fas fa-times"></i></button>
      `;
    }

    // Auto-fill title if empty
    if (titleInput && !titleInput.value) {
      const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      titleInput.value = cleanTitle.replace(/[-_]/g, ' ');
    }
  }

  // Handle Form Submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const categoryId = document.getElementById('uploadCategoryId').value;
    const status = document.getElementById('uploadStatus').value;
    const submitBtn = document.getElementById('btnSubmitUpload');

    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Please select a document file to upload.', 'warning');
      return;
    }

    if (!title) {
      showToast('Please enter a document title.', 'warning');
      titleInput.focus();
      return;
    }

    const formData = new FormData();
    formData.append('document', fileInput.files[0]);
    formData.append('title', title);
    if (categoryId) formData.append('category_id', categoryId);
    if (status) formData.append('status', status);

    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast('Document uploaded successfully!', 'success');
        uploadForm.reset();
        clearSelectedFile();

        // Redirect to documents view after short delay
        setTimeout(() => {
          window.location.href = '/documents.html';
        }, 1200);
      } else {
        showToast(result.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      showToast('Upload failed due to connection error.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

function clearSelectedFile() {
  const fileInput = document.getElementById('fileInput');
  const previewBox = document.getElementById('selectedFilePreview');
  if (fileInput) fileInput.value = '';
  if (previewBox) {
    previewBox.innerHTML = '';
    previewBox.style.display = 'none';
  }
}

// Load Categories into any <select> element
async function loadCategoriesDropdown(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await apiFetch('/api/categories');
    if (res && res.ok) {
      const { categories } = await res.json();
      const firstOption = select.options[0] ? select.options[0].outerHTML : '<option value="">Select Category</option>';
      select.innerHTML = firstOption + categories.map(c => `
        <option value="${c.category_id}">${c.category_name}</option>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load categories dropdown:', e);
  }
}

// ==========================================================================
// Page: Category Management Initializer
// ==========================================================================
async function initCategoriesPage() {
  const catTable = document.getElementById('categoriesTableBody');
  if (!catTable) return;

  await loadCategories();

  // Setup Add Category Form Modal
  const addForm = document.getElementById('addCategoryForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('catNameInput').value.trim();
      const desc = document.getElementById('catDescInput').value.trim();

      if (!name) {
        showToast('Category name is required.', 'warning');
        return;
      }

      try {
        const res = await apiFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_name: name, description: desc })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Category created successfully!', 'success');
          addForm.reset();
          closeModal('addCategoryModal');
          loadCategories();
        } else {
          showToast(data.message || 'Could not create category.', 'error');
        }
      } catch (err) {
        showToast('Error creating category.', 'error');
      }
    });
  }

  // Setup Edit Category Form Modal
  const editForm = document.getElementById('editCategoryForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editCatId').value;
      const name = document.getElementById('editCatName').value.trim();
      const desc = document.getElementById('editCatDesc').value.trim();

      try {
        const res = await apiFetch(`/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_name: name, description: desc })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Category updated successfully!', 'success');
          closeModal('editCategoryModal');
          loadCategories();
        } else {
          showToast(data.message || 'Could not update category.', 'error');
        }
      } catch (err) {
        showToast('Error updating category.', 'error');
      }
    });
  }
}

async function loadCategories() {
  const tbody = document.getElementById('categoriesTableBody');
  const catTotalBadge = document.getElementById('categoryTotalCount');

  try {
    const res = await apiFetch('/api/categories');
    if (!res || !res.ok) return;

    const { categories } = await res.json();

    if (catTotalBadge) catTotalBadge.textContent = `${categories.length} Categories`;

    if (!categories || categories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-tags empty-state-icon"></i>
            <h3>No categories yet</h3>
            <p>Create categories to organize your digital documents efficiently.</p>
            <button class="btn btn-primary btn-sm" onclick="openModal('addCategoryModal')">
              <i class="fas fa-plus"></i> Add First Category
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${cat.category_name}</div>
        </td>
        <td>
          <div style="color: var(--text-muted); font-size: 13px; max-width: 380px;">${cat.description || '<em>No description provided</em>'}</div>
        </td>
        <td>
          <span class="badge" style="background-color: #f1f5f9; color: #334155; font-weight: 700;">
            <i class="fas fa-file-alt" style="margin-right: 4px; color: var(--primary);"></i> ${cat.document_count} doc${cat.document_count === 1 ? '' : 's'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon" title="Edit Category" onclick="openEditCategory(${cat.category_id}, '${escapeQuote(cat.category_name)}', '${escapeQuote(cat.description || '')}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon danger" title="Delete Category" onclick="confirmDeleteCategory(${cat.category_id}, '${escapeQuote(cat.category_name)}', ${cat.document_count})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function openEditCategory(id, name, desc) {
  document.getElementById('editCatId').value = id;
  document.getElementById('editCatName').value = name;
  document.getElementById('editCatDesc').value = desc;
  openModal('editCategoryModal');
}

let catToDeleteId = null;
function confirmDeleteCategory(id, name, docCount) {
  catToDeleteId = id;
  const target = document.getElementById('deleteCategoryName');
  const warning = document.getElementById('deleteCatWarning');

  if (target) target.textContent = `"${name}"`;
  if (warning) {
    if (docCount > 0) {
      warning.style.display = 'block';
      warning.textContent = `Warning: ${docCount} document(s) are currently in this category. They will remain intact but will become uncategorized.`;
    } else {
      warning.style.display = 'none';
    }
  }

  openModal('deleteCategoryModal');
}

async function executeDeleteCategory() {
  if (!catToDeleteId) return;

  try {
    const res = await apiFetch(`/api/categories/${catToDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Category deleted.', 'success');
      closeModal('deleteCategoryModal');
      catToDeleteId = null;
      loadCategories();
    } else {
      showToast(data.message || 'Failed to delete category.', 'error');
    }
  } catch (e) {
    showToast('Error deleting category.', 'error');
  }
}

// ==========================================================================
// Page: Document Access & Sharing Initializer
// ==========================================================================
async function initAccessPage() {
  const shareForm = document.getElementById('shareDocumentForm');
  if (!shareForm) return;

  // Load User's Owned Documents for Sharing Dropdown
  await loadOwnedDocsForSharing();

  // Load Other Registered Users for Sharing Dropdown
  await loadRegisteredUsersForSharing();

  // Load Shared Lists
  await loadSharedByMe();
  await loadSharedWithMe();

  // Handle Share Document Form Submit
  shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const docId = document.getElementById('shareDocSelect').value;
    const userId = document.getElementById('shareUserSelect').value;
    const permission = document.getElementById('sharePermissionSelect').value;
    const btn = document.getElementById('btnSubmitShare');

    if (!docId) {
      showToast('Please select a document to share.', 'warning');
      return;
    }

    if (!userId) {
      showToast('Please select a user to share with.', 'warning');
      return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Granting...';

    try {
      const res = await apiFetch('/api/access/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: docId,
          user_id: userId,
          permission: permission
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        shareForm.reset();
        loadSharedByMe();
      } else {
        showToast(data.message || 'Failed to share document.', 'error');
      }
    } catch (e) {
      showToast('Error sharing document.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  });
}

// Populate Owned Documents dropdown
async function loadOwnedDocsForSharing() {
  const select = document.getElementById('shareDocSelect');
  if (!select) return;

  try {
    const res = await apiFetch('/api/documents?filter=my');
    if (res && res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      select.innerHTML = '<option value="">-- Choose One of Your Documents --</option>' + docs.map(d => `
        <option value="${d.document_id}">${d.title} (${d.file_name})</option>
      `).join('');
    }
  } catch (e) {
    console.error('Failed to load owned docs:', e);
  }
}

// Populate Registered Users dropdown
async function loadRegisteredUsersForSharing() {
  const select = document.getElementById('shareUserSelect');
  if (!select) return;

  try {
    const res = await apiFetch('/api/auth/users');
    if (res && res.ok) {
      const data = await res.json();
      const users = data.users || [];
      if (users.length === 0) {
        select.innerHTML = '<option value="">No other registered users found</option>';
      } else {
        select.innerHTML = '<option value="">-- Select Recipient User --</option>' + users.map(u => `
          <option value="${u.user_id}">${u.name} (${u.email}) [${u.role}]</option>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Failed to load registered users:', e);
  }
}

// Load List of Documents Shared By Me
async function loadSharedByMe() {
  const tbody = document.getElementById('sharedByMeTableBody');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/access/shared-by-me');
    if (!res || !res.ok) return;

    const data = await res.json();
    const records = data.records || [];

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-share-alt empty-state-icon"></i>
            <h3>No documents shared yet</h3>
            <p>Use the form above to share your documents with other registered users.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${r.document_title}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${r.file_name}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${r.recipient_name}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${r.recipient_email}</div>
        </td>
        <td>
          <span class="badge ${r.permission === 'download' ? 'badge-download' : 'badge-view'}">
            <i class="fas ${r.permission === 'download' ? 'fa-download' : 'fa-eye'}"></i> ${r.permission.toUpperCase()}
          </span>
        </td>
        <td>${formatDate(r.granted_date)}</td>
        <td>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-border);" onclick="revokeAccess(${r.access_id}, '${escapeQuote(r.document_title)}', '${escapeQuote(r.recipient_name)}')">
            <i class="fas fa-user-slash"></i> Revoke
          </button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error loading shared by me:', e);
  }
}

// Load List of Documents Shared With Me
async function loadSharedWithMe() {
  const tbody = document.getElementById('sharedWithMeTableBody');
  if (!tbody) return;

  try {
    const res = await apiFetch('/api/access/shared-with-me');
    if (!res || !res.ok) return;

    const data = await res.json();
    const records = data.records || [];

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <i class="fas fa-inbox empty-state-icon"></i>
            <h3>No shared documents</h3>
            <p>Documents shared with you by other users will show up here.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const meta = getFileIconMeta(r.file_name);
      const canDownload = r.permission === 'download';

      return `
        <tr>
          <td>
            <div class="file-cell">
              <div class="file-icon-box ${meta.class}">
                <i class="fas ${meta.icon}"></i>
              </div>
              <div class="file-details">
                <h4>${r.title}</h4>
                <p>${r.file_name}</p>
              </div>
            </div>
          </td>
          <td><span class="badge badge-category">${r.category_name || 'Uncategorized'}</span></td>
          <td>
            <div style="font-weight: 600;">${r.owner_name}</div>
            <div style="font-size: 12px; color: var(--text-muted);">${r.owner_email}</div>
          </td>
          <td>
            <span class="badge ${canDownload ? 'badge-download' : 'badge-view'}">
              <i class="fas ${canDownload ? 'fa-download' : 'fa-eye'}"></i> ${r.permission.toUpperCase()}
            </span>
          </td>
          <td>${formatDate(r.granted_date)}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn-icon" title="View Document" onclick="viewDocument(${r.document_id}, '${escapeQuote(r.title)}')">
                <i class="fas fa-eye"></i>
              </button>
              ${canDownload ? `
                <a href="/api/documents/download/${r.document_id}" class="btn-icon" title="Download Document" download>
                  <i class="fas fa-download"></i>
                </a>
              ` : `
                <span style="font-size: 11px; color: var(--text-light); align-self: center;">View only</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error('Error loading shared with me:', e);
  }
}

// Revoke access action
async function revokeAccess(accessId, docTitle, recipientName) {
  if (!confirm(`Are you sure you want to revoke access to "${docTitle}" for ${recipientName}?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/access/${accessId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || 'Access revoked.', 'success');
      loadSharedByMe();
    } else {
      showToast(data.message || 'Failed to revoke access.', 'error');
    }
  } catch (e) {
    showToast('Error revoking access.', 'error');
  }
}

// Quick Share Modal trigger from documents page
async function openShareModal(docId, title) {
  const modal = document.getElementById('quickShareModal');
  if (!modal) {
    window.location.href = '/access.html';
    return;
  }

  document.getElementById('quickShareDocId').value = docId;
  document.getElementById('quickShareDocTitle').textContent = `Sharing "${title}"`;

  // Populate users in quick share modal
  const userSelect = document.getElementById('quickShareUserSelect');
  if (userSelect) {
    try {
      const res = await apiFetch('/api/auth/users');
      if (res && res.ok) {
        const data = await res.json();
        const users = data.users || [];
        userSelect.innerHTML = '<option value="">-- Choose User to Share With --</option>' + users.map(u => `
          <option value="${u.user_id}">${u.name} (${u.email})</option>
        `).join('');
      }
    } catch (e) {}
  }

  openModal('quickShareModal');
}

async function executeQuickShare() {
  const docId = document.getElementById('quickShareDocId').value;
  const userId = document.getElementById('quickShareUserSelect').value;
  const permission = document.getElementById('quickSharePermission').value;

  if (!userId) {
    showToast('Please select a user to share with.', 'warning');
    return;
  }

  try {
    const res = await apiFetch('/api/access/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: docId, user_id: userId, permission })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message, 'success');
      closeModal('quickShareModal');
    } else {
      showToast(data.message || 'Failed to share document.', 'error');
    }
  } catch (e) {
    showToast('Failed to share document.', 'error');
  }
}

// ==========================================================================
// Modal Helpers
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modals when clicking overlay
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// View Toggle (Grid vs Table)
function setupViewToggle() {
  const btnTable = document.getElementById('viewModeTable');
  const btnGrid = document.getElementById('viewModeGrid');
  const tableView = document.getElementById('documentsTableView');
  const gridView = document.getElementById('documentsGrid');

  if (btnTable && btnGrid && tableView && gridView) {
    btnTable.addEventListener('click', () => {
      btnTable.classList.add('active');
      btnGrid.classList.remove('active');
      tableView.style.display = 'block';
      gridView.style.display = 'none';
    });

    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('active');
      btnTable.classList.remove('active');
      tableView.style.display = 'none';
      gridView.style.display = 'grid';
    });
  }
}

// ==========================================================================
// DOM Ready Controller
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupSidebarToggle();
  setupLogout();
  setupViewToggle();

  await checkAuth();

  const path = window.location.pathname.toLowerCase();

  if (path.includes('dashboard.html')) {
    initDashboard();
  } else if (path.includes('documents.html')) {
    initDocumentsPage();
  } else if (path.includes('upload.html')) {
    initUploadPage();
  } else if (path.includes('categories.html')) {
    initCategoriesPage();
  } else if (path.includes('access.html')) {
    initAccessPage();
  }
});
