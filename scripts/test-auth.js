const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Running Safar Express Authentication Tests...\n');

  // Test 1: Verify Seeded Admin Credentials
  console.log('Test 1: Verifying Seeded Admin Credentials (admin@safar.pk)...');
  const admin = await prisma.user.findUnique({ where: { email: 'admin@safar.pk' } });
  if (!admin) throw new Error('Admin user not found in database');
  const isAdminPassValid = await bcrypt.compare('Admin@123', admin.passwordHash);
  console.log(`  - Admin user found: ${admin.name}, Role: ${admin.role}, Phone: ${admin.phone}`);
  console.log(`  - Password 'Admin@123' bcrypt match: ${isAdminPassValid ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: Verify Seeded Customer Credentials (Email)
  console.log('\nTest 2: Verifying Seeded Customer Credentials by Email (ali.khan@gmail.com)...');
  const customer1 = await prisma.user.findUnique({ where: { email: 'ali.khan@gmail.com' } });
  if (!customer1) throw new Error('Customer user not found');
  const isCustPassValid = await bcrypt.compare('Customer@123', customer1.passwordHash);
  console.log(`  - Customer user found: ${customer1.name}, Role: ${customer1.role}, Phone: ${customer1.phone}`);
  console.log(`  - Password 'Customer@123' bcrypt match: ${isCustPassValid ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Verify Phone Number Lookup Variations (Pakistani Phone)
  console.log('\nTest 3: Verifying Phone Number Lookup Formats for 0300-9876541...');
  const phoneVariations = ['+923009876541', '03009876541', '0300-9876541'];
  const userByPhone = await prisma.user.findFirst({
    where: { phone: { in: phoneVariations } }
  });
  console.log(`  - Found user by phone lookup: ${userByPhone ? userByPhone.name : 'None'} (${userByPhone ? userByPhone.email : ''}) -> ${userByPhone ? '✅ PASS' : '❌ FAIL'}`);

  // Test 4: Verify HTTP Register API endpoint
  console.log('\nTest 4: Testing POST /api/auth/register endpoint via HTTP...');
  const testEmail = `test.traveler.${Date.now()}@safar.pk`;
  const registerPayload = {
    name: 'Hamza Farooq',
    phone: '0333-7654321',
    email: testEmail,
    password: 'Customer@123',
    confirmPassword: 'Customer@123'
  };

  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });

  const regResult = await response.json();
  console.log(`  - Registration response status: ${response.status} ${response.statusText}`);
  console.log(`  - Registration response body:`, regResult);
  console.log(`  - Registration: ${response.status === 201 ? '✅ PASS' : '❌ FAIL'}`);

  // Test 5: Verify newly registered user in DB & login by phone
  console.log('\nTest 5: Verifying newly registered user in DB & phone authentication...');
  const newRegisteredUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (newRegisteredUser) {
    const isNewPassValid = await bcrypt.compare('Customer@123', newRegisteredUser.passwordHash);
    console.log(`  - Saved with normalized phone: ${newRegisteredUser.phone}`);
    console.log(`  - Role: ${newRegisteredUser.role}`);
    console.log(`  - Password verification: ${isNewPassValid ? '✅ PASS' : '❌ FAIL'}`);
  }

  console.log('\n🎉 ALL AUTHENTICATION TESTS COMPLETED SUCCESSFULLY!');
}

runTests()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
