/**
 * Satker (Work Unit) API
 * 
 * Handles CRUD operations for satker (satuan kerja) with official assignments
 * Officials include: KPA, PPK, PPSPM, Bendahara
 */

const { v4: uuidv4 } = require('uuid');
const { ipcMain } = require('electron');

class SatkerApi {
  constructor(database) {
    this.db = database.db;
    this.registerHandlers();
  }

  /**
   * List all satker with pagination
   */
  list(options = {}) {
    try {
      const { limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'DESC' } = options;
      const allowedSortColumns = ['nama', 'kode_satker', 'created_at', 'updated_at'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'DESC';

      // Get total count
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM satker').get();
      const total = countResult.count;

      // Get paginated results
      const query = `
        SELECT 
          s.id, s.kode_satker, s.nama, s.npwp, s.alamat, s.kota,
          s.kpa_nip, s.ppk_nip, s.ppspm_nip, s.bendahara_nip,
          s.created_at, s.updated_at,
          kpa.nama as kpa_nama, kpa.jabatan as kpa_jabatan,
          ppk.nama as ppk_nama, ppk.jabatan as ppk_jabatan,
          ppspm.nama as ppspm_nama, ppspm.jabatan as ppspm_jabatan,
          bendahara.nama as bendahara_nama, bendahara.jabatan as bendahara_jabatan
        FROM satker s
        LEFT JOIN pegawai kpa ON s.kpa_nip = kpa.nip
        LEFT JOIN pegawai ppk ON s.ppk_nip = ppk.nip
        LEFT JOIN pegawai ppspm ON s.ppspm_nip = ppspm.nip
        LEFT JOIN pegawai bendahara ON s.bendahara_nip = bendahara.nip
        ORDER BY ${sortColumn} ${order}
        LIMIT ? OFFSET ?
      `;

      const data = this.db.prepare(query).all(limit, offset);
      return {
        success: true,
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error listing satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get satker by ID
   */
  get(id) {
    try {
      const query = `
        SELECT 
          s.id, s.kode_satker, s.nama, s.npwp, s.alamat, s.kota,
          s.kpa_nip, s.ppk_nip, s.ppspm_nip, s.bendahara_nip,
          s.created_at, s.updated_at,
          kpa.nama as kpa_nama, kpa.jabatan as kpa_jabatan,
          ppk.nama as ppk_nama, ppk.jabatan as ppk_jabatan,
          ppspm.nama as ppspm_nama, ppspm.jabatan as ppspm_jabatan,
          bendahara.nama as bendahara_nama, bendahara.jabatan as bendahara_jabatan
        FROM satker s
        LEFT JOIN pegawai kpa ON s.kpa_nip = kpa.nip
        LEFT JOIN pegawai ppk ON s.ppk_nip = ppk.nip
        LEFT JOIN pegawai ppspm ON s.ppspm_nip = ppspm.nip
        LEFT JOIN pegawai bendahara ON s.bendahara_nip = bendahara.nip
        WHERE s.id = ?
      `;

      const data = this.db.prepare(query).get(id);
      if (!data) {
        return { success: false, error: 'Satker not found' };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error getting satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get satker by kode_satker
   */
  getByKode(kode) {
    try {
      const query = `
        SELECT 
          s.id, s.kode_satker, s.nama, s.npwp, s.alamat, s.kota,
          s.kpa_nip, s.ppk_nip, s.ppspm_nip, s.bendahara_nip,
          s.created_at, s.updated_at,
          kpa.nama as kpa_nama, kpa.jabatan as kpa_jabatan,
          ppk.nama as ppk_nama, ppk.jabatan as ppk_jabatan,
          ppspm.nama as ppspm_nama, ppspm.jabatan as ppspm_jabatan,
          bendahara.nama as bendahara_nama, bendahara.jabatan as bendahara_jabatan
        FROM satker s
        LEFT JOIN pegawai kpa ON s.kpa_nip = kpa.nip
        LEFT JOIN pegawai ppk ON s.ppk_nip = ppk.nip
        LEFT JOIN pegawai ppspm ON s.ppspm_nip = ppspm.nip
        LEFT JOIN pegawai bendahara ON s.bendahara_nip = bendahara.nip
        WHERE s.kode_satker = ?
      `;

      const data = this.db.prepare(query).get(kode);
      if (!data) {
        return { success: false, error: 'Satker not found' };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error getting satker by kode:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new satker
   */
  create(data) {
    try {
      const { kode_satker, nama, npwp, alamat, kota, kpa_nip, ppk_nip, ppspm_nip, bendahara_nip } = data;

      if (!kode_satker || !nama) {
        return { success: false, error: 'kode_satker and nama are required' };
      }

      // Check if kode_satker already exists
      const existing = this.db.prepare('SELECT id FROM satker WHERE kode_satker = ?').get(kode_satker);
      if (existing) {
        return { success: false, error: 'kode_satker already exists' };
      }

      // Validate NIPs if provided
      const validateNip = (nip) => {
        if (!nip) return true;
        const pegawai = this.db.prepare('SELECT id FROM pegawai WHERE nip = ?').get(nip);
        return !!pegawai;
      };

      if (!validateNip(kpa_nip) || !validateNip(ppk_nip) || !validateNip(ppspm_nip) || !validateNip(bendahara_nip)) {
        return { success: false, error: 'One or more NIPs not found in pegawai data' };
      }

      const id = uuidv4();
      const stmt = this.db.prepare(`
        INSERT INTO satker (id, kode_satker, nama, npwp, alamat, kota, kpa_nip, ppk_nip, ppspm_nip, bendahara_nip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, kode_satker, nama, npwp || null, alamat || null, kota || null, 
               kpa_nip || null, ppk_nip || null, ppspm_nip || null, bendahara_nip || null);

      return this.get(id);
    } catch (error) {
      console.error('Error creating satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update satker
   */
  update(id, data) {
    try {
      // Check if satker exists
      const existing = this.db.prepare('SELECT id FROM satker WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: 'Satker not found' };
      }

      const { kode_satker, nama, npwp, alamat, kota, kpa_nip, ppk_nip, ppspm_nip, bendahara_nip } = data;

      // If kode_satker is being changed, check uniqueness
      if (kode_satker) {
        const duplicate = this.db.prepare('SELECT id FROM satker WHERE kode_satker = ? AND id != ?').get(kode_satker, id);
        if (duplicate) {
          return { success: false, error: 'kode_satker already exists' };
        }
      }

      // Validate NIPs if provided
      const validateNip = (nip) => {
        if (!nip) return true;
        const pegawai = this.db.prepare('SELECT id FROM pegawai WHERE nip = ?').get(nip);
        return !!pegawai;
      };

      if (!validateNip(kpa_nip) || !validateNip(ppk_nip) || !validateNip(ppspm_nip) || !validateNip(bendahara_nip)) {
        return { success: false, error: 'One or more NIPs not found in pegawai data' };
      }

      const updates = [];
      const values = [];

      if (kode_satker !== undefined) { updates.push('kode_satker = ?'); values.push(kode_satker); }
      if (nama !== undefined) { updates.push('nama = ?'); values.push(nama); }
      if (npwp !== undefined) { updates.push('npwp = ?'); values.push(npwp || null); }
      if (alamat !== undefined) { updates.push('alamat = ?'); values.push(alamat || null); }
      if (kota !== undefined) { updates.push('kota = ?'); values.push(kota || null); }
      if (kpa_nip !== undefined) { updates.push('kpa_nip = ?'); values.push(kpa_nip || null); }
      if (ppk_nip !== undefined) { updates.push('ppk_nip = ?'); values.push(ppk_nip || null); }
      if (ppspm_nip !== undefined) { updates.push('ppspm_nip = ?'); values.push(ppspm_nip || null); }
      if (bendahara_nip !== undefined) { updates.push('bendahara_nip = ?'); values.push(bendahara_nip || null); }

      if (updates.length === 0) {
        return this.get(id);
      }

      updates.push('updated_at = datetime("now", "localtime")');
      values.push(id);

      const stmt = this.db.prepare(`UPDATE satker SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      return this.get(id);
    } catch (error) {
      console.error('Error updating satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete satker
   */
  delete(id) {
    try {
      const existing = this.db.prepare('SELECT id FROM satker WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: 'Satker not found' };
      }

      this.db.prepare('DELETE FROM satker WHERE id = ?').run(id);
      return { success: true, message: 'Satker deleted successfully' };
    } catch (error) {
      console.error('Error deleting satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search satker by name or kode
   */
  search(query) {
    try {
      const searchQuery = `
        SELECT 
          s.id, s.kode_satker, s.nama, s.npwp, s.alamat, s.kota,
          s.kpa_nip, s.ppk_nip, s.ppspm_nip, s.bendahara_nip,
          s.created_at, s.updated_at,
          kpa.nama as kpa_nama, kpa.jabatan as kpa_jabatan,
          ppk.nama as ppk_nama, ppk.jabatan as ppk_jabatan,
          ppspm.nama as ppspm_nama, ppspm.jabatan as ppspm_jabatan,
          bendahara.nama as bendahara_nama, bendahara.jabatan as bendahara_jabatan
        FROM satker s
        LEFT JOIN pegawai kpa ON s.kpa_nip = kpa.nip
        LEFT JOIN pegawai ppk ON s.ppk_nip = ppk.nip
        LEFT JOIN pegawai ppspm ON s.ppspm_nip = ppspm.nip
        LEFT JOIN pegawai bendahara ON s.bendahara_nip = bendahara.nip
        WHERE s.nama LIKE ? OR s.kode_satker LIKE ?
      `;

      const searchPattern = `%${query}%`;
      const data = this.db.prepare(searchQuery).all(searchPattern, searchPattern);
      return { success: true, data };
    } catch (error) {
      console.error('Error searching satker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all available pegawai for official selection
   */
  getAvailablePegawai() {
    try {
      const query = `
        SELECT id, nip, nama, jabatan, golongan, pangkat, bank, rekening
        FROM pegawai
        ORDER BY nama ASC
      `;

      const data = this.db.prepare(query).all();
      return { success: true, data };
    } catch (error) {
      console.error('Error getting available pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set official for satker
   */
  setOfficial(satker_id, officialType, nip) {
    try {
      const validTypes = ['kpa', 'ppk', 'ppspm', 'bendahara'];
      if (!validTypes.includes(officialType)) {
        return { success: false, error: 'Invalid official type' };
      }

      // Check if satker exists
      const existing = this.db.prepare('SELECT id FROM satker WHERE id = ?').get(satker_id);
      if (!existing) {
        return { success: false, error: 'Satker not found' };
      }

      // Validate NIP
      if (nip) {
        const pegawai = this.db.prepare('SELECT id FROM pegawai WHERE nip = ?').get(nip);
        if (!pegawai) {
          return { success: false, error: 'Pegawai not found' };
        }
      }

      const columnName = `${officialType}_nip`;
      const stmt = this.db.prepare(`UPDATE satker SET ${columnName} = ?, updated_at = datetime("now", "localtime") WHERE id = ?`);
      stmt.run(nip || null, satker_id);

      return this.get(satker_id);
    } catch (error) {
      console.error('Error setting official:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register IPC handlers
   */
  registerHandlers() {
    ipcMain.handle('satker:list', (event, options) => this.list(options));
    ipcMain.handle('satker:get', (event, id) => this.get(id));
    ipcMain.handle('satker:get-by-kode', (event, kode) => this.getByKode(kode));
    ipcMain.handle('satker:create', (event, data) => this.create(data));
    ipcMain.handle('satker:update', (event, { id, data }) => this.update(id, data));
    ipcMain.handle('satker:delete', (event, id) => this.delete(id));
    ipcMain.handle('satker:search', (event, query) => this.search(query));
    ipcMain.handle('satker:get-available-pegawai', (event) => this.getAvailablePegawai());
    ipcMain.handle('satker:set-official', (event, { satker_id, officialType, nip }) => this.setOfficial(satker_id, officialType, nip));
  }
}

module.exports = SatkerApi;
