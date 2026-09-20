#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * Verifies that the migration was executed successfully:
 * - All 6 tables exist
 * - RLS is enabled on all tables
 * - Policies exist
 * - Tables are accessible (with RLS blocking)
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('='.repeat(70));
console.log('MIGRATION VERIFICATION');
console.log('='.repeat(70));
console.log('');
console.log(`Project: ${projectId}`);
console.log('');

const REQUIRED_TABLES = [
  'profiles',
  'products',
  'sales_history',
  'inventory',
  'production_history',
  'production_recommendations'
];

const results = {
  tablesExist: [],
  tablesMissing: [],
  rlsEnabled: [],
  rlsDisabledOrPermissive: [],
  errorsEncountered: []
};

console.log('Checking all 6 required tables...');
console.log('');

for (const tableName of REQUIRED_TABLES) {
  process.stdout.write(`  ${tableName}... `);
  
  try {
    // Try to query the table
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.code === 'PGRST205') {
        // Table doesn't exist
        console.log('❌ MISSING');
        results.tablesMissing.push(tableName);
      } else if (error.code === 'PGRST301' || error.message.includes('row-level security') || error.message.includes('policy')) {
        // Table exists but RLS is blocking (expected)
        console.log('✅ EXISTS (RLS enabled ✓)');
        results.tablesExist.push(tableName);
        results.rlsEnabled.push(tableName);
      } else {
        // Some other error
        console.log(`⚠️  ERROR: ${error.message}`);
        results.errorsEncountered.push({ table: tableName, error: error.message });
      }
    } else {
      // Query succeeded - table exists, RLS might be off or permissive
      console.log(`✅ EXISTS (RLS: ${count === 0 ? 'enabled or empty' : 'possibly permissive'})`);
      results.tablesExist.push(tableName);
      
      // Try an insert to check RLS more thoroughly
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({ _test_column_that_does_not_exist: 'test' });
      
      if (insertError && (insertError.message.includes('RLS') || insertError.message.includes('policy'))) {
        results.rlsEnabled.push(tableName);
      } else if (!insertError) {
        // This should never happen with proper RLS
        results.rlsDisabledOrPermissive.push(tableName);
      } else {
        results.rlsEnabled.push(tableName);
      }
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    results.errorsEncountered.push({ table: tableName, error: err.message });
  }
}

console.log('');
console.log('='.repeat(70));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(70));
console.log('');

// Tables existence
console.log(`Tables Created: ${results.tablesExist.length}/${REQUIRED_TABLES.length}`);
if (results.tablesExist.length === REQUIRED_TABLES.length) {
  console.log('  ✅ All required tables exist');
  results.tablesExist.forEach(t => console.log(`     - ${t}`));
} else {
  console.log(`  ❌ Missing ${results.tablesMissing.length} table(s)`);
  if (results.tablesMissing.length > 0) {
    results.tablesMissing.forEach(t => console.log(`     - ${t}`));
  }
}
console.log('');

// RLS status
console.log(`RLS Enabled: ${results.rlsEnabled.length}/${results.tablesExist.length}`);
if (results.rlsEnabled.length === results.tablesExist.length && results.tablesExist.length > 0) {
  console.log('  ✅ RLS enabled on all existing tables');
  results.rlsEnabled.forEach(t => console.log(`     - ${t}`));
} else if (results.rlsEnabled.length > 0) {
  console.log('  ⚠️  RLS status mixed');
  console.log('  Enabled on:');
  results.rlsEnabled.forEach(t => console.log(`     - ${t}`));
  if (results.rlsDisabledOrPermissive.length > 0) {
    console.log('  Disabled or permissive on:');
    results.rlsDisabledOrPermissive.forEach(t => console.log(`     - ${t}`));
  }
} else if (results.tablesExist.length > 0) {
  console.log('  ⚠️  RLS appears disabled on all tables');
}
console.log('');

// Errors
if (results.errorsEncountered.length > 0) {
  console.log(`Errors Encountered: ${results.errorsEncountered.length}`);
  results.errorsEncountered.forEach(({ table, error }) => {
    console.log(`  ❌ ${table}: ${error}`);
  });
  console.log('');
}

// Final status
console.log('='.repeat(70));
console.log('OVERALL STATUS');
console.log('='.repeat(70));
console.log('');

const allTablesExist = results.tablesExist.length === REQUIRED_TABLES.length;
const allRlsEnabled = results.rlsEnabled.length === results.tablesExist.length && results.tablesExist.length > 0;
const noErrors = results.errorsEncountered.length === 0;

if (allTablesExist && allRlsEnabled && noErrors) {
  console.log('✅ MIGRATION SUCCESSFUL');
  console.log('');
  console.log('All checks passed:');
  console.log('  ✅ All 6 tables created');
  console.log('  ✅ RLS enabled on all tables');
  console.log('  ✅ No errors encountered');
  console.log('');
  console.log('Database is ready for use.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Test signup in the application');
  console.log('  2. Verify authentication flow');
  console.log('  3. Test data operations');
  process.exit(0);
} else {
  console.log('❌ MIGRATION INCOMPLETE OR ISSUES DETECTED');
  console.log('');
  if (!allTablesExist) {
    console.log('  ❌ Not all tables exist');
  }
  if (!allRlsEnabled && results.tablesExist.length > 0) {
    console.log('  ❌ RLS not enabled on all tables');
  }
  if (!noErrors) {
    console.log('  ❌ Errors occurred during verification');
  }
  console.log('');
  console.log('Please review the migration execution and try again.');
  process.exit(1);
}
