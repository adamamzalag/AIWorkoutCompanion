// Test video search specifically for plan 14
import pkg from 'pg';
const { Pool } = pkg;

async function testPlan14VideoSearch() {
  console.log('Testing Video Search for Plan 14');
  console.log('=================================');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get exercises from plan 14 that need videos
    const result = await pool.query(`
      SELECT DISTINCT e.id, e.name, e.youtube_id
      FROM exercises e
      JOIN workout_exercises we ON e.id = we.exercise_id
      JOIN workouts w ON we.workout_id = w.id
      WHERE w.plan_id = 14 AND e.youtube_id IS NULL
      LIMIT 5
    `);
    
    console.log(`Found ${result.rows.length} exercises in Plan 14 needing videos:`);
    result.rows.forEach(row => {
      console.log(`  ID ${row.id}: "${row.name}"`);
    });
    
    if (result.rows.length > 0) {
      console.log('\nReady to test video search on these exercises');
    } else {
      console.log('\nAll exercises in Plan 14 already have videos');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testPlan14VideoSearch().catch(console.error);