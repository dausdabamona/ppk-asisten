const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

class PPKDatabase {
  constructor() {
    // Database location
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');
    
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'ppk.db');
    console.log('Database path:', dbPath);

    // Open database
    this.db = new Database(dbPath);
    
    // Performance optimizations
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');

    // Initialize schema
    this.initializeSchema();
    this.seedInitialData();
  }

  initializeSchema() {
    console.log('Initializing database schema...');

    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'ppk', 'ppspm', 'unit_head', 'operator')),
        unit TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      -- Procurement requests
      CREATE TABLE IF NOT EXISTS procurement_requests (
        id TEXT PRIMARY KEY,
        request_number TEXT UNIQUE NOT NULL,
        tier TEXT NOT NULL CHECK(tier IN ('tier1', 'tier2', 'tier3')),
        requester_id TEXT NOT NULL,
        unit TEXT NOT NULL,
        item_name TEXT NOT NULL,
        description TEXT,
        specifications TEXT,
        estimated_value REAL NOT NULL,
        budget_code TEXT NOT NULL,
        budget_source TEXT,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'rejected', 'completed')),
        current_step INTEGER DEFAULT 0,
        urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('normal', 'urgent', 'very_urgent')),
        target_date TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (requester_id) REFERENCES users(id)
      );

      -- Workflow approvals
      CREATE TABLE IF NOT EXISTS workflow_approvals (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        approver_role TEXT NOT NULL,
        approver_id TEXT,
        action TEXT CHECK(action IN ('approve', 'reject', 'revise')),
        comments TEXT,
        approved_at TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (request_id) REFERENCES procurement_requests(id),
        FOREIGN KEY (approver_id) REFERENCES users(id),
        UNIQUE(request_id, step_number)
      );

      -- Documents
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (request_id) REFERENCES procurement_requests(id)
      );

      -- Budget tracking
      CREATE TABLE IF NOT EXISTS budget_allocation (
        id TEXT PRIMARY KEY,
        budget_code TEXT UNIQUE NOT NULL,
        budget_name TEXT NOT NULL,
        total_allocation REAL NOT NULL,
        used_amount REAL DEFAULT 0,
        fiscal_year INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_requests_status ON procurement_requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_tier ON procurement_requests(tier);
      CREATE INDEX IF NOT EXISTS idx_requests_requester ON procurement_requests(requester_id);
      CREATE INDEX IF NOT EXISTS idx_requests_date ON procurement_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_approvals_request ON workflow_approvals(request_id);
      CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);
      CREATE INDEX IF NOT EXISTS idx_budget_code ON budget_allocation(budget_code);
    `;

    this.db.exec(schema);
    console.log('Schema initialized successfully');
  }

  seedInitialData() {
    // Check if data exists
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount.count === 0) {
      console.log('Seeding initial data...');
      
      // Create default admin user
      const adminId = uuidv4();
      this.db.prepare(`
        INSERT INTO users (id, email, password, name, role, unit)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        adminId,
        'admin@pkpsorong.ac.id',
        'admin123', // In production, use bcrypt hash
        'Administrator',
        'admin',
        'TU'
      );

      // Create sample budget
      this.db.prepare(`
        INSERT INTO budget_allocation (id, budget_code, budget_name, total_allocation, fiscal_year)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        '5211',
        'Belanja Barang Operasional',
        500000000,
        new Date().getFullYear()
      );

      console.log('Initial data seeded');
    }
  }

  // CRUD Operations
  createRequest(data) {
    const stmt = this.db.prepare(`
      INSERT INTO procurement_requests (
        id, request_number, tier, requester_id, unit, item_name,
        description, specifications, estimated_value, budget_code,
        budget_source, status, urgency, target_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = data.id || uuidv4();
    const requestNumber = data.request_number || this.generateRequestNumber(data.tier);

    const result = stmt.run(
      id,
      requestNumber,
      data.tier,
      data.requester_id,
      data.unit,
      data.item_name,
      data.description || null,
      data.specifications || null,
      data.estimated_value,
      data.budget_code,
      data.budget_source || null,
      data.status || 'draft',
      data.urgency || 'normal',
      data.target_date || null
    );

    return { id, request_number: requestNumber, changes: result.changes };
  }

  getRequests(filters = {}) {
    let query = 'SELECT * FROM procurement_requests WHERE 1=1';
    const params = [];

    if (filters.tier) {
      query += ' AND tier = ?';
      params.push(filters.tier);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.unit) {
      query += ' AND unit = ?';
      params.push(filters.unit);
    }

    if (filters.requester_id) {
      query += ' AND requester_id = ?';
      params.push(filters.requester_id);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getRequestById(id) {
    const stmt = this.db.prepare('SELECT * FROM procurement_requests WHERE id = ?');
    return stmt.get(id);
  }

  updateRequest(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const stmt = this.db.prepare(`
      UPDATE procurement_requests 
      SET ${setClause}, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    const result = stmt.run(...values, id);
    return { changes: result.changes };
  }

  deleteRequest(id) {
    const stmt = this.db.prepare('DELETE FROM procurement_requests WHERE id = ?');
    return stmt.run(id);
  }

  // Helper methods
  generateRequestNumber(tier) {
    const year = new Date().getFullYear();
    const prefix = tier.toUpperCase().replace('TIER', 'T');
    
    // Get count for this tier in current year
    const count = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM procurement_requests 
      WHERE tier = ? AND strftime('%Y', created_at) = ?
    `).get(tier, year.toString());

    const sequence = String(count.count + 1).padStart(3, '0');
    return `${prefix}/${year}/${sequence}`;
  }

  // Statistics
  getStats() {
    const stats = this.db.prepare(`
      SELECT 
        tier,
        status,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM procurement_requests
      GROUP BY tier, status
    `).all();

    return stats;
  }

  // Backup
  backup(backupPath) {
    if (!backupPath) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupDir = path.join(app.getPath('userData'), 'database', 'backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      backupPath = path.join(backupDir, `ppk-backup-${timestamp}.db`);
    }

    return this.db.backup(backupPath);
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Database closed');
    }
  }
}

module.exports = PPKDatabase;
