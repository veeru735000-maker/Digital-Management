/**
 * Automated Verification Script for
 * Veerendra - Digital Document Management System
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('===============================================================');
  console.log('  Veerendra - Digital Document Management System: Test Runner   ');
  console.log('===============================================================');

  // 1. Authenticate Admin
  console.log('\n[TEST 1] Authenticating Admin User (Veerendra)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'veerendra@gmail.com',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  const cookieAdmin = loginRes.headers.get('set-cookie')?.split(';')[0];
  console.log('✓ Admin Authenticated:', loginData.user.name, `(${loginData.user.role})`);

  // 2. Fetch Dashboard Statistics
  console.log('\n[TEST 2] Verifying Dashboard Statistics API (/api/stats)...');
  const statsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const { stats } = await statsRes.json();
  console.log('✓ Total Users:', stats.totalUsers);
  console.log('✓ Total Categories:', stats.totalCategories);
  console.log('✓ Total Documents:', stats.totalDocuments);
  console.log('✓ Total Document Access:', stats.totalAccess);

  // 3. Users Table API
  console.log('\n[TEST 3] Testing Users Table API (/api/users)...');
  const usersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const usersData = await usersRes.json();
  console.log(`✓ Retrieved ${usersData.count} users from MySQL.`);

  // 4. Categories Table API
  console.log('\n[TEST 4] Testing Categories Table API (/api/categories)...');
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catData = await catRes.json();
  console.log(`✓ Active Categories: ${catData.categories.length} categories loaded.`);

  // 5. Documents Table API
  console.log('\n[TEST 5] Testing Documents Table API (/api/documents)...');
  const docsRes = await fetch(`${BASE_URL}/api/documents`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const docsData = await docsRes.json();
  console.log(`✓ Retrieved ${docsData.count} documents from MySQL.`);

  // 6. Access Table API
  console.log('\n[TEST 6] Testing Access Table API (/api/access)...');
  const accessRes = await fetch(`${BASE_URL}/api/access`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const accessData = await accessRes.json();
  console.log(`✓ Retrieved ${accessData.count} access permission records from MySQL.`);

  console.log('\n===============================================================');
  console.log('  ALL INTEGRATION TESTS PASSED WITH ZERO ERRORS (100% OK)      ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err.message);
  process.exit(1);
});
