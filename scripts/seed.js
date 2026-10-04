const { execSync } = require('child_process');

try {
  console.log('Running database seed...');
  const output = execSync('node node_modules/tsx/dist/cli.mjs prisma/seed.ts', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('Seeding script finished.');
} catch (err) {
  console.error('Error seeding:', err.message);
  process.exit(1);
}
