import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["@aikidosec/firewall", "pptx-automizer"],
  outputFileTracingIncludes: {
    "/api/export/pptx": ["./templates/pptx/base.pptx"],
  },
};

export default nextConfig;
