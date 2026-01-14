import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";

// Practice configuration stored as JSONB
export interface PracticeConfig {
  timezone?: string;
}

// Practice interface for TypeScript typing
export interface Practice {
  id?: number;
  email: string;
  password: string;
  created_at?: Date;
  updated_at?: Date;
  changedPassword?: boolean;
  businessName?: string;
  setup?: boolean;
  dialstack_account_id?: string;
  config?: PracticeConfig;
}

// Helper to get timezone from practice config with default
export function getTimezone(practice: Practice): string {
  return practice.config?.timezone ?? "America/New_York";
}

// Practice class with PostgreSQL methods
class PracticeModel {
  // Create a new practice
  static async create(
    practiceData: Omit<Practice, "id" | "created_at" | "updated_at">,
  ): Promise<Practice> {
    const pool = await dbConnect();

    try {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(practiceData.password, 12);

      const result = await pool.query(
        "INSERT INTO practices (email, password, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *",
        [practiceData.email, hashedPassword],
      );

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create practice: ${error}`);
    }
  }

  // Find practice by email
  static async findByEmail(email: string): Promise<Practice | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM practices WHERE email = $1",
        [email],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find practice: ${error}`);
    }
  }

  // Find practice by ID
  static async findById(id: number): Promise<Practice | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query("SELECT * FROM practices WHERE id = $1", [
        id,
      ]);

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to find practice: ${error}`);
    }
  }

  // Validate password
  static async validatePassword(
    practice: Practice,
    password: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, practice.password);
    } catch (error) {
      throw new Error(`Failed to validate password: ${error}`);
    }
  }

  // Update practice password
  static async updatePassword(
    id: number,
    newPassword: string,
  ): Promise<Practice> {
    const pool = await dbConnect();

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const result = await pool.query(
        "UPDATE practices SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [hashedPassword, id],
      );

      if (result.rows.length === 0) {
        throw new Error("Practice not found");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update password: ${error}`);
    }
  }

  // Find practice by DialStack account ID (for webhook lookups)
  static async findByDialstackAccountId(
    accountId: string,
  ): Promise<Practice | null> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT * FROM practices WHERE dialstack_account_id = $1",
        [accountId],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(
        `Failed to find practice by DialStack account ID: ${error}`,
      );
    }
  }

  // Check if email exists (for validation)
  static async emailExists(email: string): Promise<boolean> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "SELECT COUNT(*) FROM practices WHERE email = $1",
        [email],
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw new Error(`Failed to check email existence: ${error}`);
    }
  }

  // Update practice email
  static async updateEmail(
    currentEmail: string,
    newEmail: string,
  ): Promise<Practice> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "UPDATE practices SET email = $1, updated_at = NOW() WHERE email = $2 RETURNING *",
        [newEmail, currentEmail],
      );

      if (result.rows.length === 0) {
        throw new Error("Practice not found");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update email: ${error}`);
    }
  }

  // Generic update method for practice fields
  static async update(
    email: string,
    updates: Partial<Omit<Practice, "id" | "created_at" | "updated_at">>,
  ): Promise<Practice> {
    const pool = await dbConnect();

    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      // Build SET clause dynamically
      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      const result = await pool.query(
        `UPDATE practices SET ${setClause}, updated_at = NOW() WHERE email = $${fields.length + 1} RETURNING *`,
        [...values, email],
      );

      if (result.rows.length === 0) {
        throw new Error("Practice not found");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update practice: ${error}`);
    }
  }

  // Update practice config (JSONB field)
  static async updateConfig(
    email: string,
    config: PracticeConfig,
  ): Promise<Practice> {
    const pool = await dbConnect();

    try {
      const result = await pool.query(
        "UPDATE practices SET config = $1, updated_at = NOW() WHERE email = $2 RETURNING *",
        [JSON.stringify(config), email],
      );

      if (result.rows.length === 0) {
        throw new Error("Practice not found");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update practice config: ${error}`);
    }
  }
}

export default PracticeModel;
