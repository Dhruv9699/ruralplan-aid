#!/usr/bin/env node

/**
 * RLS Error Investigation
 * 
 * Investigates the "new row violates row-level security policy" error
 * by simulating the signup flow and checking RLS policies
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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});

console.log('='.repeat(70));
console.log('RLS ERROR INVESTIGATION');
console.log('='.repeat(70));
console.log('');

console.log('Testing signup flow to reproduce RLS error...');
console.log('');

// Test 1: Check if we can query profiles without auth
console.log('Test 1: Querying profiles without authentication');
const { data: profilesNoAuth, error: profilesNoAuthError } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);

if (profilesNoAuthError) {
  console.log('  Result: ❌ Blocked (expected with RLS)');
  console.log(`  Error: ${profilesNoAuthError.message}`);
} else {
  console.log('  Result: ✅ Allowed (RLS may be too permissive)');
  console.log(`  Rows: ${profilesNoAuth?.length || 0}`);
}
console.log('');

// Test 2: Try to sign up a test user
console.log('Test 2: Attempting signup with test credentials');
const testEmail = `test${Date.now()}@example.com`;
const testPassword = 'testpass123';

const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email: testEmail,
  password: testPassword,
});

if (signupError) {
  console.log('  Signup: ❌ Failed');
  console.log(`  Error: ${signupError.message}`);
  console.log('');
  process.exit(1);
}

console.log('  Signup: ✅ Success');
console.log(`  User ID: ${signupData.user?.id}`);
console.log(`  Session: ${signupData.session ? 'Created' : 'Not created (email confirmation required?)'}`);
console.log('');

// Test 3: Check if session exists immediately
const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) {
  console.log('Test 3: Session Status');
  console.log('  ✅ Session exists immediately after signup');
  console.log(`  User ID in session: ${sessionData.session.user.id}`);
  console.log('');
} else {
  console.log('Test 3: Session Status');
  console.log('  ⚠️  NO session exists after signup');
  console.log('  This means email confirmation is required');
  console.log('');
  console.log('  🔍 ROOT CAUSE FOUND:');
  console.log('  The app tries to insert profile BEFORE email confirmation');
  console.log('  Without confirmed email, there is NO authenticated session');
  console.log('  RLS policy requires auth.uid() = id');
  console.log('  But auth.uid() is NULL without a session');
  console.log('  Result: RLS blocks the INSERT');
  console.log('');
}

// Test 4: Try to insert profile
console.log('Test 4: Attempting to insert profile');
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: signupData.user?.id,
    name: 'Test User',
    email: testEmail,
    location: 'Test Village',
    district: 'Nashik',
    state: 'Maharashtra',
  });

if (profileError) {
  console.log('  Profile Insert: ❌ FAILED (reproduces the error)');
  console.log(`  Error: ${profileError.message}`);
  console.log(`  Code: ${profileError.code}`);
  console.log('');
  
  if (profileError.message.includes('row-level security')) {
    console.log('  ✅ RLS ERROR CONFIRMED');
    console.log('');
    console.log('  Analysis:');
    console.log('  - User created in auth.users');
    console.log('  - Session may not exist (email confirmation)');
    console.log('  - auth.uid() returns NULL without session');
    console.log('  - RLS policy: USING (auth.uid() = id)');
    console.log('  - NULL = id evaluates to NULL (not TRUE)');
    console.log('  - INSERT blocked by RLS');
  }
} else {
  console.log('  Profile Insert: ✅ Success');
  console.log('  This means RLS policy is working correctly');
}
console.log('');

// Test 5: Clean up - try to delete the test user
console.log('Test 5: Cleanup attempt');
if (signupData.user?.id) {
  // Try to delete profile (will fail without session)
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', signupData.user.id);
  
  if (deleteError) {
    console.log('  ⚠️  Could not delete test profile (expected without session)');
    console.log('  Manual cleanup may be needed in Supabase Dashboard');
  } else {
    console.log('  ✅ Test profile deleted');
  }
}
console.log('');

console.log('='.repeat(70));
console.log('INVESTIGATION SUMMARY');
console.log('='.repeat(70));
console.log('');

// Check Supabase project settings
console.log('Next Steps:');
console.log('');
console.log('1. Check Supabase Auth Settings:');
console.log('   Go to: Authentication → Settings');
console.log('   Check: "Enable email confirmations"');
console.log('');
console.log('   If ENABLED:');
console.log('     - Users must confirm email before getting a session');
console.log('     - auth.uid() is NULL until confirmation');
console.log('     - Cannot insert profile during signup');
console.log('     - Need to handle profile creation AFTER confirmation');
console.log('');
console.log('   If DISABLED:');
console.log('     - Session created immediately');
console.log('     - auth.uid() available during signup');
console.log('     - Profile insert should work');
console.log('');
console.log('2. Check the actual RLS policy on profiles table:');
console.log('   Go to: Database → Tables → profiles → RLS');
console.log('   Check: Policy for INSERT operations');
console.log('   Should be: USING (auth.uid() = id)');
console.log('');
