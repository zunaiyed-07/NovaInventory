import { mkdirSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const certDir = join(root, "certs");
const certPath = join(certDir, "lan.pem");
const keyPath = join(certDir, "lan-key.pem");
const addresses = [
  ...new Set(
    Object.values(networkInterfaces())
      .flatMap((interfaces) => interfaces ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => address.address),
  ),
];

if (addresses.length === 0) {
  console.error("No LAN IPv4 address found. Connect to Wi-Fi or Ethernet and try again.");
  process.exit(1);
}

const run = (args) => spawnSync("mkcert", args, { stdio: "inherit" });

try {
  const install = run(["-install"]);
  if (install.error) throw install.error;
  if (install.status !== 0) process.exit(install.status ?? 1);

  mkdirSync(certDir, { recursive: true });
  const generate = run([
    "-cert-file",
    certPath,
    "-key-file",
    keyPath,
    "localhost",
    "127.0.0.1",
    ...addresses,
  ]);
  if (generate.error) throw generate.error;
  if (generate.status !== 0) process.exit(generate.status ?? 1);
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(
      "mkcert is required to create a trusted local HTTPS certificate. Install mkcert, then run npm run https:setup again.",
    );
    process.exit(1);
  }
  throw error;
}

const rootCA = spawnSync("mkcert", ["-CAROOT"], { encoding: "utf8" });
if (rootCA.error || rootCA.status !== 0) {
  console.error(
    "The LAN certificate was created, but mkcert could not locate its root certificate.",
  );
  process.exit(1);
}

console.log(`HTTPS certificate covers localhost and ${addresses.join(", ")}.`);
console.log(
  `Trust the mkcert root certificate on each mobile device from: ${rootCA.stdout.trim()}`,
);
console.log("Restart npm run start:all, then open the https:// URL shown by Vite.");
