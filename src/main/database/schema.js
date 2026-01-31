/**
 * Database Schema Definition
 * Contains all SQL schema, indexes, and triggers for PPK Asisten
 */

// Database version for migrations
const DB_VERSION = 4;

// Main schema SQL
const SCHEMA_SQL = `
  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    applied_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

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

  -- Vendors table
  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    npwp TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_account_name TEXT,
    performance_rating REAL DEFAULT 0 CHECK(performance_rating >= 0 AND performance_rating <= 5),
    is_active INTEGER DEFAULT 1,
    notes TEXT,
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
    quantity INTEGER DEFAULT 1,
    estimated_value REAL NOT NULL CHECK(estimated_value > 0),
    budget_code TEXT NOT NULL,
    budget_source TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
    current_step INTEGER DEFAULT 0,
    urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('normal', 'urgent', 'very_urgent')),
    target_date TEXT,
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT
  );

  -- Contracts table
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    contract_number TEXT UNIQUE NOT NULL,
    vendor_id TEXT NOT NULL,
    contract_value REAL NOT NULL CHECK(contract_value > 0),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer', 'cheque', 'termin')),
    payment_terms TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed', 'terminated', 'expired')),
    signed_date TEXT,
    signed_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
    FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Payments table
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    payment_number TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_date TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
    payment_method TEXT,
    reference_number TEXT,
    processed_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(contract_id, payment_number)
  );

  -- Attachments table
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    contract_id TEXT,
    payment_id TEXT,
    file_type TEXT NOT NULL CHECK(file_type IN ('proposal', 'quotation', 'invoice', 'receipt', 'contract', 'report', 'photo', 'other')),
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CHECK (
      (request_id IS NOT NULL AND contract_id IS NULL AND payment_id IS NULL) OR
      (request_id IS NULL AND contract_id IS NOT NULL AND payment_id IS NULL) OR
      (request_id IS NULL AND contract_id IS NULL AND payment_id IS NOT NULL)
    )
  );

  -- Generated documents table
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    contract_id TEXT,
    doc_type TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  -- Workflow approvals
  CREATE TABLE IF NOT EXISTS workflow_approvals (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    approver_id TEXT,
    action TEXT CHECK(action IN ('approve', 'reject', 'revise', 'pending')),
    comments TEXT,
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(request_id, step_number)
  );

  -- Budget tracking
  CREATE TABLE IF NOT EXISTS budget_allocation (
    id TEXT PRIMARY KEY,
    budget_code TEXT UNIQUE NOT NULL,
    budget_name TEXT NOT NULL,
    total_allocation REAL NOT NULL CHECK(total_allocation >= 0),
    used_amount REAL DEFAULT 0 CHECK(used_amount >= 0),
    reserved_amount REAL DEFAULT 0 CHECK(reserved_amount >= 0),
    fiscal_year INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    CHECK(used_amount + reserved_amount <= total_allocation)
  );

  -- Audit log table
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values TEXT,
    new_values TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now', 'localtime')),
    ip_address TEXT
  );

  -- Backup history
  CREATE TABLE IF NOT EXISTS backup_history (
    id TEXT PRIMARY KEY,
    backup_path TEXT NOT NULL,
    backup_size INTEGER,
    backup_type TEXT DEFAULT 'manual' CHECK(backup_type IN ('manual', 'scheduled', 'pre_migration')),
    status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'deleted')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    notes TEXT
  );
`;

// Indexes SQL
const INDEXES_SQL = `
  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_requests_status ON procurement_requests(status);
  CREATE INDEX IF NOT EXISTS idx_requests_tier ON procurement_requests(tier);
  CREATE INDEX IF NOT EXISTS idx_requests_requester ON procurement_requests(requester_id);
  CREATE INDEX IF NOT EXISTS idx_requests_date ON procurement_requests(created_at);
  CREATE INDEX IF NOT EXISTS idx_requests_unit ON procurement_requests(unit);

  CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
  CREATE INDEX IF NOT EXISTS idx_vendors_npwp ON vendors(npwp);
  CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

  CREATE INDEX IF NOT EXISTS idx_contracts_request ON contracts(request_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
  CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);

  CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

  CREATE INDEX IF NOT EXISTS idx_attachments_request ON attachments(request_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_contract ON attachments(contract_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_payment ON attachments(payment_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(file_type);

  CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);
  CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
  CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);

  CREATE INDEX IF NOT EXISTS idx_approvals_request ON workflow_approvals(request_id);
  CREATE INDEX IF NOT EXISTS idx_budget_code ON budget_allocation(budget_code);
  CREATE INDEX IF NOT EXISTS idx_budget_year ON budget_allocation(fiscal_year);

  CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
  CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(record_id);
  CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(changed_at);
`;

// Triggers SQL
const TRIGGERS_SQL = `
  -- Trigger: Validate tier1 request value (< 10 million)
  CREATE TRIGGER IF NOT EXISTS validate_tier1_value
  BEFORE INSERT ON procurement_requests
  WHEN NEW.tier = 'tier1' AND NEW.estimated_value >= 10000000
  BEGIN
    SELECT RAISE(ABORT, 'Tier 1 requests must have estimated_value < 10,000,000');
  END;

  -- Trigger: Validate tier2 request value (10-50 million)
  CREATE TRIGGER IF NOT EXISTS validate_tier2_value
  BEFORE INSERT ON procurement_requests
  WHEN NEW.tier = 'tier2' AND (NEW.estimated_value < 10000000 OR NEW.estimated_value >= 50000000)
  BEGIN
    SELECT RAISE(ABORT, 'Tier 2 requests must have estimated_value between 10,000,000 and 50,000,000');
  END;

  -- Trigger: Validate tier3 request value (>= 50 million)
  CREATE TRIGGER IF NOT EXISTS validate_tier3_value
  BEFORE INSERT ON procurement_requests
  WHEN NEW.tier = 'tier3' AND NEW.estimated_value < 50000000
  BEGIN
    SELECT RAISE(ABORT, 'Tier 3 requests must have estimated_value >= 50,000,000');
  END;

  -- Trigger: Update tier1 validation on update
  CREATE TRIGGER IF NOT EXISTS validate_tier1_value_update
  BEFORE UPDATE ON procurement_requests
  WHEN NEW.tier = 'tier1' AND NEW.estimated_value >= 10000000
  BEGIN
    SELECT RAISE(ABORT, 'Tier 1 requests must have estimated_value < 10,000,000');
  END;

  -- Trigger: Validate contract dates
  CREATE TRIGGER IF NOT EXISTS validate_contract_dates
  BEFORE INSERT ON contracts
  WHEN NEW.end_date < NEW.start_date
  BEGIN
    SELECT RAISE(ABORT, 'Contract end_date must be after start_date');
  END;

  -- Trigger: Validate contract dates on update
  CREATE TRIGGER IF NOT EXISTS validate_contract_dates_update
  BEFORE UPDATE ON contracts
  WHEN NEW.end_date < NEW.start_date
  BEGIN
    SELECT RAISE(ABORT, 'Contract end_date must be after start_date');
  END;

  -- Trigger: Validate total payments don't exceed contract value
  CREATE TRIGGER IF NOT EXISTS validate_payment_total
  BEFORE INSERT ON payments
  BEGIN
    SELECT CASE
      WHEN (
        SELECT COALESCE(SUM(amount), 0) + NEW.amount
        FROM payments
        WHERE contract_id = NEW.contract_id AND status != 'cancelled'
      ) > (
        SELECT contract_value FROM contracts WHERE id = NEW.contract_id
      )
      THEN RAISE(ABORT, 'Total payments cannot exceed contract value')
    END;
  END;

  -- Trigger: Update request status when all approvals complete
  CREATE TRIGGER IF NOT EXISTS update_request_on_approval
  AFTER UPDATE ON workflow_approvals
  WHEN NEW.action = 'approve'
  BEGIN
    UPDATE procurement_requests
    SET status = 'approved',
        updated_at = datetime('now', 'localtime')
    WHERE id = NEW.request_id
    AND NOT EXISTS (
      SELECT 1 FROM workflow_approvals
      WHERE request_id = NEW.request_id
      AND (action IS NULL OR action = 'pending')
    );
  END;

  -- Trigger: Update request status on rejection
  CREATE TRIGGER IF NOT EXISTS update_request_on_rejection
  AFTER UPDATE ON workflow_approvals
  WHEN NEW.action = 'reject'
  BEGIN
    UPDATE procurement_requests
    SET status = 'rejected',
        updated_at = datetime('now', 'localtime')
    WHERE id = NEW.request_id;
  END;

  -- Trigger: Auto-update updated_at timestamp for requests
  CREATE TRIGGER IF NOT EXISTS update_request_timestamp
  AFTER UPDATE ON procurement_requests
  BEGIN
    UPDATE procurement_requests
    SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
  END;

  -- Trigger: Auto-update updated_at timestamp for vendors
  CREATE TRIGGER IF NOT EXISTS update_vendor_timestamp
  AFTER UPDATE ON vendors
  BEGIN
    UPDATE vendors
    SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
  END;

  -- Trigger: Auto-update updated_at timestamp for contracts
  CREATE TRIGGER IF NOT EXISTS update_contract_timestamp
  AFTER UPDATE ON contracts
  BEGIN
    UPDATE contracts
    SET updated_at = datetime('now', 'localtime')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
  END;

  -- Trigger: Validate vendor rating range
  CREATE TRIGGER IF NOT EXISTS validate_vendor_rating
  BEFORE UPDATE ON vendors
  WHEN NEW.performance_rating < 0 OR NEW.performance_rating > 5
  BEGIN
    SELECT RAISE(ABORT, 'Vendor performance_rating must be between 0 and 5');
  END;

  -- Trigger: Prevent deletion of vendors with active contracts
  CREATE TRIGGER IF NOT EXISTS prevent_vendor_delete
  BEFORE DELETE ON vendors
  WHEN EXISTS (SELECT 1 FROM contracts WHERE vendor_id = OLD.id AND status IN ('draft', 'active'))
  BEGIN
    SELECT RAISE(ABORT, 'Cannot delete vendor with active or draft contracts');
  END;

  -- Trigger: Validate NPWP format (15 digits)
  CREATE TRIGGER IF NOT EXISTS validate_npwp_format
  BEFORE INSERT ON vendors
  WHEN NEW.npwp IS NOT NULL AND LENGTH(REPLACE(REPLACE(NEW.npwp, '.', ''), '-', '')) != 15
  BEGIN
    SELECT RAISE(ABORT, 'NPWP must be 15 digits');
  END;
`;

// Initial seed data
const SEED_DATA = {
  budgetCodes: [
    { code: '5211', name: 'Belanja Barang Operasional', amount: 500000000 },
    { code: '5212', name: 'Belanja Barang Non Operasional', amount: 300000000 },
    { code: '5221', name: 'Belanja Jasa', amount: 200000000 },
    { code: '5231', name: 'Belanja Pemeliharaan', amount: 150000000 },
    { code: '5311', name: 'Belanja Modal Peralatan', amount: 400000000 }
  ],
  defaultAdmin: {
    email: 'admin@pkpsorong.ac.id',
    password: 'admin123', // In production, use bcrypt hash
    name: 'Administrator',
    role: 'admin',
    unit: 'TU'
  }
};

module.exports = {
  DB_VERSION,
  SCHEMA_SQL,
  INDEXES_SQL,
  TRIGGERS_SQL,
  SEED_DATA
};
