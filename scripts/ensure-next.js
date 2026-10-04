const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next'))) {
  console.log('Ensuring next package is fully extracted...');
  if (!fs.existsSync('next-cache.tgz')) {
    execSync('curl.exe -s -L -o next-cache.tgz https://registry.npmjs.org/next/-/next-14.2.13.tgz');
  }
  const nextDest = path.join(process.cwd(), 'node_modules', 'next');
  fs.mkdirSync(nextDest, { recursive: true });
  execSync(`tar -xzf next-cache.tgz -C "${nextDest}" --strip-components=1`);
  console.log('Next.js intact!');
}
