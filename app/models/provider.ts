import dbConnect from "@/lib/dbConnect";

export interface Provider {
  id?: number;
  practice_id: number;
  first_name: string;
  last_name: string;
  specialty?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateProviderInput {
  first_name: string;
  last_name: string;
  specialty?: string;
}

export interface UpdateProviderInput {
  first_name?: string;
  last_name?: string;
  specialty?: string;
}

class ProviderModel {
  /**
   * Create a new provider for a practice
   */
  static async create(
    practiceId: number,
    data: CreateProviderInput,
  ): Promise<Provider> {
    const pool = await dbConnect();

    const result = await pool.query(
      `INSERT INTO providers (practice_id, first_name, last_name, specialty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [practiceId, data.first_name, data.last_name, data.specialty || null],
    );

    return result.rows[0];
  }

  /**
   * Find all providers for a practice
   */
  static async findAllByPractice(practiceId: number): Promise<Provider[]> {
    const pool = await dbConnect();

    const result = await pool.query(
      "SELECT * FROM providers WHERE practice_id = $1 ORDER BY last_name ASC, first_name ASC",
      [practiceId],
    );

    return result.rows;
  }

  /**
   * Find provider by ID (with practice ownership check)
   */
  static async findById(
    id: number,
    practiceId: number,
  ): Promise<Provider | null> {
    const pool = await dbConnect();

    const result = await pool.query(
      "SELECT * FROM providers WHERE id = $1 AND practice_id = $2",
      [id, practiceId],
    );

    return result.rows[0] || null;
  }

  /**
   * Update provider (with practice ownership check)
   */
  static async update(
    id: number,
    practiceId: number,
    data: UpdateProviderInput,
  ): Promise<Provider | null> {
    const pool = await dbConnect();

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (data.first_name !== undefined) {
      fields.push(`first_name = $${paramCounter++}`);
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${paramCounter++}`);
      values.push(data.last_name);
    }
    if (data.specialty !== undefined) {
      fields.push(`specialty = $${paramCounter++}`);
      values.push(data.specialty);
    }

    if (fields.length === 0) {
      return this.findById(id, practiceId);
    }

    values.push(id, practiceId);

    const result = await pool.query(
      `UPDATE providers SET ${fields.join(", ")}
       WHERE id = $${paramCounter++} AND practice_id = $${paramCounter}
       RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  /**
   * Delete provider (with practice ownership check)
   */
  static async delete(id: number, practiceId: number): Promise<boolean> {
    const pool = await dbConnect();

    const result = await pool.query(
      "DELETE FROM providers WHERE id = $1 AND practice_id = $2 RETURNING id",
      [id, practiceId],
    );

    return result.rows.length > 0;
  }

  /**
   * Create default providers for a new practice
   */
  static async createDefaults(practiceId: number): Promise<Provider[]> {
    const defaults: CreateProviderInput[] = [
      {
        first_name: "Dr.",
        last_name: "Martinez",
        specialty: "General Chiropractic",
      },
      { first_name: "Dr.", last_name: "Chen", specialty: "Sports Medicine" },
      { first_name: "Dr.", last_name: "Johnson", specialty: "Pediatric Care" },
    ];

    const providers: Provider[] = [];
    for (const data of defaults) {
      const provider = await this.create(practiceId, data);
      providers.push(provider);
    }

    return providers;
  }
}

export default ProviderModel;
