const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, date, competency_month, status, amount, type FROM transactions WHERE description LIKE '%Salário Futura%';")
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(console.error);
