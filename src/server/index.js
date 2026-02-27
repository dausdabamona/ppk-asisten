/**
 * PPK Assistant Sync Server
 * Backend server for mobile app synchronization
 *
 * Features:
 * - REST API for CRUD operations
 * - Sync endpoints for push/pull
 * - Auto-update distribution
 * - SQLite database (can be upgraded to PostgreSQL)
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ppk-assistant-secret-key-change-in-production';

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/ppk_server.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// JWT Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nama TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sync log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      device_id TEXT,
      action TEXT,
      table_name TEXT,
      record_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT
    );
  `);

  // Create all main tables with sync support
  const tables = [
    `CREATE TABLE IF NOT EXISTS satker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      alamat TEXT,
      telepon TEXT,
      email TEXT,
      kepala_satker TEXT,
      nip_kepala TEXT,
      ppk TEXT,
      nip_ppk TEXT,
      bendahara TEXT,
      nip_bendahara TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS pegawai (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nip TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      gelar_depan TEXT,
      gelar_belakang TEXT,
      tempat_lahir TEXT,
      tanggal_lahir DATE,
      jenis_kelamin TEXT,
      golongan TEXT,
      eselon TEXT,
      jabatan TEXT,
      nama_jabatan TEXT,
      unit_kerja TEXT,
      email TEXT,
      telepon TEXT,
      alamat TEXT,
      npwp TEXT,
      nama_bank TEXT,
      nomor_rekening TEXT,
      nama_rekening TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS dipa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tahun INTEGER NOT NULL,
      nomor_dipa TEXT,
      tanggal_dipa DATE,
      satker_id INTEGER,
      total_pagu REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS dipa_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dipa_id INTEGER,
      kode_output TEXT,
      nama_output TEXT,
      kode_komponen TEXT,
      nama_komponen TEXT,
      kode_sub_komponen TEXT,
      nama_sub_komponen TEXT,
      kode_akun TEXT,
      nama_akun TEXT,
      mak TEXT,
      uraian TEXT,
      volume REAL,
      satuan TEXT,
      harga_satuan REAL,
      jumlah REAL,
      sisa REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS surat_tugas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor TEXT UNIQUE,
      jenis TEXT NOT NULL,
      tanggal_dibuat DATE NOT NULL,
      dibuat_oleh_id INTEGER,
      jenis_dasar TEXT,
      nomor_dasar TEXT,
      tanggal_dasar DATE,
      perihal_dasar TEXT,
      maksud_tujuan TEXT NOT NULL,
      kategori_tujuan TEXT,
      hasil_diharapkan TEXT,
      kota_asal TEXT DEFAULT 'Sorong',
      kota_tujuan TEXT NOT NULL,
      provinsi_tujuan TEXT,
      tingkat_kota TEXT,
      tanggal_berangkat DATE NOT NULL,
      tanggal_kembali DATE NOT NULL,
      lama_hari INTEGER,
      dipa_item_id INTEGER,
      metode_biaya TEXT DEFAULT 'LUMPSUM',
      total_biaya REAL DEFAULT 0,
      uang_muka REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      tanggal_kembali_aktual DATE,
      ringkasan_hasil TEXT,
      tindak_lanjut TEXT,
      selisih_biaya REAL DEFAULT 0,
      status_selisih TEXT,
      tanggal_bayar DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`,

    `CREATE TABLE IF NOT EXISTS surat_tugas_pelaksana (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surat_tugas_id INTEGER,
      pegawai_id INTEGER,
      urutan INTEGER,
      is_ketua INTEGER DEFAULT 0,
      uang_harian REAL DEFAULT 0,
      penginapan REAL DEFAULT 0,
      transport REAL DEFAULT 0,
      transport_lokal REAL DEFAULT 0,
      representasi REAL DEFAULT 0,
      total_biaya REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    )`
  ];

  tables.forEach(sql => db.exec(sql));

  // Create indexes for better sync performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_satker_updated ON satker(updated_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pegawai_updated ON pegawai(updated_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_dipa_updated ON dipa(updated_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_surat_tugas_updated ON surat_tugas(updated_at)`);

  console.log('Database initialized');
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // For demo, simple password check
  // In production, use bcrypt
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user || user.password_hash !== password) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role
      }
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, nama } = req.body;

  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash, nama) VALUES (?, ?, ?)');
    const result = stmt.run(username, password, nama);

    res.json({
      success: true,
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ==================== SYNC ROUTES ====================

// Push changes from mobile to server
app.post('/api/sync/push', authenticate, (req, res) => {
  const { table, recordId, action, data, timestamp } = req.body;

  try {
    if (action === 'DELETE') {
      // Soft delete
      db.prepare(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(recordId);
    } else if (action === 'INSERT') {
      // Insert new record
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(k => data[k]);

      const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
      const result = stmt.run(...values);

      // Return the server ID for the mobile app to store
      return res.json({
        success: true,
        data: { serverId: result.lastInsertRowid }
      });
    } else if (action === 'UPDATE') {
      // Check for conflicts
      const existing = db.prepare(`SELECT updated_at FROM ${table} WHERE id = ?`).get(recordId);

      if (existing && new Date(existing.updated_at) > new Date(timestamp)) {
        // Conflict - server has newer data
        return res.json({
          success: false,
          conflict: true,
          serverData: db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId)
        });
      }

      // Update
      const columns = Object.keys(data);
      const setClauses = columns.map(k => `${k} = ?`).join(', ');
      const values = [...columns.map(k => data[k]), recordId];

      db.prepare(`UPDATE ${table} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    }

    // Log sync action
    db.prepare(`
      INSERT INTO sync_log (user_id, action, table_name, record_id, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, action, table, recordId, req.ip);

    res.json({ success: true });
  } catch (error) {
    console.error('Sync push error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pull changes from server to mobile
app.get('/api/sync/pull/:table', authenticate, (req, res) => {
  const { table } = req.params;
  const { since } = req.query;

  try {
    let sql = `SELECT * FROM ${table} WHERE deleted_at IS NULL`;
    const params = [];

    if (since) {
      sql += ` AND updated_at > ?`;
      params.push(since);
    }

    sql += ` ORDER BY updated_at ASC`;

    const rows = db.prepare(sql).all(...params);

    // Also include deleted records if syncing incrementally
    let deleted = [];
    if (since) {
      deleted = db.prepare(`
        SELECT id FROM ${table} WHERE deleted_at > ?
      `).all(since);
    }

    res.json({
      success: true,
      data: [
        ...rows.map(row => ({ action: 'UPSERT', id: row.id, data: row })),
        ...deleted.map(row => ({ action: 'DELETE', id: row.id }))
      ]
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CRUD ROUTES ====================

// Generic CRUD factory
function createCrudRoutes(tableName, options = {}) {
  const router = express.Router();

  // List
  router.get('/', authenticate, (req, res) => {
    try {
      const { page = 1, limit = 20, search, ...filters } = req.query;
      const offset = (page - 1) * limit;

      let sql = `SELECT * FROM ${tableName} WHERE deleted_at IS NULL`;
      const params = [];

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          sql += ` AND ${key} = ?`;
          params.push(value);
        }
      }

      // Search
      if (search && options.searchFields) {
        const searchConditions = options.searchFields.map(f => `${f} LIKE ?`).join(' OR ');
        sql += ` AND (${searchConditions})`;
        options.searchFields.forEach(() => params.push(`%${search}%`));
      }

      sql += ` ORDER BY ${options.orderBy || 'created_at DESC'}`;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const rows = db.prepare(sql).all(...params);

      // Count
      let countSql = `SELECT COUNT(*) as total FROM ${tableName} WHERE deleted_at IS NULL`;
      const countResult = db.prepare(countSql).get();

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get by ID
  router.get('/:id', authenticate, (req, res) => {
    try {
      const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? AND deleted_at IS NULL`).get(req.params.id);

      if (!row) {
        return res.status(404).json({ success: false, error: 'Not found' });
      }

      res.json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create
  router.post('/', authenticate, (req, res) => {
    try {
      const data = req.body;
      const columns = Object.keys(data);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(k => data[k]);

      const stmt = db.prepare(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`);
      const result = stmt.run(...values);

      res.json({
        success: true,
        data: { id: result.lastInsertRowid, ...data }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update
  router.put('/:id', authenticate, (req, res) => {
    try {
      const data = req.body;
      const columns = Object.keys(data);
      const setClauses = columns.map(k => `${k} = ?`).join(', ');
      const values = [...columns.map(k => data[k]), req.params.id];

      db.prepare(`UPDATE ${tableName} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

      res.json({ success: true, data: { id: req.params.id, ...data } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete
  router.delete('/:id', authenticate, (req, res) => {
    try {
      db.prepare(`UPDATE ${tableName} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

// Mount CRUD routes
app.use('/api/satker', createCrudRoutes('satker', { searchFields: ['kode', 'nama'] }));
app.use('/api/pegawai', createCrudRoutes('pegawai', { searchFields: ['nip', 'nama'] }));
app.use('/api/dipa', createCrudRoutes('dipa', { searchFields: ['nomor_dipa'] }));
app.use('/api/dipa-item', createCrudRoutes('dipa_item', { searchFields: ['mak', 'uraian'] }));
app.use('/api/surat-tugas', createCrudRoutes('surat_tugas', { searchFields: ['nomor', 'kota_tujuan'] }));

// ==================== APP UPDATE ROUTES ====================

// Get latest app version
app.get('/api/app/version', (req, res) => {
  const apkDir = path.join(__dirname, '../../releases');

  if (!fs.existsSync(apkDir)) {
    return res.json({
      success: true,
      data: { version: '0.0.0', available: false }
    });
  }

  // Find latest APK
  const files = fs.readdirSync(apkDir)
    .filter(f => f.endsWith('.apk'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return res.json({
      success: true,
      data: { version: '0.0.0', available: false }
    });
  }

  // Extract version from filename (e.g., ppk-assistant-1.2.3.apk)
  const match = files[0].match(/(\d+\.\d+\.\d+)/);
  const version = match ? match[1] : '1.0.0';

  res.json({
    success: true,
    data: {
      version,
      available: true,
      filename: files[0],
      downloadUrl: `/api/app/download/${files[0]}`
    }
  });
});

// Download APK
app.get('/api/app/download/:filename', (req, res) => {
  const filepath = path.join(__dirname, '../../releases', req.params.filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  res.download(filepath);
});

// ==================== START SERVER ====================

initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PPK Assistant Sync Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
