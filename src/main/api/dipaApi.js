/**
 * DIPA (Daftar Isian Pelaksanaan Anggaran) API
 * 
 * Handles CRUD operations for DIPA budget data
 */

const { v4: uuidv4 } = require('uuid');
const { ipcMain } = require('electron');

class DipaApi {
  constructor(database) {
    this.db = database.db;
    this.registerHandlers();
  }

  /**
   * List all DIPA records with pagination and filtering
   */
  list(options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        tahun_anggaran,
        kdsatker,
        kode_program,
        kode_kegiatan,
        sortBy = 'created_at', 
        sortOrder = 'DESC' 
      } = options;

      const allowedSortColumns = ['tahun_anggaran', 'kode_program', 'kode_kegiatan', 'total', 'created_at'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const order = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'DESC';

      // Build WHERE clause
      const conditions = [];
      const params = [];

      if (tahun_anggaran) {
        conditions.push('tahun_anggaran = ?');
        params.push(tahun_anggaran);
      }
      if (kdsatker) {
        conditions.push('kdsatker = ?');
        params.push(kdsatker);
      }
      if (kode_program) {
        conditions.push('kode_program = ?');
        params.push(kode_program);
      }
      if (kode_kegiatan) {
        conditions.push('kode_kegiatan = ?');
        params.push(kode_kegiatan);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM dipa ${whereClause}`;
      const countResult = this.db.prepare(countQuery).get(...params);
      const total = countResult.count;

      // Get paginated results
      const query = `
        SELECT * FROM dipa 
        ${whereClause}
        ORDER BY ${sortColumn} ${order}
        LIMIT ? OFFSET ?
      `;

      const data = this.db.prepare(query).all(...params, limit, offset);
      return {
        success: true,
        data,
        total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error listing DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get DIPA by ID
   */
  get(id) {
    try {
      const data = this.db.prepare('SELECT * FROM dipa WHERE id = ?').get(id);
      if (!data) {
        return { success: false, error: 'DIPA not found' };
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error getting DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get DIPA summary by tahun anggaran
   */
  getSummaryByTahun(tahun) {
    try {
      const query = `
        SELECT 
          kode_program,
          kode_kegiatan,
          SUM(total) as total_pagu,
          SUM(realisasi_jan + realisasi_feb + realisasi_mar + realisasi_apr + 
              realisasi_mei + realisasi_jun + realisasi_jul + realisasi_agt + 
              realisasi_sep + realisasi_okt + realisasi_nov + realisasi_des) as total_realisasi,
          COUNT(*) as jumlah_item
        FROM dipa
        WHERE tahun_anggaran = ?
        GROUP BY kode_program, kode_kegiatan
      `;
      
      const data = this.db.prepare(query).all(tahun);
      return { success: true, data };
    } catch (error) {
      console.error('Error getting DIPA summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new DIPA record
   */
  create(data) {
    try {
      const id = uuidv4();
      
      const stmt = this.db.prepare(`
        INSERT INTO dipa (
          id, tahun_anggaran, nomor_dipa, tanggal_dipa, kdsatker,
          kode_program, kode_kegiatan, kode_output, kode_suboutput,
          kode_komponen, kode_subkomponen, kode_akun, uraian_item,
          volume, satuan, harga_satuan, total,
          jan, feb, mar, apr, mei, jun, jul, agt, sep, okt, nov, des
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      stmt.run(
        id,
        data.tahun_anggaran,
        data.nomor_dipa || null,
        data.tanggal_dipa || null,
        data.kdsatker || null,
        data.kode_program || null,
        data.kode_kegiatan || null,
        data.kode_output || null,
        data.kode_suboutput || null,
        data.kode_komponen || null,
        data.kode_subkomponen || null,
        data.kode_akun || null,
        data.uraian_item || null,
        data.volume || null,
        data.satuan || null,
        data.harga_satuan || null,
        data.total || null,
        data.jan || 0,
        data.feb || 0,
        data.mar || 0,
        data.apr || 0,
        data.mei || 0,
        data.jun || 0,
        data.jul || 0,
        data.agt || 0,
        data.sep || 0,
        data.okt || 0,
        data.nov || 0,
        data.des || 0
      );

      return this.get(id);
    } catch (error) {
      console.error('Error creating DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update DIPA record
   */
  update(id, data) {
    try {
      const existing = this.db.prepare('SELECT id FROM dipa WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: 'DIPA not found' };
      }

      const updates = [];
      const values = [];

      // Build dynamic update query
      const fields = [
        'tahun_anggaran', 'nomor_dipa', 'tanggal_dipa', 'kdsatker',
        'kode_program', 'kode_kegiatan', 'kode_output', 'kode_suboutput',
        'kode_komponen', 'kode_subkomponen', 'kode_akun', 'uraian_item',
        'volume', 'satuan', 'harga_satuan', 'total',
        'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agt', 'sep', 'okt', 'nov', 'des',
        'realisasi_jan', 'realisasi_feb', 'realisasi_mar', 'realisasi_apr',
        'realisasi_mei', 'realisasi_jun', 'realisasi_jul', 'realisasi_agt',
        'realisasi_sep', 'realisasi_okt', 'realisasi_nov', 'realisasi_des',
        'sisa_pagu', 'catatan'
      ];

      fields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(data[field]);
        }
      });

      if (updates.length === 0) {
        return this.get(id);
      }

      updates.push('updated_at = datetime("now", "localtime")');
      values.push(id);

      const stmt = this.db.prepare(`UPDATE dipa SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      return this.get(id);
    } catch (error) {
      console.error('Error updating DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete DIPA record
   */
  delete(id) {
    try {
      const existing = this.db.prepare('SELECT id FROM dipa WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: 'DIPA not found' };
      }

      this.db.prepare('DELETE FROM dipa WHERE id = ?').run(id);
      return { success: true, message: 'DIPA deleted successfully' };
    } catch (error) {
      console.error('Error deleting DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import CSV data (bulk insert)
   */
  importCsv(csvData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO dipa (
          id, tahun_anggaran, nomor_dipa, tanggal_dipa, kdsatker,
          kode_program, kode_kegiatan, kode_output, kode_suboutput,
          kode_komponen, kode_subkomponen, kode_akun, uraian_item,
          volume, satuan, harga_satuan, total,
          jan, feb, mar, apr, mei, jun, jul, agt, sep, okt, nov, des
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      let imported = 0;
      let skipped = 0;

      const insertMany = this.db.transaction((items) => {
        for (const item of items) {
          try {
            stmt.run(
              uuidv4(),
              item.tahun_anggaran || new Date().getFullYear(),
              item.nomor_dipa || null,
              item.tanggal_dipa || null,
              item.kdsatker || null,
              item.kode_program || null,
              item.kode_kegiatan || null,
              item.kode_output || null,
              item.kode_suboutput || null,
              item.kode_komponen || null,
              item.kode_subkomponen || null,
              item.kode_akun || null,
              item.uraian_item || null,
              item.volume || null,
              item.satuan || null,
              item.harga_satuan || null,
              item.total || null,
              item.jan || 0,
              item.feb || 0,
              item.mar || 0,
              item.apr || 0,
              item.mei || 0,
              item.jun || 0,
              item.jul || 0,
              item.agt || 0,
              item.sep || 0,
              item.okt || 0,
              item.nov || 0,
              item.des || 0
            );
            imported++;
          } catch (err) {
            console.error('Error inserting DIPA item:', err.message);
            skipped++;
          }
        }
      });

      insertMany(csvData);

      return {
        success: true,
        imported,
        skipped,
        total: csvData.length
      };
    } catch (error) {
      console.error('Error importing DIPA CSV:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export to CSV format
   */
  exportCsv(filters = {}) {
    try {
      const { tahun_anggaran, kdsatker } = filters;
      
      const conditions = [];
      const params = [];

      if (tahun_anggaran) {
        conditions.push('tahun_anggaran = ?');
        params.push(tahun_anggaran);
      }
      if (kdsatker) {
        conditions.push('kdsatker = ?');
        params.push(kdsatker);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const data = this.db.prepare(`SELECT * FROM dipa ${whereClause} ORDER BY kode_program, kode_kegiatan`).all(...params);

      return { success: true, data };
    } catch (error) {
      console.error('Error exporting DIPA:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register IPC handlers
   */
  registerHandlers() {
    ipcMain.handle('dipa:list', (event, options) => this.list(options));
    ipcMain.handle('dipa:get', (event, id) => this.get(id));
    ipcMain.handle('dipa:get-summary', (event, tahun) => this.getSummaryByTahun(tahun));
    ipcMain.handle('dipa:create', (event, data) => this.create(data));
    ipcMain.handle('dipa:update', (event, { id, data }) => this.update(id, data));
    ipcMain.handle('dipa:delete', (event, id) => this.delete(id));
    ipcMain.handle('dipa:import-csv', (event, csvData) => this.importCsv(csvData));
    ipcMain.handle('dipa:export-csv', (event, filters) => this.exportCsv(filters));
  }
}

module.exports = DipaApi;
