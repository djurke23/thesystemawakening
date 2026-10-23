import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'applications.json');

// Ensure local data file exists as fallback (only in local environments, not on serverless read-only disk)
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (_) {}
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('⚡ [SYSTEM] Connected to Supabase Cloud Database');
  } catch (err) {
    console.error('⚠ [SYSTEM] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ [SYSTEM] Running in local JSON storage mode (data/applications.json)');
}

export function isUsingSupabase() {
  return supabase !== null;
}

// Read all applications
export async function getAllApplications() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return readLocalFile();
      }

      // Map snake_case DB columns to camelCase for existing frontend
      return (data || []).map(row => ({
        id: row.id,
        discordUsername: row.discord_username,
        device: row.device,
        hunterPath: Array.isArray(row.hunter_path) ? row.hunter_path : (row.hunter_path ? JSON.parse(row.hunter_path) : []),
        activity: row.activity,
        reportBugs: Boolean(row.report_bugs),
        email: row.email || '',
        source: row.source,
        rank: row.rank || 'E-Rank Hunter',
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Supabase fetch exception:', err);
      return readLocalFile();
    }
  }

  return readLocalFile();
}

// Add a new application
export async function saveApplication(applicant) {
  if (supabase) {
    try {
      const dbRow = {
        id: applicant.id,
        discord_username: applicant.discordUsername,
        device: applicant.device,
        hunter_path: applicant.hunterPath,
        activity: applicant.activity,
        report_bugs: applicant.reportBugs,
        email: applicant.email || '',
        source: applicant.source,
        rank: applicant.rank || 'E-Rank Hunter',
        created_at: applicant.createdAt || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([dbRow])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        // Fallback to local file so user data is never lost
        saveLocalFile(applicant);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Supabase save exception:', err);
      saveLocalFile(applicant);
      return false;
    }
  }

  return saveLocalFile(applicant);
}

// Count remaining spots
export async function getApplicationsCount() {
  if (supabase) {
    try {
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return readLocalFile().length;
      }
      return count || 0;
    } catch (_) {
      return readLocalFile().length;
    }
  }

  return readLocalFile().length;
}

// Delete an application
export async function deleteApplication(id) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Supabase delete exception:', err);
      return false;
    }
  }

  try {
    let apps = readLocalFile();
    const len = apps.length;
    apps = apps.filter(a => a.id !== id);
    if (apps.length !== len) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Local delete error:', err);
    return false;
  }
}

// Local file helpers (fallback)
function readLocalFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error('Error reading local data file:', err);
    return [];
  }
}

function saveLocalFile(applicant) {
  if (process.env.VERCEL) return false;
  try {
    const apps = readLocalFile();
    apps.unshift(applicant);
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local data file:', err);
    return false;
  }
}
