#!/usr/bin/env node

/**
 * Execute Migration Script
 * 
 * Executes the complete schema migration on Supabase project
 */

import { createClient } from '@supabase/supabase-js';
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
const supabaseAnonKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
const projectId = envVars.VITE_SUPABASE_PROJECT_ID;

console.log('='.repeat(70));
console.log('EXECUTING DATABASE MIGRATION');
console.log('='.repeat(70));
console.log('');

// Verify project ID
console.log('Pre-execution verification:');
console.log(`  Project ID: ${projectId}`);
console.log(`  Expected: gambmuviuiohiphvcfum`);

if (projectId !== 'gambmuviuiohiphvcfum') {
  console.error('');
  console.error('❌ ERROR: Project ID mismatch!');
  console.error(`   Configured: ${projectId}`);
  console.error(`   Expected: gambmuviuiohiphvcfum`);
  console.error('');
  console.error('Aborting migration for safety.');
  process.exit(1);
}

console.log('  ✅ Project ID verified');
console.log('');

// Load migration SQL
console.log('Loading migration file...');
let migrationSQL;
try {
  migrationSQL = readFileSync('migration_to_execute.sql', 'utf-8');
  console.log(`  ✅ Loaded (${migrationSQL.length} characters)`);
} catch (error) {
  console.error('  ❌ Failed to load migration file');
  console.error(`  ${error.message}`);
  process.exit(1);
}

console.log('');

// Note: Supabase JS client cannot execute raw SQL with DDL statements
// We need to use the Management API or direct PostgreSQL connection

console.log('⚠️  Note: Supabase JS client cannot execute DDL (CREATE TABLE, etc.)');
console.log('');
console.log('Migration must be executed via one of these methods:');
console.log('');
console.log('METHOD 1: Supabase Dashboard (Recommended)');
console.log('  1. Go to: https://supabase.com/dashboard/project/gambmuviuiohiphvcfum');
console.log('  2. Click: SQL Editor');
console.log('  3. Click: New Query');
console.log('  4. Copy contents of: migration_to_execute.sql');
console.log('  5. Paste into editor');
console.log('  6. Click: Run');
console.log('');
console.log('METHOD 2: Use this prepared command with psql');
console.log('  (Requires database connection string with password)');
console.log('');
console.log('The migration file is ready at: migration_to_execute.sql');
console.log('');

// However, let's try using fetch to the REST API with the service role key
console.log('Attempting to use Supabase REST API...');
console.log('');

// Check if we can get a service role key from environment
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_KEY;

if (!serviceRoleKey) {
  console.log('❌ No service role key found in environment');
  console.log('   Service role key needed for schema modifications');
  console.log('');
  console.log('To execute automatically, add to .env:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"');
  console.log('');
  console.log('Get it from: Settings → API → service_role key');
  console.log('');
  console.log('⚠️  WARNING: Service role key bypasses RLS - never expose in frontend!');
  console.log('   Only use server-side or for migration scripts.');
  console.log('');
  console.log('ALTERNATIVE: Execute via Supabase Dashboard (METHOD 1 above)');
  process.exit(0);
}

// If we have service role key, try to execute via SQL endpoint
console.log('Found service role key, attempting execution...');
console.log('');

try {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ query: migrationSQL })
  });

  if (!response.ok) {
    console.error('❌ Failed to execute migration');
    console.error(`   Status: ${response.status}`);
    console.error(`   ${response.statusText}`);
    const text = await response.text();
    console.error(`   Response: ${text.substring(0, 200)}`);
    console.log('');
    console.log('Please use Supabase Dashboard method instead.');
    process.exit(1);
  }

  console.log('✅ Migration executed successfully!');
  console.log('');
} catch (error) {
  console.error('❌ Error executing migration');
  console.error(`   ${error.message}`);
  console.log('');
  console.log('Please use Supabase Dashboard method instead.');
  process.exit(1);
}
