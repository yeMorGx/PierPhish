// OpenNext Cloudflare config. Required by `opennextjs-cloudflare build`.
// No R2 incremental cache is configured yet, so ISR/revalidation caching is off.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
