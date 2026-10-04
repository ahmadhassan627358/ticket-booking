const { execSync } = require('child_process');

try {
  console.log('Running prisma db push / migrate...');
  const output = execSync('node node_modules/prisma/build/index.js db push --accept-data-loss', {
    stdio: 'pipe',
    env: { ...process.env, CHECKPOINT_DISABLE: '1', PRISMA_TELEMETRY_INFORMATION_CHECK: '0' }
  });
  console.log(output.toString());
  console.log('Migration successful!');
} catch (err) {
  console.error('Error running migration:', err.stdout ? err.stdout.toString() : err.message);
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}
