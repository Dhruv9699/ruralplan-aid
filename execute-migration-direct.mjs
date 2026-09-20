#!/usr/bin/env node

/**
 * Direct Migration Execution via Supabase Management API
 */

import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"'\n]+)["']?$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const projectId = envVars.VITE_SUPABASE_PROJECT_ID;

console.log('='.repeat(70));
console.log('SUPABASE MIGRATION EXECUTION');
console.log('='.repeat(70));
console.log('');
console.log(`Project: ${projectId}`);
console.log(`URL: ${supabaseUrl}`);
console.log('');

// Load migration
const migrationSQL = readFileSync('migration_to_execute.sql', 'utf-8');
console.log(`Migration loaded: ${migrationSQL.length} characters`);
console.log('');

console.log('='.repeat(70));
console.log('MANUAL EXECUTION REQUIRED');
console.log('='.repeat(70));
console.log('');
console.log('The Supabase JS client cannot execute DDL statements (CREATE TABLE, etc.)');
console.log('You must execute the migration via Supabase Dashboard.');
console.log('');
console.log('INSTRUCTIONS:');
console.log('');
console.log('1. Open your browser and go to:');
console.log(`   https://supabase.com/dashboard/project/${projectId}/sql/new`);
console.log('');
console.log('2. Open the file: migration_to_execute.sql');
console.log('   (Located in the project root directory)');
console.log('');
console.log('3. Copy ALL the SQL content from that file');
console.log('');
console.log('4. Paste it into the SQL Editor in your browser');
console.log('');
console.log('5. Click the "Run" button (or press Ctrl+Enter)');
console.log('');
console.log('6. Wait for execution to complete');
console.log('');
console.log('7. Check for success message or any errors');
console.log('');
console.log('8. After successful execution, run verification:');
console.log('   node verify-migration.mjs');
console.log('');
console.log('='.repeat(70));
console.log('');
console.log('Migration file ready at: migration_to_execute.sql');
console.log('');
