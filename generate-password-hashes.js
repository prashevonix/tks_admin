
const bcrypt = require('bcrypt');

async function generateHashes() {
  const adminHash = await bcrypt.hash('Evonix@287', 10);
  const userHash = await bcrypt.hash('Vansh@123', 10);
  
  console.log('Admin password hash:', adminHash);
  console.log('User password hash:', userHash);
  
  console.log('\n-- SQL Commands with correct hashes:');
  console.log(`
-- Create Admin User
INSERT INTO users (id, username, email, password, is_admin, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'kalyani@evonix.co',
  'kalyani@evonix.co',
  '${adminHash}',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  updated_at = NOW();

-- Create Test User
INSERT INTO users (id, username, email, password, is_admin, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'vanshaj@kalyani.com',
  'vanshaj@kalyani.com',
  '${userHash}',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  updated_at = NOW();

-- Create Alumni profile for test user
INSERT INTO alumni (user_id, first_name, last_name, email, graduation_year, batch, is_profile_public, is_verified, is_active)
SELECT id, 'Vanshaj', 'Kalyani', 'vanshaj@kalyani.com', 2020, '2020', true, true, true
FROM users
WHERE email = 'vanshaj@kalyani.com'
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();
  `);
}

generateHashes();
