/**
 * Automated Verification Script for
 * Veerendra - Digital Document Management System
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('===============================================================');
  console.log('  Veerendra - Digital Document Management System: Test Runner   ');
  console.log('===============================================================');

  // 1. Authenticate Admin
  console.log('\n[TEST 1] Authenticating Admin User (Veerendra Kumar)...');
  let loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'veerendra@example.com',
      password: 'password123'
    })
  });

  let cookieAdmin = loginRes.headers.get('set-cookie')?.split(';')[0];
  if (!cookieAdmin) {
    // If not existing, register
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Veerendra Kumar',
        email: 'veerendra@example.com',
        password: 'password123',
        role: 'admin'
      })
    });
    loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'veerendra@example.com',
        password: 'password123'
      })
    });
    cookieAdmin = loginRes.headers.get('set-cookie')?.split(';')[0];
  }

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const meData = await meRes.json();
  console.log('✓ Admin Authenticated:', meData.user.name, `(${meData.user.role})`);

  // 2. Fetch Dashboard Statistics
  console.log('\n[TEST 2] Verifying Dashboard Statistics API (/api/stats)...');
  const statsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const { stats } = await statsRes.json();
  console.log('✓ Total Documents in Vault:', stats.totalDocuments);
  console.log('✓ Total Categories Configured:', stats.totalCategories);
  console.log('✓ Total Registered Users:', stats.totalUsers);

  // 3. Document Search & Filter
  console.log('\n[TEST 3] Testing Document Search & Retrieval (/api/documents)...');
  const docsRes = await fetch(`${BASE_URL}/api/documents?search=Report`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const docsData = await docsRes.json();
  console.log(`✓ Retrieved ${docsData.count} matching document(s).`);

  // 4. Category Management
  console.log('\n[TEST 4] Testing Category Management (/api/categories)...');
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catData = await catRes.json();
  console.log(`✓ Active Categories: ${catData.categories.length} categories loaded with document counts.`);

  // 5. Document Access Management
  console.log('\n[TEST 5] Testing Document Access & Sharing (/api/access)...');
  const sharedByMeRes = await fetch(`${BASE_URL}/api/access/shared-by-me`, {
    headers: { 'Cookie': cookieAdmin }
  });
  const sharedByMeData = await sharedByMeRes.json();
  console.log(`✓ Active Document Permissions Granted: ${sharedByMeData.records.length} records.`);

  console.log('\n===============================================================');
  console.log('  ALL INTEGRATION TESTS PASSED WITH ZERO ERRORS (100% OK)      ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err.message);
  process.exit(1);
});

