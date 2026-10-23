/* ==========================================================================
   THE SYSTEM: AWAKENING - Admin Controller
   ========================================================================== */

let applicantsData = [];
let currentSecret = localStorage.getItem('system_admin_key') || '';

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('admin-login-form');
const secretInput = document.getElementById('admin-secret-input');
const logoutBtn = document.getElementById('logout-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const copyDiscordBtn = document.getElementById('copy-discord-btn');
const searchInput = document.getElementById('table-search');
const tbody = document.getElementById('applicant-tbody');
const emptyState = document.getElementById('table-empty');

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const secret = secretInput.value.trim();
  if (!secret) return;

  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret })
    });

    if (res.ok) {
      currentSecret = secret;
      localStorage.setItem('system_admin_key', secret);
      showDashboard();
    } else {
      alert('Access Denied: Invalid Secret Key.');
    }
  } catch (err) {
    alert(`System Error: ${err.message}`);
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  currentSecret = '';
  localStorage.removeItem('system_admin_key');
  dashboardView.style.display = 'none';
  loginView.style.display = 'block';
  secretInput.value = '';
});

// Export CSV
exportCsvBtn.addEventListener('click', () => {
  window.location.href = `/api/export-csv?secret=${encodeURIComponent(currentSecret)}`;
});

// Copy all Discord usernames for bulk role assignment
copyDiscordBtn.addEventListener('click', () => {
  if (applicantsData.length === 0) {
    alert('No applicants in roster to copy.');
    return;
  }

  const usernames = applicantsData.map(a => a.discordUsername).join(', ');
  navigator.clipboard.writeText(usernames)
    .then(() => {
      const origText = copyDiscordBtn.innerHTML;
      copyDiscordBtn.innerHTML = `✅ <span>COPIED ${applicantsData.length} USERNAMES!</span>`;
      setTimeout(() => {
        copyDiscordBtn.innerHTML = origText;
      }, 2500);
    })
    .catch(() => alert('Failed to copy to clipboard.'));
});

// Search filter
searchInput.addEventListener('input', () => {
  renderTable();
});

// Delete Applicant
async function deleteApplicant(id) {
  if (!confirm(`Are you sure you want to remove hunter ${id}?`)) return;

  try {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': currentSecret }
    });

    if (res.ok) {
      applicantsData = applicantsData.filter(a => a.id !== id);
      fetchApplications();
    } else {
      alert('Failed to delete applicant.');
    }
  } catch (err) {
    alert(`System Error: ${err.message}`);
  }
}

// Render Table
function renderTable() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = applicantsData.filter(a => {
    return (
      a.discordUsername.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query) ||
      a.device.toLowerCase().includes(query) ||
      (a.source && a.source.toLowerCase().includes(query)) ||
      (a.email && a.email.toLowerCase().includes(query))
    );
  });

  document.getElementById('roster-count').textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = filtered.map(a => {
    const pathsHtml = (a.hunterPath || []).map(p => `<span class="badge-path">${p}</span>`).join('');
    const dateFormatted = new Date(a.createdAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--cyan-primary);">${a.id}</td>
        <td style="font-weight: 600; color: #fff;">${a.discordUsername}</td>
        <td><span class="badge-device">${a.device}</span></td>
        <td>${pathsHtml}</td>
        <td><span class="badge-activity">${a.activity}</span></td>
        <td style="color: ${a.reportBugs ? 'var(--neon-green)' : 'var(--text-dim)'};">${a.reportBugs ? '✓ Yes' : 'No'}</td>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${a.email || '-'}</td>
        <td style="font-weight: 600; color: #bdefff;">${a.source || '-'}</td>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim);">${dateFormatted}</td>
        <td>
          <button type="button" class="delete-action-btn" title="Delete Candidate" onclick="deleteApplicant('${a.id}')">
            🗑
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Fetch Applications & Stats
async function fetchApplications() {
  try {
    const res = await fetch('/api/applications', {
      headers: { 'x-admin-key': currentSecret }
    });

    if (!res.ok) {
      logoutBtn.click();
      return;
    }

    const data = await res.json();
    applicantsData = data.applications || [];
    const stats = data.stats;

    // Update stats cards
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-device').innerHTML = `
      <span style="color:#00e5ff">Android: ${stats.byDevice.Android || 0}</span> | 
      <span style="color:#a855f7">iOS: ${stats.byDevice.iOS || 0}</span> | 
      <span style="color:#00ff88">Both: ${stats.byDevice.Both || 0}</span>
    `;
    document.getElementById('stat-hardcore').textContent = stats.byActivity['Hardcore 5h+'] || 0;
    document.getElementById('stat-bug-helpers').textContent = stats.bugHelpers || 0;

    renderTable();
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

// Show Dashboard
function showDashboard() {
  loginView.style.display = 'none';
  dashboardView.style.display = 'block';
  fetchApplications();
}

// Init Check
document.addEventListener('DOMContentLoaded', async () => {
  if (currentSecret) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: currentSecret })
      });
      if (res.ok) {
        showDashboard();
        return;
      }
    } catch (_) {}
  }
  loginView.style.display = 'block';
  dashboardView.style.display = 'none';
});

// Global reference for onclick delete
window.deleteApplicant = deleteApplicant;
