const fs = require('fs');
const path = require('path');
const pool = require('./connection');

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database migrations completed successfully!');
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;