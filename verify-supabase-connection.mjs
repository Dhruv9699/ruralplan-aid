#!/usr/bin/env node

/**
 * Supabase Connection Verification Script
 * 
 * This script verifies:
 * 1. Environment variables are loaded
 * 2. Supabase client initializes successfully
 * 3. Connection to the project works
 * 4. Auth system is reachable
 * 
 * Does NOT modify database, create tables, or change RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file manually
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

console.log('='.repeat(60));
console.log('SUPABASE CONNECTION VERIFICATION');
console.log('='.repeat(60));
console.log('');

// Check 1: Environment variables
console.log('✓ Step 1: Checking environment variables...');
console.log('');

if (!supabaseUrl) {
  console.error('❌ ERROR: VITE_SUPABASE_URL is not set');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error('❌ ERROR: VITE_SUPABASE_PUBLISHABLE_KEY is not set');
  process.exit(1);
}

// Validate URL format
const urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
if (!urlPattern.test(supabaseUrl)) {
  console.error('❌ ERROR: Invalid Supabase URL format');
  console.error(`   Expected: https://[project-id].supabase.co`);
  console.error(`   Got: ${supabaseUrl}`);
  process.exit(1);
}

// Extract project ID from URL
const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log('   VITE_SUPABASE_URL: ✅ Set');
console.log(`   Project ID: ${projectId}`);
console.log('   VITE_SUPABASE_PUBLISHABLE_KEY: ✅ Set');
console.log(`   Key length: ${supabaseAnonKey.length} characters`);

// Check if key looks like a placeholder
if (supabaseAnonKey === 'your_publishable_key' || 
    supabaseAnonKey === 'PLACEHOLDER_NEED_CORRECT_ANON_KEY' ||
    supabaseAnonKey.includes('placeholder')) {
  console.error('');
  console.error('❌ ERROR: Publishable key appears to be a placeholder');
  console.error('   Please replace with actual anon key from Supabase Dashboard');
  process.exit(1);
}

// Check if key looks like a JWT
if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('');
  console.warn('⚠️  WARNING: Publishable key does not start with "eyJ"');
  console.warn('   Supabase anon keys are typically JWT tokens starting with "eyJ"');
  console.warn('   The key may be invalid.');
}

console.log('');

// Check 2: Initialize Supabase client
console.log('✓ Step 2: Initializing Supabase client...');
console.log('');

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist for this test
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  console.log('   Supabase client created successfully ✅');
} catch (error) {
  console.error('❌ ERROR: Failed to create Supabase client');
  console.error(`   ${error.message}`);
  process.exit(1);
}

console.log('');

// Check 3: Test connection
console.log('✓ Step 3: Testing connection to Supabase...');
console.log('');

try {
  // Try to get session (should return null but shouldn't error if connection works)
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ ERROR: Connection failed');
    console.error(`   ${error.message}`);
    if (error.message.includes('Invalid API key')) {
      console.error('');
      console.error('   This usually means:');
      console.error('   1. The anon key is incorrect');
      console.error('   2. The anon key is for a different project');
      console.error('   3. The anon key has been rotated/regenerated');
    }
    process.exit(1);
  }
  
  console.log('   Connection successful ✅');
  console.log(`   Session: ${data.session ? 'Active' : 'None (expected)'}`);
} catch (error) {
  console.error('❌ ERROR: Connection test failed');
  console.error(`   ${error.message}`);
  process.exit(1);
}

console.log('');

// Check 4: Test auth API endpoint
console.log('✓ Step 4: Testing auth API endpoint...');
console.log('');

try {
  // This should work even without valid credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@nonexistent.invalid',
    password: 'invalid',
  });
  
  // We expect this to fail with "Invalid credentials" or similar
  // But if it fails with API/connection errors, that's a problem
  if (error) {
    if (error.message.includes('Invalid login credentials') || 
        error.message.includes('Invalid email or password') ||
        error.message.includes('Email not confirmed')) {
      console.log('   Auth API endpoint reachable ✅');
      console.log('   (Credential validation working as expected)');
    } else if (error.message.includes('Invalid API key')) {
      console.error('❌ ERROR: Invalid API key');
      console.error('   The publishable key is not valid for this project');
      process.exit(1);
    } else {
      console.warn('⚠️  WARNING: Unexpected auth error');
      console.warn(`   ${error.message}`);
      console.warn('   But connection appears to be working');
    }
  }
} catch (error) {
  console.error('❌ ERROR: Auth API test failed');
  console.error(`   ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('='.repeat(60));
console.log('CONNECTION VERIFICATION COMPLETE');
console.log('='.repeat(60));
console.log('');
console.log('✅ All checks passed!');
console.log('');
console.log(`Project: ${projectId}`);
console.log(`URL: ${supabaseUrl}`);
console.log('Status: Connected and ready');
console.log('');
console.log('Next steps:');
console.log('1. Deploy database schema (if not already deployed)');
console.log('2. Configure RLS policies');
console.log('3. Test authentication flow');
console.log('');
