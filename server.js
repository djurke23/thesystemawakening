import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  getAllApplications,
  saveApplication,
  getApplicationsCount,
  deleteApplication,
  findExistingApplicant,
  isUsingSupabase
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3030;
// No fallback: without ADMIN_SECRET (min 16 chars) the admin API stays locked
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const ADMIN_ENABLED = ADMIN_SECRET.length >= 16;
if (!ADMIN_ENABLED) {
  console.warn('⚠ [SYSTEM] ADMIN_SECRET is missing or shorter than 16 characters. Admin API is disabled.');
}

// Allowed answers (must match the options in public/index.html)
const DISCORD_USERNAME_RE = /^[a-z0-9._]{2,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_DEVICES = ['Android', 'iOS', 'Both'];
const ALLOWED_PATHS = ['Gym', 'Study', 'Work', 'Discipline', 'All'];
const ALLOWED_ACTIVITY = ['1-2h daily', '3-4h daily', 'Hardcore 5h+'];
const ALLOWED_SOURCES = ['Youtube', 'Tiktok', 'Reddit', 'Instagram', 'Other'];

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limiter per IP (best effort on serverless: resets on cold start)
function createRateLimiter({ windowMs, maxAttempts, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxAttempts) {
      return res.status(429).json({ error: message });
    }
    timestamps.push(now);
    hits.set(ip, timestamps);

    if (hits.size > 5000) {
      for (const [key, list] of hits) {
        if (list.every(t => now - t >= windowMs)) hits.delete(key);
      }
    }
    next();
  };
}

const applyRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  message: '⚠ [SYSTEM WARNING] Mana overload detected. Please wait 10 minutes before submitting again.'
});

const duplicateCheckRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 30,
  message: 'Too many checks. Please wait a few minutes.'
});

const adminLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  message: 'Too many login attempts. Please wait 15 minutes.'
});

function normalizeDiscord(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function isValidAdminSecret(candidate) {
  if (!ADMIN_ENABLED || typeof candidate !== 'string') return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(ADMIN_SECRET).digest();
  return crypto.timingSafeEqual(a, b);
}

function generateHunterId() {
  // 8 chars from an unambiguous alphabet (~10^12 combinations), no collisions in practice
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `HNTR-${code}`;
}

function duplicateMessage(field) {
  if (field === 'email') {
    return 'You have already applied! This backup email is already registered in the System archives.';
  }
  if (field === 'both') {
    return 'You have already applied! This Discord username and backup email are already registered in the System archives.';
  }
  return 'You have already applied! This Discord username is already registered in the System archives.';
}

// Helper to send Discord Webhook if configured
async function sendDiscordNotification(applicant) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;

  try {
    const embed = {
      title: '⚡ [SYSTEM NOTIFICATION] NEW FOUNDER HUNTER AWAKENED',
      description: `A new candidate has registered for **THE SYSTEM: AWAKENING** closed beta test phase.`,
      color: 0x00e5ff, // Neon Cyan
      fields: [
        { name: '🆔 Hunter Code', value: `\`${applicant.id}\``, inline: true },
        { name: '👤 Discord Username', value: `**${applicant.discordUsername}**`, inline: true },
        { name: '📱 Device Platform', value: applicant.device || 'N/A', inline: true },
        { name: '⚔️ Hunter Path', value: (applicant.hunterPath || []).join(', ') || 'None', inline: true },
        { name: '⏳ Daily Activity', value: applicant.activity || 'N/A', inline: true },
        { name: '🐛 Bug Reports', value: applicant.reportBugs ? '✅ Committed' : '❌ No', inline: true },
        { name: '📧 Backup Email', value: applicant.email || '*None provided*', inline: false },
        { name: '🌐 Source / Portal', value: applicant.source || 'Unknown', inline: true },
        { name: '📅 Timestamp', value: new Date(applicant.createdAt).toUTCString(), inline: true }
      ],
      footer: {
        text: 'THE SYSTEM: AWAKENING // Beta Recruitment Protocol'
      },
      timestamp: new Date().toISOString()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **New Hunter Application Received:** \`${applicant.discordUsername}\``,
        embeds: [embed]
      })
    });
  } catch (err) {
    console.error('Failed to trigger Discord webhook:', err.message);
  }
}

// Calculate summary stats
function calculateStats(apps) {
  const stats = {
    total: apps.length,
    byDevice: { Android: 0, iOS: 0, Both: 0, Other: 0 },
    byActivity: { '1-2h daily': 0, '3-4h daily': 0, 'Hardcore 5h+': 0 },
    bySource: {},
    byPath: { Gym: 0, Study: 0, Work: 0, Discipline: 0, All: 0 },
    bugHelpers: 0
  };

  apps.forEach(app => {
    // Device
    if (stats.byDevice[app.device] !== undefined) {
      stats.byDevice[app.device]++;
    } else {
      stats.byDevice.Other++;
    }

    // Activity
    if (stats.byActivity[app.activity] !== undefined) {
      stats.byActivity[app.activity]++;
    }

    // Bug reporters
    if (app.reportBugs) {
      stats.bugHelpers++;
    }

    // Source
    if (app.source) {
      stats.bySource[app.source] = (stats.bySource[app.source] || 0) + 1;
    }

    // Path
    if (Array.isArray(app.hunterPath)) {
      app.hunterPath.forEach(p => {
        if (stats.byPath[p] !== undefined) {
          stats.byPath[p]++;
        }
      });
    }
  });

  return stats;
}

// --- API ROUTES ---

// 0. Public Spots Counter
app.get('/api/spots', async (req, res) => {
  const count = await getApplicationsCount();
  const maxSpots = 100;
  const remaining = Math.max(0, maxSpots - count);
  return res.json({ remaining, total: count, maxSpots });
});

// 0.5. Real-time duplicate check for Discord or Backup Email
// Never returns stored data, only whether the value is taken
app.get('/api/check-duplicate', duplicateCheckRateLimiter, async (req, res) => {
  try {
    const discord = normalizeDiscord(req.query.discord);
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!DISCORD_USERNAME_RE.test(discord) && !EMAIL_RE.test(email)) {
      return res.json({ exists: false });
    }

    const duplicate = await findExistingApplicant({
      discordUsername: DISCORD_USERNAME_RE.test(discord) ? discord : '',
      email: EMAIL_RE.test(email) ? email : ''
    });

    if (duplicate) {
      return res.json({
        exists: true,
        field: duplicate.field,
        message: duplicateMessage(duplicate.field)
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.error('Error in /api/check-duplicate:', err);
    return res.json({ exists: false });
  }
});

// 1. Submit Application
app.post('/api/apply', applyRateLimiter, async (req, res) => {
  try {
    const {
      discordUsername,
      device,
      hunterPath,
      activity,
      reportBugs,
      email,
      source,
      system_trap_field
    } = req.body;

    // Honeypot check: If bot filled invisible trap field, pretend success and silently drop
    if (system_trap_field) {
      console.warn('🛡️ [SECURITY] Bot trap triggered and neutralized.');
      return res.status(201).json({
        success: true,
        message: 'APPLICATION REGISTERED IN SYSTEM ARCHIVES',
        hunter: { id: 'HNTR-VERIFIED', discordUsername: '@verified', device: '-', hunterPath: [], activity: '-' }
      });
    }

    // Validation (whitelists only, so nothing unexpected reaches the DB or the admin panel)
    const normDiscord = normalizeDiscord(discordUsername);
    if (!normDiscord) {
      return res.status(400).json({ error: 'Discord username is required.' });
    }
    if (!DISCORD_USERNAME_RE.test(normDiscord)) {
      return res.status(400).json({ error: 'Invalid Discord username (2-32 characters: letters, numbers, . and _).' });
    }

    if (!ALLOWED_DEVICES.includes(device)) {
      return res.status(400).json({ error: 'Device selection is required.' });
    }

    const cleanPaths = Array.isArray(hunterPath)
      ? [...new Set(hunterPath.filter(p => ALLOWED_PATHS.includes(p)))]
      : [];
    if (cleanPaths.length === 0) {
      return res.status(400).json({ error: 'At least one Hunter Path must be selected.' });
    }

    if (!ALLOWED_ACTIVITY.includes(activity)) {
      return res.status(400).json({ error: 'Activity level is required.' });
    }

    if (reportBugs !== true) {
      return res.status(400).json({ error: 'Bug reporting confirmation is required.' });
    }

    const sourceList = Array.isArray(source) ? source : [source];
    const cleanSources = [...new Set(sourceList.filter(s => ALLOWED_SOURCES.includes(s)))];
    if (cleanSources.length === 0) {
      return res.status(400).json({ error: 'Please select how you found us.' });
    }
    const cleanSource = cleanSources.join(', ');

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (cleanEmail && (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail))) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const cleanDiscord = '@' + normDiscord;

    // Check for duplicate Discord username or backup email
    const duplicate = await findExistingApplicant({
      discordUsername: cleanDiscord,
      email: cleanEmail
    });

    if (duplicate) {
      const duplicateMsg = duplicateMessage(duplicate.field);
      return res.status(409).json({
        success: false,
        duplicate: true,
        field: duplicate.field,
        error: `⚠ [SYSTEM NOTICE] ALREADY REGISTERED // ${duplicateMsg}`,
        message: duplicateMsg
      });
    }

    const applicant = {
      id: generateHunterId(),
      discordUsername: cleanDiscord,
      device,
      hunterPath: cleanPaths,
      activity,
      reportBugs: true,
      email: cleanEmail,
      source: cleanSource,
      rank: 'E-Rank Hunter',
      createdAt: new Date().toISOString()
    };

    const saved = await saveApplication(applicant);
    if (!saved) {
      // Don't tell the user they're registered if nothing was stored
      return res.status(500).json({ error: 'The System could not save your application. Please try again in a minute.' });
    }

    // Fire Discord notification non-blocking
    sendDiscordNotification(applicant).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'APPLICATION REGISTERED IN SYSTEM ARCHIVES',
      hunter: applicant
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    return res.status(500).json({ error: 'Internal system error occurred.' });
  }
});

// 2. Admin Check / Login
app.post('/api/admin/verify', adminLoginRateLimiter, (req, res) => {
  const { secret } = req.body || {};
  if (isValidAdminSecret(secret)) {
    return res.json({ success: true, authorized: true });
  }
  return res.status(401).json({ error: 'Access denied: Invalid Hunter Admin key.' });
});

// Middleware for Admin Authorization (header only, never in the URL)
function checkAdminAuth(req, res, next) {
  if (isValidAdminSecret(req.headers['x-admin-key'])) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret' });
}

// 3. Get Applications and Stats (Admin only)
app.get('/api/applications', checkAdminAuth, async (req, res) => {
  const apps = await getAllApplications();
  const stats = calculateStats(apps);
  return res.json({
    success: true,
    total: apps.length,
    applications: apps,
    stats,
    databaseMode: isUsingSupabase() ? 'Supabase Cloud' : 'Local JSON'
  });
});

// 4. Export CSV (Admin only)
app.get('/api/export-csv', checkAdminAuth, async (req, res) => {
  const apps = await getAllApplications();

  // Helper to escape CSV cell (and neutralize Excel formula injection)
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-\t\r]/.test(str) || (str.startsWith('@') && !/^@[a-z0-9._]+$/i.test(str))) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = [
    'Hunter ID',
    'Date Submitted',
    'Discord Username',
    'Device',
    'Hunter Path',
    'Daily Activity',
    'Report Bugs',
    'Backup Email',
    'Found Us Via'
  ];

  const rows = apps.map(a => [
    escapeCsv(a.id),
    escapeCsv(new Date(a.createdAt).toLocaleString()),
    escapeCsv(a.discordUsername),
    escapeCsv(a.device),
    escapeCsv((a.hunterPath || []).join('; ')),
    escapeCsv(a.activity),
    escapeCsv(a.reportBugs ? 'Yes' : 'No'),
    escapeCsv(a.email),
    escapeCsv(a.source)
  ]);

  // UTF-8 BOM (\uFEFF) ensures Excel opens special characters and formatting without glitches
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="the_system_founder_hunters.csv"');
  return res.send(csvContent);
});

// 5. Delete an applicant (Admin only)
app.delete('/api/applications/:id', checkAdminAuth, async (req, res) => {
  const { id } = req.params;
  const ok = await deleteApplication(id);

  if (!ok) {
    return res.status(404).json({ error: 'Applicant ID not found or could not be removed.' });
  }

  return res.json({ success: true, message: `Applicant ${id} removed.` });
});

// Export default app for Vercel serverless usage
export default app;

// Start Server locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`⚔️  THE SYSTEM: AWAKENING - Survey Server`);
    console.log(`🌐  Survey Form: http://localhost:${PORT}`);
    console.log(`🛡️  Admin Dashboard: http://localhost:${PORT}/admin.html`);
    console.log(`🔑  Admin API: ${ADMIN_ENABLED ? 'enabled' : 'DISABLED (set ADMIN_SECRET, 16+ chars)'}`);
    console.log(`💾  Storage: ${isUsingSupabase() ? 'Supabase Database' : 'Local JSON File'}`);
    console.log(`===============================================`);
  });
}
