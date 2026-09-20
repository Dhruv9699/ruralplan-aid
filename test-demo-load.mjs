import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('======================================================================');
console.log('DEMO DATA LOAD TEST');
console.log('======================================================================');

// Test data - matching demo.ts structure
const testProducts = [
  {
    user_id: '00000000-0000-0000-0000-000000000000', // Will be replaced
    product_name: 'Test Pickle',
    raw_material_name: 'Mango',
    unit: 'jar',
    production_capacity: 100,
    minimum_stock: 30,
    current_stock: 80,
    production_cost: 45,
    shelf_life: 365,
    workers: 4,
    raw_per_unit: 0.6,
    raw_unit: 'kg',
  },
];

async function testDemoLoad() {
  try {
    // Step 1: Check if we can authenticate (simulated - you'll need to provide test credentials)
    console.log('\n1. Checking authentication...');
    console.log('⚠️  Note: This test uses anonymous client. Actual error may differ with authenticated user.');
    
    // Step 2: Check if profiles table is accessible
    console.log('\n2. Testing profiles table access...');
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', {
        message: profilesError.message,
        code: profilesError.code,
        details: profilesError.details,
        hint: profilesError.hint,
      });
    } else {
      console.log('✅ Profiles table accessible');
      console.log('   Found rows:', profilesTest?.length || 0);
    }

    // Step 3: Test product insert with fake user_id
    console.log('\n3. Testing products table insert (with fake user_id)...');
    const { data: productInsert, error: productError } = await supabase
      .from('products')
      .insert(testProducts)
      .select();
    
    if (productError) {
      console.error('❌ Products insert error:', {
        message: productError.message,
        code: productError.code,
        details: productError.details,
        hint: productError.hint,
      });
      console.log('\n⚠️  This is likely the actual error causing Load Demo Data to fail!');
    } else {
      console.log('✅ Products insert succeeded');
      console.log('   Inserted:', productInsert);
    }

    // Step 4: Check RLS policies
    console.log('\n4. Checking RLS status...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    if (rlsError) {
      console.error('❌ RLS check error:', {
        message: rlsError.message,
        code: rlsError.code,
      });
    } else {
      console.log('✅ Can query products table');
      console.log('   Visible rows:', rlsCheck?.length || 0);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }

  console.log('\n======================================================================');
  console.log('TEST COMPLETE');
  console.log('======================================================================');
  console.log('\nTo get the REAL error with authenticated user:');
  console.log('1. Open browser DevTools Console');
  console.log('2. Log in to the app');
  console.log('3. Go to Settings → Click "Load Demo Data"');
  console.log('4. Check console for error details');
  console.log('5. Look for lines starting with "Products insert error:" or "Inventory insert error:"');
}

testDemoLoad();
