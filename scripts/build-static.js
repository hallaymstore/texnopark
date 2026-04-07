const fs = require("fs/promises");
const path = require("path");

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    return false;
  }
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(from, to);
      continue;
    }

    await fs.copyFile(from, to);
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const distDir = path.join(rootDir, "dist");
  const publicDir = path.join(rootDir, "public");
  const adminDir = path.join(rootDir, "admin");

  await fs.rm(distDir, { recursive: true, force: true });
  await copyDirectory(publicDir, distDir);

  if (await pathExists(adminDir)) {
    await copyDirectory(adminDir, path.join(distDir, "admin"));
  }

  const rootGoogleFile = path.join(rootDir, "googled4602777232da8ce.html");
  const distGoogleFile = path.join(distDir, "googled4602777232da8ce.html");

  if ((await pathExists(rootGoogleFile)) && !(await pathExists(distGoogleFile))) {
    await fs.copyFile(rootGoogleFile, distGoogleFile);
  }

  process.stdout.write("Static assets dist/ papkasiga tayyorlandi.\n");
}

main().catch((error) => {
  console.error("Static build xatoligi:", error);
  process.exit(1);
});
