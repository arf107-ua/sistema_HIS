import { isUniqueDocumentViolation } from './sqliteErrors.js';

export function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    hcCode: row.hc_code,
    documentType: row.document_type,
    documentNumber: row.document_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date ?? null,
    sex: row.sex ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    insuranceNumber: row.insurance_number,
    insurerName: row.insurer_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createPatientRepository(db) {
  const selectByDoc = () =>
    db.prepare('SELECT * FROM patients WHERE document_normalized = ?');
  const selectByHc = () =>
    db.prepare('SELECT * FROM patients WHERE hc_code = ?');
  const selectById = () => db.prepare('SELECT * FROM patients WHERE id = ?');

  return {
    findByNormalizedDocument(documentNormalized) {
      return mapRow(selectByDoc().get(documentNormalized));
    },

    findByHcCode(hcCode) {
      return mapRow(selectByHc().get(hcCode));
    },

    findById(id) {
      return mapRow(selectById().get(id));
    },

    findAll() {
      return db.prepare('SELECT * FROM patients ORDER BY first_name ASC').all().map(mapRow);
    },

    insert(data) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(
          "UPDATE sequences SET value = value + 1 WHERE name = 'hc_code'"
        ).run();
        const { value } = db
          .prepare("SELECT value FROM sequences WHERE name = 'hc_code'")
          .get();
        const hcCode = `HC-${String(value).padStart(6, '0')}`;

        db.prepare(
          `INSERT INTO patients (
            id, hc_code, document_type, document_number, document_normalized,
            first_name, last_name, birth_date, sex, phone, email, address,
            insurance_number, insurer_name, created_at, updated_at
          ) VALUES (
            @id, @hc_code, @document_type, @document_number, @document_normalized,
            @first_name, @last_name, @birth_date, @sex, @phone, @email, @address,
            @insurance_number, @insurer_name, @created_at, @updated_at
          )`
        ).run({ ...data, hc_code: hcCode });

        db.exec('COMMIT');
        const row = selectById().get(data.id);
        return mapRow(row);
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          /* ya abortada */
        }
        if (isUniqueDocumentViolation(err)) {
          const e = new Error('DOCUMENT_ALREADY_REGISTERED');
          e.code = 'DOCUMENT_ALREADY_REGISTERED';
          throw e;
        }
        throw err;
      }
    },

    update(id, fields) {
      const columns = {
        document_type: 'document_type',
        document_number: 'document_number',
        document_normalized: 'document_normalized',
        first_name: 'first_name',
        last_name: 'last_name',
        birth_date: 'birth_date',
        sex: 'sex',
        phone: 'phone',
        email: 'email',
        address: 'address',
        insurance_number: 'insurance_number',
        insurer_name: 'insurer_name',
        updated_at: 'updated_at'
      };

      const sets = [];
      const params = { id };
      for (const [key, column] of Object.entries(columns)) {
        if (key in fields) {
          sets.push(`${column} = @${key}`);
          params[key] = fields[key];
        }
      }

      if (sets.length === 0) {
        return this.findById(id);
      }

      try {
        db.prepare(
          `UPDATE patients SET ${sets.join(', ')} WHERE id = @id`
        ).run(params);
      } catch (err) {
        if (isUniqueDocumentViolation(err)) {
          const e = new Error('DOCUMENT_ALREADY_REGISTERED');
          e.code = 'DOCUMENT_ALREADY_REGISTERED';
          throw e;
        }
        throw err;
      }

      return this.findById(id);
    }
  };
}
