import dbConnect from "@/lib/dbConnect";

// Appointment status values (matching Square API)
export type AppointmentStatus =
  | "pending"
  | "accepted"
  | "cancelled"
  | "declined"
  | "no_show";

// Appointment interface for TypeScript typing
export interface Appointment {
  id?: number;
  practice_id: number;
  patient_id?: number | null;
  start_at: Date;
  end_at: Date;
  status: AppointmentStatus;
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
  patient_id?: number | null;
  customer_phone?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
}

// Appointment class with PostgreSQL methods (multi-tenant, scoped by practice)
class AppointmentModel {
  // Create a new appointment for a practice
  static async create(
    practiceId: number,
    appointmentData: CreateAppointmentInput,
  ): Promise<Appointment> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `INSERT INTO appointments
        (practice_id, patient_id, start_at, end_at, status, customer_phone, customer_name, customer_email, notes, idempotency_key)
        VALUES ($1, $2, $3, $4, COALESCE($5, 'accepted'), $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          practiceId,
          appointmentData.patient_id,
          appointmentData.start_at,
          appointmentData.end_at,
          appointmentData.status,
          appointmentData.customer_phone,
          appointmentData.customer_name,
          appointmentData.customer_email,
          appointmentData.notes,
          appointmentData.idempotency_key,
        ],
      );

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create appointment: ${error}`);
    }
  }

  // Find appointment by idempotency key (for idempotent booking)
  static async findByIdempotencyKey(
    practiceId: number,
    idempotencyKey: string,
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM appointments WHERE practice_id = $1 AND idempotency_key = $2",
        [practiceId, idempotencyKey],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(
        `Failed to find appointment by idempotency key: ${error}`,
      );
    }
  }

  // Find conflicting appointments (overlapping time slots)
  // An appointment conflicts if it overlaps with the given time range
  // and is not cancelled or declined
  static async findConflicting(
    practiceId: number,
    startAt: Date,
    endAt: Date,
    excludeId?: number,
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
      const params: (number | Date)[] = [practiceId, startAt, endAt];

      if (excludeId !== undefined) {
        query += ` AND id != $4`;
        params.push(excludeId);
      }

      const result = await pool.query(query, params);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find conflicting appointments: ${error}`);
    }
  }

  // Find appointments for a practice within a date range
  static async findByPractice(
    practiceId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `SELECT * FROM appointments
         WHERE practice_id = $1
           AND start_at >= $2
           AND start_at < $3
         ORDER BY start_at ASC`,
        [practiceId, startDate, endDate],
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to find appointments: ${error}`);
    }
  }

  // Find appointment by ID (with practice ownership check)
  static async findById(
    id: number,
    practiceId: number,
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM appointments WHERE id = $1 AND practice_id = $2",
        [id, practiceId],
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
    status: AppointmentStatus,
  ): Promise<Appointment | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        `UPDATE appointments
         SET status = $3, updated_at = NOW()
         WHERE id = $1 AND practice_id = $2
         RETURNING *`,
        [id, practiceId, status],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to update appointment status: ${error}`);
    }
  }
}

export default AppointmentModel;
