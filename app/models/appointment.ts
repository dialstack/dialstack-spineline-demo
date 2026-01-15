import dbConnect from '@/lib/dbConnect';

// Appointment status values
export type AppointmentStatus = 'pending' | 'accepted' | 'cancelled' | 'declined' | 'no_show';

// Appointment type values
export type AppointmentType = 'initial' | 'adjustment' | 'walk_in' | 'follow_up';

// Appointment interface for TypeScript typing
export interface Appointment {
  id?: number;
  practice_id: number;
  patient_id?: number | null;
  provider_id?: number | null;
  start_at: Date;
  end_at: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  customer_phone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

// Input type for creating appointments
export interface CreateAppointmentInput {
  start_at: Date;
  end_at: Date;
  status?: AppointmentStatus;
  type?: AppointmentType;
  patient_id?: number | null;
  provider_id?: number | null;
  customer_phone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
}

// Input type for updating appointments
export interface UpdateAppointmentInput {
  start_at?: Date;
  end_at?: Date;
  status?: AppointmentStatus;
  type?: AppointmentType;
  patient_id?: number | null;
  provider_id?: number | null;
  notes?: string | null;
}

// Appointment class with PostgreSQL methods (multi-tenant, scoped by practice)
class AppointmentModel {
  // Create a new appointment for a practice
  static async create(
    practiceId: number,
    appointmentData: CreateAppointmentInput
  ): Promise<Appointment> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `INSERT INTO appointments
        (practice_id, patient_id, provider_id, start_at, end_at, status, type, customer_phone, customer_name, customer_email, notes, idempotency_key)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'accepted'), COALESCE($7, 'adjustment'), $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          practiceId,
          appointmentData.patient_id,
          appointmentData.provider_id,
          appointmentData.start_at,
          appointmentData.end_at,
          appointmentData.status,
          appointmentData.type,
          appointmentData.customer_phone,
          appointmentData.customer_name,
          appointmentData.customer_email,
          appointmentData.notes,
          appointmentData.idempotency_key,
        ]
      );

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create appointment: ${error}`);
    }
  }

  // Find appointment by idempotency key (for idempotent booking)
  static async findByIdempotencyKey(
    practiceId: number,
    idempotencyKey: string
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        'SELECT * FROM appointments WHERE practice_id = $1 AND idempotency_key = $2',
        [practiceId, idempotencyKey]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find appointment by idempotency key: ${error}`);
    }
  }

  // Find conflicting appointments (overlapping time slots)
  // An appointment conflicts if it overlaps with the given time range
  // and is not cancelled or declined
  // If providerId is specified, only check conflicts for that provider
  static async findConflicting(
    practiceId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number,
    providerId?: number | null
  ): Promise<Appointment[]> {
    const pool = await dbConnect();

    try {
      let query = `
        SELECT * FROM appointments
        WHERE practice_id = $1
          AND status NOT IN ('cancelled', 'declined')
          AND start_at < $3
          AND end_at > $2
      `;
      const params: (number | Date | null)[] = [practiceId, startAt, endAt];
      let paramIndex = 4;

      if (excludeId !== undefined) {
        query += ` AND id != $${paramIndex}`;
        params.push(excludeId);
        paramIndex++;
      }

      // If providerId is specified, only check conflicts for that provider
      if (providerId !== undefined) {
        if (providerId === null) {
          query += ` AND provider_id IS NULL`;
        } else {
          query += ` AND provider_id = $${paramIndex}`;
          params.push(providerId);
        }
      }

      const result = await pool.query(query, params);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find conflicting appointments: ${error}`);
    }
  }

  // Find appointments for a practice that overlap a date range
  // Uses proper overlap detection: appointment starts before range ends AND ends after range starts
  static async findByPractice(
    practiceId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `SELECT * FROM appointments
         WHERE practice_id = $1
           AND start_at < $3
           AND end_at > $2
         ORDER BY start_at ASC`,
        [practiceId, startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find appointments: ${error}`);
    }
  }

  // Find appointment by ID (with practice ownership check)
  static async findById(id: number, practiceId: number): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        'SELECT * FROM appointments WHERE id = $1 AND practice_id = $2',
        [id, practiceId]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find appointment: ${error}`);
    }
  }

  // Update appointment status
  static async updateStatus(
    id: number,
    practiceId: number,
    status: AppointmentStatus
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `UPDATE appointments
         SET status = $3, updated_at = NOW()
         WHERE id = $1 AND practice_id = $2
         RETURNING *`,
        [id, practiceId, status]
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to update appointment status: ${error}`);
    }
  }

  // Update appointment (general update for any fields)
  static async update(
    id: number,
    practiceId: number,
    data: UpdateAppointmentInput
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const fields: string[] = [];
      const values: (string | number | Date | null)[] = [];
      let paramCounter = 1;

      if (data.start_at !== undefined) {
        fields.push(`start_at = $${paramCounter++}`);
        values.push(data.start_at);
      }
      if (data.end_at !== undefined) {
        fields.push(`end_at = $${paramCounter++}`);
        values.push(data.end_at);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${paramCounter++}`);
        values.push(data.status);
      }
      if (data.type !== undefined) {
        fields.push(`type = $${paramCounter++}`);
        values.push(data.type);
      }
      if (data.patient_id !== undefined) {
        fields.push(`patient_id = $${paramCounter++}`);
        values.push(data.patient_id);
      }
      if (data.provider_id !== undefined) {
        fields.push(`provider_id = $${paramCounter++}`);
        values.push(data.provider_id);
      }
      if (data.notes !== undefined) {
        fields.push(`notes = $${paramCounter++}`);
        values.push(data.notes);
      }

      if (fields.length === 0) {
        // Nothing to update, just return the existing appointment
        return this.findById(id, practiceId);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id, practiceId);

      const result = await pool.query(
        `UPDATE appointments
         SET ${fields.join(', ')}
         WHERE id = $${paramCounter++} AND practice_id = $${paramCounter}
         RETURNING *`,
        values
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to update appointment: ${error}`);
    }
  }

  // Delete appointment (with practice ownership check)
  static async delete(id: number, practiceId: number): Promise<boolean> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        'DELETE FROM appointments WHERE id = $1 AND practice_id = $2 RETURNING id',
        [id, practiceId]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete appointment: ${error}`);
    }
  }
}

export default AppointmentModel;
