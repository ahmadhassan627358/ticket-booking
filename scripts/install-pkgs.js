const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const packages = [
  { name: "pdf-lib", url: "https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz" },
  { name: "@pdf-lib/standard-fonts", url: "https://registry.npmjs.org/@pdf-lib/standard-fonts/-/standard-fonts-1.0.0.tgz" },
  { name: "@pdf-lib/upng", url: "https://registry.npmjs.org/@pdf-lib/upng/-/upng-1.0.1.tgz" },
  { name: "pako", url: "https://registry.npmjs.org/pako/-/pako-1.0.11.tgz" },
  { name: "tslib", url: "https://registry.npmjs.org/tslib/-/tslib-1.14.1.tgz" },
  { name: "qrcode", url: "https://registry.npmjs.org/qrcode/-/qrcode-1.5.4.tgz" },
  { name: "dijkstrajs", url: "https://registry.npmjs.org/dijkstrajs/-/dijkstrajs-1.0.3.tgz" },
  { name: "pngjs", url: "https://registry.npmjs.org/pngjs/-/pngjs-5.0.0.tgz" },
  { name: "@types/qrcode", url: "https://registry.npmjs.org/@types/qrcode/-/qrcode-1.5.5.tgz" },
];

for (const pkg of packages) {
  const targetDir = path.join(__dirname, "..", "node_modules", pkg.name);
  fs.mkdirSync(targetDir, { recursive: true });
  const tgzFile = path.join(__dirname, `tmp_${pkg.name.replace(/[@/]/g, "_")}.tgz`);
  console.log(`Downloading ${pkg.name}...`);
  execSync(`curl.exe -s -L "${pkg.url}" -o "${tgzFile}"`);
  console.log(`Extracting ${pkg.name}...`);
  execSync(`tar.exe -xzf "${tgzFile}" -C "${targetDir}" --strip-components=1`);
  try { fs.unlinkSync(tgzFile); } catch {}
  console.log(`✅ ${pkg.name} installed`);
}

console.log("All dependencies installed!");
