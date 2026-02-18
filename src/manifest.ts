import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "AI Resume Helper",
  description:
    "Auto-capture job descriptions and tailor your resume with ATS-optimized output.",
  version: "0.1.0",
  action: {
    default_title: "AI Resume Helper",
    default_popup: "src/pages/popup/index.html"
  },
  options_page: "src/pages/options/index.html",
  permissions: [
    "storage",
    "activeTab",
    "scripting",
    "downloads",
    "tabs",
    "permissions"
  ],
  host_permissions: [
    "https://www.linkedin.com/*",
    "https://www.naukri.com/*",
    "https://*.naukri.com/*"
  ],
  optional_host_permissions: ["https://*/*", "http://*/*"],
  background: {
    service_worker: "src/background/serviceWorker.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: [
        "https://www.linkedin.com/*",
        "https://www.naukri.com/*",
        "https://*.naukri.com/*"
      ],
      js: ["src/content/jobCapture.ts"],
      run_at: "document_idle"
    }
  ]
};

export default manifest;

