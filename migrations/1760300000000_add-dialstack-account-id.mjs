/**
 * Add dialstack_account_id column to practices table
 * Stores the DialStack account ID created during signup
 */

export async function up(pgm) {
  pgm.addColumn('practices', {
    dialstack_account_id: { type: 'varchar(50)' },
  });
}

export async function down(pgm) {
  pgm.dropColumn('practices', 'dialstack_account_id');
}
