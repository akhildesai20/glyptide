import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = join(root, "..");
const src = join(pkg, "src", "styles.css");
const dest = join(pkg, "dist", "styles.css");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("copied styles.css → dist/styles.css");
