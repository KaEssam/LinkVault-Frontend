// ===== CONFIG =====
const API = 'http://vaultapi.tryasp.net/api';

// ===== AUTH HELPERS =====
function getToken() {
  return localStorage.getItem('lv_token');
}

function saveToken(token) {
  localStorage.setItem('lv_token', token);
}

function logout() {
  localStorage.removeItem('lv_token');
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
  }
  renderNavbar();
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + getToken(),
  };
}

function getUserEmail() {
  const token = getToken();
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (
      payload.email ||
      payload[
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
      ] ||
      ''
    );
  } catch {
    return '';
  }
}

function showError(message) {
  showAlert(message, 'danger');
}

function showSuccess(message) {
  showAlert(message, 'success');
}

function showAlert(message, type) {
  const container = document.getElementById('alert-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `alert alert-${type} alert-dismissible fade show`;
  div.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// ===== API HELPERS =====
async function apiGet(url) {
  const res = await fetch(API + url, { headers: getHeaders() });
  if (!res.ok) throw await extractError(res);
  if (res.status === 204) return null;
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(API + url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await extractError(res);
  if (res.status === 204) return null;
  return res.json();
}

async function apiPut(url, body) {
  const res = await fetch(API + url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await extractError(res);
  if (res.status === 204) return null;
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(API + url, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw await extractError(res);
  return null;
}

async function apiPatch(url) {
  const res = await fetch(API + url, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  if (!res.ok) throw await extractError(res);
  if (res.status === 204) return null;
  return res.json();
}

async function extractError(res) {
  try {
    const data = await res.json();
    if (data.errors) {
      const msgs = Object.values(data.errors).flat().join(', ');
      return new Error(msgs);
    }
    return new Error(data.message || data.title || JSON.stringify(data));
  } catch {
    return new Error('Request failed (' + res.status + ')');
  }
}

// ===== NAVBAR =====
function renderNavbar() {
  const nav = document.getElementById('main-navbar');
  if (!nav) return;
  const page = window.location.pathname.split('/').pop();
  const email = getUserEmail();
  nav.innerHTML = `
    <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="categories.html">LinkVault</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
            <ul class="navbar-nav me-auto">
                <li class="nav-item"><a class="nav-link ${page === 'categories.html' ? 'active' : ''}" href="categories.html">Categories</a></li>
                <li class="nav-item"><a class="nav-link ${page === 'bookmarks.html' ? 'active' : ''}" href="bookmarks.html">Bookmarks</a></li>
                <li class="nav-item"><a class="nav-link ${page === 'notes.html' ? 'active' : ''}" href="notes.html">Notes</a></li>
            </ul>
            <span class="navbar-text text-light me-3">${email}</span>
            <button class="btn btn-outline-light btn-sm" onclick="logout()">Logout</button>
        </div>
    </div>`;
}

// ===== AUTH PAGE =====
function initLoginPage() {
  if (getToken()) {
    window.location.href = 'categories.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.closest('.card').classList.add('d-none');
    registerForm.closest('.card').classList.remove('d-none');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.closest('.card').classList.add('d-none');
    loginForm.closest('.card').classList.remove('d-none');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiPost('/auth/login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      });
      saveToken(data.token);
      window.location.href = 'categories.html';
    } catch (err) {
      showError(err.message);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiPost('/auth/register', {
        firstName: document.getElementById('reg-firstname').value,
        lastName: document.getElementById('reg-lastname').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
      });
      saveToken(data.token);
      window.location.href = 'categories.html';
    } catch (err) {
      showError(err.message);
    }
  });
}

// ===== CATEGORIES PAGE =====
function initCategoriesPage() {
  requireAuth();
  loadCategories();

  document
    .getElementById('category-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('category-id').value;
      const body = {
        categoryName: document.getElementById('cat-name').value,
        description: document.getElementById('cat-desc').value,
      };
      try {
        if (id) {
          await apiPut('/categories/' + id, body);
          showSuccess('Category updated');
        } else {
          await apiPost('/categories', body);
          showSuccess('Category created');
        }
        bootstrap.Modal.getInstance(
          document.getElementById('categoryModal'),
        ).hide();
        loadCategories();
      } catch (err) {
        showError(err.message);
      }
    });
}

async function loadCategories() {
  try {
    const cats = await apiGet('/categories');
    const tbody = document.getElementById('categories-tbody');
    if (!cats || cats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No categories yet. Click "+ New Category" to get started.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = cats
      .map(
        (c) => `
            <tr>
                <td><a href="bookmarks.html?categoryId=${c.id}" class="text-decoration-none">${esc(c.categoryName)}</a></td>
                <td>${esc(c.description || '')}</td>
                <td>${c.bookmarksCount}</td>
                <td>${c.notesCount}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory(${c.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${c.id})">Delete</button>
                </td>
            </tr>`,
      )
      .join('');
  } catch (err) {
    showError(err.message);
  }
}

async function editCategory(id) {
  try {
    const c = await apiGet('/categories/' + id);
    document.getElementById('category-id').value = c.id;
    document.getElementById('cat-name').value = c.categoryName;
    document.getElementById('cat-desc').value = c.description || '';
    document.getElementById('categoryModalLabel').textContent = 'Edit Category';
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    await apiDelete('/categories/' + id);
    showSuccess('Category deleted');
    loadCategories();
  } catch (err) {
    showError(err.message);
  }
}

function openNewCategoryModal() {
  document.getElementById('category-id').value = '';
  document.getElementById('category-form').reset();
  document.getElementById('categoryModalLabel').textContent = 'New Category';
  new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// ===== BOOKMARKS PAGE =====
function initBookmarksPage() {
  requireAuth();
  loadCategoryFilter();
  loadBookmarks();

  document
    .getElementById('bookmark-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('bookmark-id').value;
      const body = {
        url: document.getElementById('bm-url').value,
        title: document.getElementById('bm-title').value,
        categoryId: parseInt(document.getElementById('bm-category').value),
      };
      try {
        if (id) {
          const existing = await apiGet('/bookmarks/' + id);
          body.isFavorite = existing.isFavorite;
          body.isArchived = existing.isArchived;
          await apiPut('/bookmarks/' + id, body);
          showSuccess('Bookmark updated');
        } else {
          await apiPost('/bookmarks', body);
          showSuccess('Bookmark created');
        }
        bootstrap.Modal.getInstance(
          document.getElementById('bookmarkModal'),
        ).hide();
        loadBookmarks();
      } catch (err) {
        showError(err.message);
      }
    });

  document
    .getElementById('filter-apply')
    .addEventListener('click', loadBookmarks);
  document.getElementById('filter-clear').addEventListener('click', () => {
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-fav').checked = false;
    document.getElementById('filter-archived').checked = false;
    loadBookmarks();
  });
}

async function loadCategoryFilter() {
  try {
    const cats = await apiGet('/categories');
    const filterSel = document.getElementById('filter-category');
    const bmSel = document.getElementById('bm-category');
    const opts = cats
      .map((c) => `<option value="${c.id}">${esc(c.categoryName)}</option>`)
      .join('');
    filterSel.innerHTML = '<option value="">All Categories</option>' + opts;
    bmSel.innerHTML = '<option value="">Select category</option>' + opts;

    // Pre-select filter from URL
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('categoryId');
    if (catId) {
      filterSel.value = catId;
    }
  } catch (err) {
    showError(err.message);
  }
}

async function loadBookmarks() {
  try {
    const params = new URLSearchParams();
    const cat = document.getElementById('filter-category').value;
    const search = document.getElementById('filter-search').value;
    const fav = document.getElementById('filter-fav').checked;
    const archived = document.getElementById('filter-archived').checked;
    if (cat) params.set('categoryId', cat);
    if (search) params.set('search', search);
    if (fav) params.set('isFavorite', 'true');
    if (archived) params.set('isArchived', 'true');

    const qs = params.toString() ? '?' + params.toString() : '';
    const bookmarks = await apiGet('/bookmarks' + qs);
    const tbody = document.getElementById('bookmarks-tbody');
    if (!bookmarks || bookmarks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No bookmarks found.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = bookmarks
      .map(
        (b) => `
            <tr>
                <td>${esc(b.title)}</td>
                <td><a href="${esc(b.url)}" target="_blank" class="text-decoration-none">${esc(b.url)}</a></td>
                <td>${esc(b.categoryName)}</td>
                <td><span class="star ${b.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${b.id})">&#9733;</span></td>
                <td><span class="archive-icon ${b.isArchived ? 'active' : ''}" onclick="toggleArchived(${b.id})">&#128230;</span></td>
                <td>
                    <a href="bookmark-detail.html?id=${b.id}" class="btn btn-sm btn-outline-info me-1">View</a>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editBookmark(${b.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBookmark(${b.id})">Delete</button>
                </td>
            </tr>`,
      )
      .join('');
  } catch (err) {
    showError(err.message);
  }
}

async function toggleFavorite(id) {
  try {
    const b = await apiGet('/bookmarks/' + id);
    await apiPut('/bookmarks/' + id, {
      url: b.url,
      title: b.title,
      categoryId: b.categoryId,
      isFavorite: !b.isFavorite,
      isArchived: b.isArchived,
    });
    loadBookmarks();
  } catch (err) {
    showError(err.message);
  }
}

async function toggleArchived(id) {
  try {
    const b = await apiGet('/bookmarks/' + id);
    await apiPut('/bookmarks/' + id, {
      url: b.url,
      title: b.title,
      categoryId: b.categoryId,
      isFavorite: b.isFavorite,
      isArchived: !b.isArchived,
    });
    loadBookmarks();
  } catch (err) {
    showError(err.message);
  }
}

async function editBookmark(id) {
  try {
    const b = await apiGet('/bookmarks/' + id);
    document.getElementById('bookmark-id').value = b.id;
    document.getElementById('bm-url').value = b.url;
    document.getElementById('bm-title').value = b.title;
    document.getElementById('bm-category').value = b.categoryId;
    document.getElementById('bookmarkModalLabel').textContent = 'Edit Bookmark';
    new bootstrap.Modal(document.getElementById('bookmarkModal')).show();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteBookmark(id) {
  if (!confirm('Delete this bookmark?')) return;
  try {
    await apiDelete('/bookmarks/' + id);
    showSuccess('Bookmark deleted');
    loadBookmarks();
  } catch (err) {
    showError(err.message);
  }
}

function openNewBookmarkModal() {
  document.getElementById('bookmark-id').value = '';
  document.getElementById('bookmark-form').reset();
  document.getElementById('bookmarkModalLabel').textContent = 'New Bookmark';
  new bootstrap.Modal(document.getElementById('bookmarkModal')).show();
}

// ===== BOOKMARK DETAIL PAGE =====
function initBookmarkDetailPage() {
  requireAuth();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'bookmarks.html';
    return;
  }
  loadBookmarkDetail(id);
  loadBookmarkNotes(id);

  document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addBookmarkNote(id);
  });
}

async function loadBookmarkDetail(id) {
  try {
    const b = await apiGet('/bookmarks/' + id);
    document.getElementById('bm-detail-title').textContent = b.title;
    document.getElementById('bm-detail-url').href = b.url;
    document.getElementById('bm-detail-url').textContent = b.url;
    document.getElementById('bm-detail-category').textContent = b.categoryName;
    document.getElementById('bm-detail-created').textContent = new Date(
      b.createdAt,
    ).toLocaleDateString();

    const favBadge = document.getElementById('bm-detail-fav');
    favBadge.textContent = b.isFavorite ? 'Favorite' : '';
    favBadge.className = b.isFavorite ? 'badge badge-fav' : 'd-none';

    const archBadge = document.getElementById('bm-detail-archived');
    archBadge.textContent = b.isArchived ? 'Archived' : '';
    archBadge.className = b.isArchived ? 'badge badge-archived' : 'd-none';
  } catch (err) {
    showError(err.message);
  }
}

async function loadBookmarkNotes(bookmarkId) {
  try {
    const notes = await apiGet('/bookmarks/' + bookmarkId + '/notes');
    const list = document.getElementById('notes-list');
    if (!notes || notes.length === 0) {
      list.innerHTML =
        '<div class="empty-state">No notes yet. Add one below.</div>';
      return;
    }
    list.innerHTML = notes
      .map(
        (n) => `
            <div class="card mb-2">
                <div class="card-body d-flex justify-content-between align-items-start">
                    <div>
                        <p class="mb-1">${esc(n.content)}</p>
                        <small class="text-muted">${new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteBookmarkNote(${bookmarkId}, ${n.id})">Delete</button>
                </div>
            </div>`,
      )
      .join('');
  } catch (err) {
    showError(err.message);
  }
}

async function addBookmarkNote(bookmarkId) {
  const content = document.getElementById('note-content').value.trim();
  if (!content) return;
  try {
    await apiPost('/bookmarks/' + bookmarkId + '/notes', { content });
    document.getElementById('note-content').value = '';
    showSuccess('Note added');
    loadBookmarkNotes(bookmarkId);
  } catch (err) {
    showError(err.message);
  }
}

async function deleteBookmarkNote(bookmarkId, noteId) {
  if (!confirm('Delete this note?')) return;
  try {
    await apiDelete('/bookmarks/' + bookmarkId + '/notes/' + noteId);
    showSuccess('Note deleted');
    loadBookmarkNotes(bookmarkId);
  } catch (err) {
    showError(err.message);
  }
}

// ===== NOTES PAGE =====
function initNotesPage() {
  requireAuth();
  loadNoteCategoryFilter();
  loadNotes();

  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('note-id').value;
    const body = {
      title: document.getElementById('note-title').value,
      content: document.getElementById('note-content-field').value,
      categoryId: parseInt(document.getElementById('note-category').value),
    };
    try {
      if (id) {
        await apiPut('/notes/' + id, body);
        showSuccess('Note updated');
      } else {
        await apiPost('/notes', body);
        showSuccess('Note created');
      }
      bootstrap.Modal.getInstance(document.getElementById('noteModal')).hide();
      loadNotes();
    } catch (err) {
      showError(err.message);
    }
  });

  document
    .getElementById('note-filter-apply')
    .addEventListener('click', loadNotes);
  document.getElementById('note-filter-clear').addEventListener('click', () => {
    document.getElementById('note-filter-category').value = '';
    document.getElementById('note-filter-search').value = '';
    document.getElementById('note-filter-pinned').checked = false;
    loadNotes();
  });
}

async function loadNoteCategoryFilter() {
  try {
    const cats = await apiGet('/categories');
    const filterSel = document.getElementById('note-filter-category');
    const noteSel = document.getElementById('note-category');
    const opts = cats
      .map((c) => `<option value="${c.id}">${esc(c.categoryName)}</option>`)
      .join('');
    filterSel.innerHTML = '<option value="">All Categories</option>' + opts;
    noteSel.innerHTML = '<option value="">Select category</option>' + opts;
  } catch (err) {
    showError(err.message);
  }
}

async function loadNotes() {
  try {
    const params = new URLSearchParams();
    const cat = document.getElementById('note-filter-category').value;
    const search = document.getElementById('note-filter-search').value;
    const pinned = document.getElementById('note-filter-pinned').checked;
    if (cat) params.set('category', cat);
    if (search) params.set('searchWord', search);
    if (pinned) params.set('pinned', 'true');

    const qs = params.toString() ? '?' + params.toString() : '';
    const notes = await apiGet('/notes' + qs);
    const tbody = document.getElementById('notes-tbody');
    if (!notes || notes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">No notes found.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = notes
      .map(
        (n) => `
            <tr>
                <td>${esc(n.title)}</td>
                <td><span class="text-truncate-100">${esc(n.content)}</span></td>
                <td>${esc(n.categoryName)}</td>
                <td><span class="pin-icon ${n.pinned ? 'active' : ''}" onclick="togglePin(${n.id})">&#128204;</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editNote(${n.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(${n.id})">Delete</button>
                </td>
            </tr>`,
      )
      .join('');
  } catch (err) {
    showError(err.message);
  }
}

async function togglePin(id) {
  try {
    await apiPatch('/notes/' + id + '/pin');
    loadNotes();
  } catch (err) {
    showError(err.message);
  }
}

async function editNote(id) {
  try {
    const n = await apiGet('/notes/' + id);
    document.getElementById('note-id').value = n.id;
    document.getElementById('note-title').value = n.title;
    document.getElementById('note-content-field').value = n.content;
    // Need to find categoryId - load categories and match by name
    const cats = await apiGet('/categories');
    const cat = cats.find((c) => c.categoryName === n.categoryName);
    if (cat) document.getElementById('note-category').value = cat.id;
    document.getElementById('noteModalLabel').textContent = 'Edit Note';
    new bootstrap.Modal(document.getElementById('noteModal')).show();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  try {
    await apiDelete('/notes/' + id);
    showSuccess('Note deleted');
    loadNotes();
  } catch (err) {
    showError(err.message);
  }
}

function openNewNoteModal() {
  document.getElementById('note-id').value = '';
  document.getElementById('note-form').reset();
  document.getElementById('noteModalLabel').textContent = 'New Note';
  new bootstrap.Modal(document.getElementById('noteModal')).show();
}

// ===== UTILITY =====
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
