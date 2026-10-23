import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  getAllApplications,
  saveApplication,
  getApplicationsCount,
  deleteApplication,
  isUsingSupabase
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3030;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'hunter2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory anti-spam rate limiter for submissions (5 attempts per 10 mins per IP)
const ipSubmissionTimestamps = new Map();

function applyRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = 5;

  const timestamps = (ipSubmissionTimestamps.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxAttempts) {
    return res.status(429).json({
      error: '⚠ [SYSTEM WARNING] Mana overload detected. Please wait 10 minutes before submitting again.'
    });
  }
  timestamps.push(now);
  ipSubmissionTimestamps.set(ip, timestamps);
  next();
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
        hunter: { id: 'HNTR-BOT-DEFENSE', discordUsername: '@verified' }
      });
    }

    // Validation
    if (!discordUsername || typeof discordUsername !== 'string' || !discordUsername.trim()) {
      return res.status(400).json({ error: 'Discord username is required.' });
    }

    if (!device || typeof device !== 'string') {
      return res.status(400).json({ error: 'Device selection is required.' });
    }

    if (!Array.isArray(hunterPath) || hunterPath.length === 0) {
      return res.status(400).json({ error: 'At least one Hunter Path must be selected.' });
    }

    if (!activity || typeof activity !== 'string') {
      return res.status(400).json({ error: 'Activity level is required.' });
    }

    // Source can be array or string
    let cleanSource = '';
    if (Array.isArray(source)) {
      if (source.length === 0) {
        return res.status(400).json({ error: 'Please select how you found us.' });
      }
      cleanSource = source.map(s => String(s).trim()).join(', ');
    } else if (typeof source === 'string' && source.trim()) {
      cleanSource = source.trim();
    } else {
      return res.status(400).json({ error: 'Please select how you found us.' });
    }

    // Format discord username
    let cleanDiscord = discordUsername.trim();
    if (!cleanDiscord.startsWith('@')) {
      cleanDiscord = '@' + cleanDiscord;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const applicant = {
      id: `HNTR-${randomCode}`,
      discordUsername: cleanDiscord,
      device: device.trim(),
      hunterPath: hunterPath.map(p => String(p).trim()),
      activity: activity.trim(),
      reportBugs: Boolean(reportBugs),
      email: email ? String(email).trim() : '',
      source: cleanSource,
      rank: 'E-Rank Hunter',
      createdAt: new Date().toISOString()
    };

    await saveApplication(applicant);

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
app.post('/api/admin/verify', (req, res) => {
  const { secret } = req.body;
  if (secret === ADMIN_SECRET) {
    return res.json({ success: true, authorized: true });
  }
  return res.status(401).json({ error: 'Access denied: Invalid Hunter Admin key.' });
});

// Middleware for Admin Authorization
function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['x-admin-key'] || req.query.secret;
  if (authHeader && authHeader === ADMIN_SECRET) {
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

  // Helper to escape CSV cell
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
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
    console.log(`🔑  Admin Key: ${ADMIN_SECRET}`);
    console.log(`💾  Storage: ${isUsingSupabase() ? 'Supabase Database' : 'Local JSON File'}`);
    console.log(`===============================================`);
  });
}
