import dbConnect from "@/lib/dbConnect";

// Patient interface for TypeScript typing
export interface Patient {
  id?: number;
  practice_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  registration_date?: Date;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Patient class with PostgreSQL methods (multi-tenant, scoped by practice)
class PatientModel {
  // Create a new patient for a practice
  static async create(
    practiceId: number,
    patientData: Omit<
      Patient,
      "id" | "practice_id" | "created_at" | "updated_at"
    >,
  ): Promise<Patient> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `INSERT INTO patients
        (practice_id, first_name, last_name, email, phone, date_of_birth, registration_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE), COALESCE($8, 'active'), NOW(), NOW())
        RETURNING *`,
        [
          practiceId,
          patientData.first_name,
          patientData.last_name,
          patientData.email,
          patientData.phone,
          patientData.date_of_birth,
          patientData.registration_date,
          patientData.status,
        ],
      );

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create patient: ${error}`);
    }
  }

  // Find all patients for a practice
  static async findAllByPractice(practiceId: number): Promise<Patient[]> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM patients WHERE practice_id = $1 ORDER BY registration_date DESC, last_name ASC, first_name ASC",
        [practiceId],
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find patients: ${error}`);
    }
  }

  // Find patient by ID (with practice ownership check)
  static async findById(
    id: number,
    practiceId: number,
  ): Promise<Patient | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM patients WHERE id = $1 AND practice_id = $2",
        [id, practiceId],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find patient: ${error}`);
    }
  }

  // Update patient (with practice ownership check)
  static async update(
    id: number,
    practiceId: number,
    patientData: Partial<
      Omit<Patient, "id" | "practice_id" | "created_at" | "updated_at">
    >,
  ): Promise<Patient> {
    const pool = await dbConnect();

    try {
      // Build dynamic update query based on provided fields
      const fields = [];
      const values = [];
      let paramCounter = 1;

      if (patientData.first_name !== undefined) {
        fields.push(`first_name = $${paramCounter++}`);
        values.push(patientData.first_name);
      }
      if (patientData.last_name !== undefined) {
        fields.push(`last_name = $${paramCounter++}`);
        values.push(patientData.last_name);
      }
      if (patientData.email !== undefined) {
        fields.push(`email = $${paramCounter++}`);
        values.push(patientData.email);
      }
      if (patientData.phone !== undefined) {
        fields.push(`phone = $${paramCounter++}`);
        values.push(patientData.phone);
      }
      if (patientData.date_of_birth !== undefined) {
        fields.push(`date_of_birth = $${paramCounter++}`);
        values.push(patientData.date_of_birth);
      }
      if (patientData.registration_date !== undefined) {
        fields.push(`registration_date = $${paramCounter++}`);
        values.push(patientData.registration_date);
      }
      if (patientData.status !== undefined) {
        fields.push(`status = $${paramCounter++}`);
        values.push(patientData.status);
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      // Add updated_at
      fields.push(`updated_at = NOW()`);

      // Add id and practice_id to values
      values.push(id, practiceId);

      const result = await pool.query(
        `UPDATE patients SET ${fields.join(", ")} WHERE id = $${paramCounter++} AND practice_id = $${paramCounter++} RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        throw new Error("Patient not found or access denied");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update patient: ${error}`);
    }
  }

  // Delete patient (with practice ownership check)
  static async delete(id: number, practiceId: number): Promise<boolean> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "DELETE FROM patients WHERE id = $1 AND practice_id = $2 RETURNING id",
        [id, practiceId],
      );

      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete patient: ${error}`);
    }
  }

  // Count patients for a practice
  static async countByPractice(practiceId: number): Promise<number> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT COUNT(*) FROM patients WHERE practice_id = $1",
        [practiceId],
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to count patients: ${error}`);
    }
  }

  // Find patients by status for a practice
  static async findByStatus(
    practiceId: number,
    status: string,
  ): Promise<Patient[]> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM patients WHERE practice_id = $1 AND status = $2 ORDER BY registration_date DESC, last_name ASC, first_name ASC",
        [practiceId, status],
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find patients by status: ${error}`);
    }
  }

  // Find patient by phone number (for screen pop caller lookup)
  static async findByPhone(
    practiceId: number,
    phone: string,
  ): Promise<Patient | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM patients WHERE practice_id = $1 AND phone = $2 LIMIT 1",
        [practiceId, phone],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find patient by phone: ${error}`);
    }
  }
}

export default PatientModel;
