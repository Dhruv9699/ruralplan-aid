#!/usr/bin/env node

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
console.log('DATABASE SCHEMA DETAILED CHECK');
console.log('='.repeat(70));
console.log('');

const tables = [
  'profiles',
  'products', 
  'sales_history',
  'inventory',
  'production_history',
  'production_recommendations'
];

const results = {
  exists: [],
  missing: [],
  rlsEnabled: [],
  rlsDisabled: [],
  hasData: [],
  empty: []
};

for (const table of tables) {
  console.log(`Checking: ${table}`);
  
  try {
    // First try: Simple select
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(0);
    
    if (error) {
      // Check error type
      if (error.code === 'PGRST116' || error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`  ❌ Table does not exist`);
        results.missing.push(table);
      } else if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
        console.log(`  ✅ Table exists`);
        console.log(`  🔒 RLS: Enabled and blocking`);
        console.log(`  📊 Row count: Unknown (blocked by RLS)`);
        results.exists.push(table);
        results.rlsEnabled.push(table);
      } else {
        console.log(`  ⚠️  Unknown error: ${error.message}`);
        console.log(`  Code: ${error.code}`);
      }
    } else {
      console.log(`  ✅ Table exists`);
      console.log(`  ⚠️  RLS: Disabled or permissive SELECT policy`);
      console.log(`  📊 Row count: ${count ?? 0}`);
      results.exists.push(table);
      results.rlsDisabled.push(table);
      if (count > 0) {
        results.hasData.push(table);
      } else {
        results.empty.push(table);
      }
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
  }
  
  console.log('');
}

console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('');
console.log(`Tables that exist: ${results.exists.length}/${tables.length}`);
if (results.exists.length > 0) {
  console.log(`  ${results.exists.join(', ')}`);
}
console.log('');

console.log(`Tables missing: ${results.missing.length}/${tables.length}`);
if (results.missing.length > 0) {
  console.log(`  ${results.missing.join(', ')}`);
}
console.log('');

console.log(`Tables with RLS enabled: ${results.rlsEnabled.length}`);
if (results.rlsEnabled.length > 0) {
  console.log(`  ${results.rlsEnabled.join(', ')}`);
}
console.log('');

console.log(`Tables with RLS disabled/permissive: ${results.rlsDisabled.length}`);
if (results.rlsDisabled.length > 0) {
  console.log(`  ${results.rlsDisabled.join(', ')}`);
}
console.log('');

console.log(`Tables with data: ${results.hasData.length}`);
if (results.hasData.length > 0) {
  console.log(`  ${results.hasData.join(', ')}`);
}
console.log('');

console.log(`Empty tables: ${results.empty.length}`);
if (results.empty.length > 0) {
  console.log(`  ${results.empty.join(', ')}`);
}
console.log('');

// Final status
if (results.exists.length === tables.length) {
  console.log('✅ All required tables exist');
} else {
  console.log(`❌ Missing ${results.missing.length} table(s)`);
}

if (results.rlsEnabled.length === tables.length) {
  console.log('🔒 RLS is enabled on all tables (good for security)');
} else if (results.rlsEnabled.length > 0) {
  console.log(`⚠️  RLS is mixed (${results.rlsEnabled.length} enabled, ${results.rlsDisabled.length} disabled)`);
} else {
  console.log('⚠️  RLS appears disabled or permissive on all tables');
}
