/**
 * Mobile Database Service
 * Uses Capacitor SQLite for offline-first data storage
 * Provides the same interface as Electron IPC for seamless migration
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class MobileDatabase {
  constructor() {
    this.sqlite = null;
    this.db = null;
    this.dbName = 'ppk_assistant';
    this.isInitialized = false;
    this.platform = Capacitor.getPlatform();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);

      // Check connection consistency (for web)
      if (this.platform === 'web') {
        await this.sqlite.initWebStore();
      }

      // Create/open database
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;

      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();

      this.isInitialized = true;
      console.log('Mobile database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mobile database:', error);
      throw error;
    }
  }

  async createTables() {
    // Sync metadata table - tracks sync status
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        last_sync DATETIME,
        sync_version INTEGER DEFAULT 0,
        UNIQUE(table_name)
      );
    `);

    // Sync queue - stores pending changes to sync
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0,
        sync_error TEXT,
        retry_count INTEGER DEFAULT 0
      );
    `);

    // Satker table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS satker (
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
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    // Pegawai table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS pegawai (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nip TEXT UNIQUE NOT NULL,
        nama TEXT NOT NULL,
        gelar_depan TEXT,
        gelar_belakang TEXT,
        tempat_lahir TEXT,
        tanggal_lahir DATE,
        jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')),
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
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    // DIPA table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS dipa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tahun INTEGER NOT NULL,
        nomor_dipa TEXT,
        tanggal_dipa DATE,
        satker_id INTEGER,
        total_pagu REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    // DIPA Item table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS dipa_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dipa_id INTEGER REFERENCES dipa(id) ON DELETE CASCADE,
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
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    // Surat Tugas table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS surat_tugas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomor TEXT UNIQUE,
        jenis TEXT NOT NULL CHECK(jenis IN ('DALAM_KOTA', 'LUAR_KOTA', 'LUAR_PROVINSI')),
        tanggal_dibuat DATE NOT NULL,
        dibuat_oleh_id INTEGER REFERENCES pegawai(id),
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
        dipa_item_id INTEGER REFERENCES dipa_item(id),
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
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    // Surat Tugas Pelaksana table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS surat_tugas_pelaksana (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        surat_tugas_id INTEGER REFERENCES surat_tugas(id) ON DELETE CASCADE,
        pegawai_id INTEGER REFERENCES pegawai(id),
        urutan INTEGER,
        is_ketua INTEGER DEFAULT 0,
        uang_harian REAL DEFAULT 0,
        penginapan REAL DEFAULT 0,
        transport REAL DEFAULT 0,
        transport_lokal REAL DEFAULT 0,
        representasi REAL DEFAULT 0,
        total_biaya REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        _synced INTEGER DEFAULT 0,
        _server_id INTEGER
      );
    `);

    console.log('Mobile database tables created');
  }

  // Generic CRUD operations

  async query(sql, params = []) {
    await this.ensureInitialized();
    try {
      const result = await this.db.query(sql, params);
      return { success: true, data: result.values || [] };
    } catch (error) {
      console.error('Query error:', error);
      return { success: false, error: error.message };
    }
  }

  async run(sql, params = []) {
    await this.ensureInitialized();
    try {
      const result = await this.db.run(sql, params);
      return {
        success: true,
        data: {
          lastInsertRowid: result.changes?.lastId,
          changes: result.changes?.changes
        }
      };
    } catch (error) {
      console.error('Run error:', error);
      return { success: false, error: error.message };
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Add to sync queue
  async queueSync(tableName, recordId, action, data = null) {
    await this.run(
      `INSERT INTO sync_queue (table_name, record_id, action, data) VALUES (?, ?, ?, ?)`,
      [tableName, recordId, action, data ? JSON.stringify(data) : null]
    );
  }

  // Get pending sync items
  async getPendingSyncs() {
    return await this.query(
      `SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`
    );
  }

  // Mark sync item as completed
  async markSynced(syncId) {
    await this.run(
      `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
      [syncId]
    );
  }

  // Mark sync item as failed
  async markSyncFailed(syncId, error) {
    await this.run(
      `UPDATE sync_queue SET sync_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [error, syncId]
    );
  }

  // Clean up old synced items
  async cleanupSyncQueue() {
    await this.run(
      `DELETE FROM sync_queue WHERE synced = 1 AND created_at < datetime('now', '-7 days')`
    );
  }

  // Close database connection
  async close() {
    if (this.db) {
      await this.sqlite.closeConnection(this.dbName, false);
      this.isInitialized = false;
    }
  }
}

// Singleton instance
const mobileDatabase = new MobileDatabase();

export default mobileDatabase;
export { MobileDatabase };
