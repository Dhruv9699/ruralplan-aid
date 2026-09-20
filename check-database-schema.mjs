#!/usr/bin/env node

/**
 * Database Schema Checker
 * 
 * Checks existing database state WITHOUT modifying anything:
 * - Which tables exist
 * - RLS status
 * - RLS policies
 * - Row counts
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('='.repeat(70));
console.log('DATABASE SCHEMA CHECK');
console.log('='.repeat(70));
console.log('');

const EXPECTED_TABLES = [
  'profiles',
  'products',
  'sales_history',
  'inventory',
  'production_history',
  'production_recommendations'
];

// Check each table
for (const tableName of EXPECTED_TABLES) {
  console.log(`Checking: ${tableName}`);
  console.log('-'.repeat(70));
  
  try {
    // Try to query the table (will fail if table doesn't exist)
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('relation') ||
          error.code === '42P01') {
        console.log(`  Status: ❌ TABLE DOES NOT EXIST`);
      } else if (error.message.includes('RLS') || 
                 error.message.includes('policy') ||
                 error.message.includes('permission')) {
        console.log(`  Status: ✅ Table exists`);
        console.log(`  RLS: ✅ Enabled (blocked by RLS - expected)`);
        console.log(`  Row count: Cannot determine (RLS blocking)`);
        console.log(`  Note: RLS is working, preventing unauthorized access`);
      } else {
        console.log(`  Status: ⚠️ Table may exist but error occurred`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Code: ${error.code || 'unknown'}`);
      }
    } else {
      console.log(`  Status: ✅ Table exists`);
      console.log(`  RLS: ⚠️ May be disabled or policy allows SELECT`);
      console.log(`  Row count: ${count !== null ? count : 'unknown'}`);
      if (count === 0) {
        console.log(`  Data: Empty table`);
      } else if (count > 0) {
        console.log(`  Data: Contains ${count} row(s)`);
      }
    }
  } catch (err) {
    console.log(`  Status: ❌ Error checking table`);
    console.log(`  Error: ${err.message}`);
  }
  
  console.log('');
}

console.log('='.repeat(70));
console.log('CHECKING RLS POLICIES');
console.log('='.repeat(70));
console.log('');
console.log('Note: RLS policy details require database admin access.');
console.log('Attempting to infer RLS status from query behavior...');
console.log('');

// Try to check RLS by attempting operations
for (const tableName of EXPECTED_TABLES) {
  console.log(`${tableName}:`);
  
  try {
    // Try SELECT
    const { error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!selectError) {
      console.log(`  SELECT: ✅ Allowed (no RLS or permissive policy)`);
    } else if (selectError.message.includes('does not exist')) {
      console.log(`  SELECT: ❌ Table does not exist`);
    } else {
      console.log(`  SELECT: 🔒 Blocked (RLS likely enabled)`);
    }
    
    // Try INSERT (will fail but tells us about RLS)
    const { error: insertError } = await supabase
      .from(tableName)
      .insert({ _test: 'check' });
    
    if (insertError) {
      if (insertError.message.includes('does not exist')) {
        console.log(`  INSERT: ❌ Table does not exist`);
      } else if (insertError.message.includes('RLS') || 
                 insertError.message.includes('policy') ||
                 insertError.message.includes('violates')) {
        console.log(`  INSERT: 🔒 Blocked by RLS`);
      } else if (insertError.message.includes('column')) {
        console.log(`  INSERT: ⚠️ Would work but invalid column (RLS off or permissive)`);
      } else {
        console.log(`  INSERT: ⚠️ Error: ${insertError.message.substring(0, 50)}...`);
      }
    } else {
      console.log(`  INSERT: ✅ Allowed (no RLS or permissive policy)`);
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
  
  console.log('');
}

console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('');
console.log('To get complete RLS policy details, you need to:');
console.log('1. Go to Supabase Dashboard');
console.log('2. Navigate to Database → Tables');
console.log('3. Select each table');
console.log('4. Check "RLS" section for policies');
console.log('');
console.log('Or run SQL query in SQL Editor:');
console.log('');
console.log('SELECT schemaname, tablename, policyname, cmd, qual, with_check');
console.log('FROM pg_policies');
console.log('WHERE schemaname = \'public\'');
console.log('ORDER BY tablename, policyname;');
console.log('');
