const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');

class PegawaiApi {
  constructor(database) {
    this.db = database;
    this.registerHandlers();
  }

  registerHandlers() {
    ipcMain.handle('pegawai:list', (event, options = {}) => this.list(options));
    ipcMain.handle('pegawai:get', (event, id) => this.get(id));
    ipcMain.handle('pegawai:get-by-nip', (event, nip) => this.getByNip(nip));
    ipcMain.handle('pegawai:create', (event, data) => this.create(data));
    ipcMain.handle('pegawai:update', (event, id, data) => this.update(id, data));
    ipcMain.handle('pegawai:delete', (event, id) => this.delete(id));
    ipcMain.handle('pegawai:search', (event, query) => this.search(query));
    ipcMain.handle('pegawai:import-csv', (event, csvData) => this.importCsv(csvData));
    ipcMain.handle('pegawai:export-csv', (event) => this.exportCsv());
  }

  list(options = {}) {
    try {
      const { limit = 100, offset = 0, sortBy = 'nama', sortOrder = 'ASC' } = options;

      const query = `
        SELECT * FROM pegawai
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;

      const pegawai = this.db.db.prepare(query).all(limit, offset);

      const countResult = this.db.db.prepare('SELECT COUNT(*) as total FROM pegawai').get();

      return {
        success: true,
        data: pegawai,
        total: countResult.total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error listing pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  get(id) {
    try {
      const pegawai = this.db.db
        .prepare('SELECT * FROM pegawai WHERE id = ?')
        .get(id);

      if (!pegawai) {
        return { success: false, error: 'Pegawai tidak ditemukan' };
      }

      return { success: true, data: pegawai };
    } catch (error) {
      console.error('Error getting pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  getByNip(nip) {
    try {
      const pegawai = this.db.db
        .prepare('SELECT * FROM pegawai WHERE nip = ?')
        .get(nip);

      if (!pegawai) {
        return { success: false, error: 'Pegawai tidak ditemukan' };
      }

      return { success: true, data: pegawai };
    } catch (error) {
      console.error('Error getting pegawai by NIP:', error);
      return { success: false, error: error.message };
    }
  }

  create(data) {
    try {
      if (!data.nip || !data.nama) {
        return { success: false, error: 'NIP dan Nama wajib diisi' };
      }

      // Check if NIP already exists
      const existing = this.db.db
        .prepare('SELECT id FROM pegawai WHERE nip = ?')
        .get(data.nip);

      if (existing) {
        return { success: false, error: 'NIP sudah terdaftar' };
      }

      const id = uuidv4();
      const stmt = this.db.db.prepare(`
        INSERT INTO pegawai (
          id, nip, nama, jabatan, golongan, pangkat, rekening, bank, unitKerja
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.nip,
        data.nama,
        data.jabatan || null,
        data.golongan || null,
        data.pangkat || null,
        data.rekening || null,
        data.bank || null,
        data.unitKerja || null
      );

      return {
        success: true,
        data: { id, ...data }
      };
    } catch (error) {
      console.error('Error creating pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  update(id, data) {
    try {
      const existing = this.db.db
        .prepare('SELECT * FROM pegawai WHERE id = ?')
        .get(id);

      if (!existing) {
        return { success: false, error: 'Pegawai tidak ditemukan' };
      }

      // Check if new NIP conflicts (if NIP is being updated)
      if (data.nip && data.nip !== existing.nip) {
        const conflict = this.db.db
          .prepare('SELECT id FROM pegawai WHERE nip = ?')
          .get(data.nip);
        if (conflict) {
          return { success: false, error: 'NIP sudah terdaftar' };
        }
      }

      const updates = [];
      const values = [];

      if (data.nip !== undefined) {
        updates.push('nip = ?');
        values.push(data.nip);
      }
      if (data.nama !== undefined) {
        updates.push('nama = ?');
        values.push(data.nama);
      }
      if (data.jabatan !== undefined) {
        updates.push('jabatan = ?');
        values.push(data.jabatan);
      }
      if (data.golongan !== undefined) {
        updates.push('golongan = ?');
        values.push(data.golongan);
      }
      if (data.pangkat !== undefined) {
        updates.push('pangkat = ?');
        values.push(data.pangkat);
      }
      if (data.rekening !== undefined) {
        updates.push('rekening = ?');
        values.push(data.rekening);
      }
      if (data.bank !== undefined) {
        updates.push('bank = ?');
        values.push(data.bank);
      }
      if (data.unitKerja !== undefined) {
        updates.push('unitKerja = ?');
        values.push(data.unitKerja);
      }

      if (updates.length === 0) {
        return { success: true, data: existing };
      }

      updates.push('updated_at = datetime("now", "localtime")');
      values.push(id);

      const query = `UPDATE pegawai SET ${updates.join(', ')} WHERE id = ?`;
      this.db.db.prepare(query).run(...values);

      const updated = this.db.db
        .prepare('SELECT * FROM pegawai WHERE id = ?')
        .get(id);

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  delete(id) {
    try {
      const existing = this.db.db
        .prepare('SELECT * FROM pegawai WHERE id = ?')
        .get(id);

      if (!existing) {
        return { success: false, error: 'Pegawai tidak ditemukan' };
      }

      this.db.db.prepare('DELETE FROM pegawai WHERE id = ?').run(id);

      return { success: true, message: 'Pegawai berhasil dihapus' };
    } catch (error) {
      console.error('Error deleting pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  search(query) {
    try {
      const searchTerm = `%${query}%`;

      const results = this.db.db.prepare(`
        SELECT * FROM pegawai
        WHERE nip LIKE ? OR nama LIKE ? OR jabatan LIKE ? OR unitKerja LIKE ?
        ORDER BY nama ASC
        LIMIT 50
      `).all(searchTerm, searchTerm, searchTerm, searchTerm);

      return {
        success: true,
        data: results,
        count: results.length
      };
    } catch (error) {
      console.error('Error searching pegawai:', error);
      return { success: false, error: error.message };
    }
  }

  importCsv(csvData) {
    try {
      if (!Array.isArray(csvData)) {
        return { success: false, error: 'Data harus berupa array' };
      }

      const stmt = this.db.db.prepare(`
        INSERT OR IGNORE INTO pegawai (
          id, nip, nama, jabatan, golongan, pangkat, rekening, bank, unitKerja
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let imported = 0;
      let skipped = 0;

      for (const row of csvData) {
        if (!row.nip || !row.nama) {
          skipped += 1;
          continue;
        }

        const result = stmt.run(
          uuidv4(),
          row.nip,
          row.nama,
          row.jabatan || null,
          row.golongan || null,
          row.pangkat || null,
          row.rekening || null,
          row.bank || null,
          row.unitKerja || null
        );

        if (result.changes > 0) {
          imported += 1;
        } else {
          skipped += 1;
        }
      }

      return {
        success: true,
        imported,
        skipped,
        total: csvData.length
      };
    } catch (error) {
      console.error('Error importing pegawai CSV:', error);
      return { success: false, error: error.message };
    }
  }

  exportCsv() {
    try {
      const pegawai = this.db.db
        .prepare('SELECT nip, nama, jabatan, golongan, pangkat, rekening, bank, unitKerja FROM pegawai ORDER BY nama')
        .all();

      // Create CSV content
      const headers = ['nip', 'nama', 'jabatan', 'golongan', 'pangkat', 'rekening', 'bank', 'unitKerja'];
      let csv = headers.join(';') + '\n';

      for (const row of pegawai) {
        const values = headers.map(h => {
          const val = row[h] || '';
          // Escape quotes and wrap if contains comma or semicolon
          return typeof val === 'string' && (val.includes(';') || val.includes(',') || val.includes('"'))
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        });
        csv += values.join(';') + '\n';
      }

      return {
        success: true,
        data: csv,
        filename: `pegawai_${new Date().toISOString().split('T')[0]}.csv`
      };
    } catch (error) {
      console.error('Error exporting pegawai CSV:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PegawaiApi;
