import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("node_modules/@aikidosec/firewall");
const targetDirectory = resolve(".next/standalone/node_modules/@aikidosec");

await mkdir(targetDirectory, { recursive: true });
await cp(source, resolve(targetDirectory, "firewall"), { recursive: true });
