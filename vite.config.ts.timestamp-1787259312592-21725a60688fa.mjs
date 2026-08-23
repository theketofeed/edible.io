// vite.config.ts
import { defineConfig } from "file:///C:/Users/Admin/Desktop/Edible.io/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Admin/Desktop/Edible.io/node_modules/@vitejs/plugin-react/dist/index.js";
import fs2 from "node:fs";
import path2 from "node:path";

// scripts/prerender-plugin.mjs
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "file:///C:/Users/Admin/Desktop/Edible.io/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import chromium from "file:///C:/Users/Admin/Desktop/Edible.io/node_modules/@sparticuz/chromium/build/index.js";
async function resolveBrowserPath() {
  if (process.platform !== "win32") {
    return chromium.executablePath();
  }
  const candidates = [
    path.join(process.env["PROGRAMFILES"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["LOCALAPPDATA"] || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["PROGRAMFILES"] || "", "Microsoft", "Edge", "Application", "msedge.exe")
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("[prerender] No Chrome or Edge found on Windows. Install Chrome or Edge to run the prerender.");
}
var ROUTES = [
  { path: "/", contentMarker: "Turn your groceries into meal plans instantly", h1Prefix: "Turn your groceries" },
  { path: "/pricing", contentMarker: "Simple Pricing", h1Prefix: null },
  { path: "/how-it-works", contentMarker: "From groceries to meal plans", h1Prefix: null },
  { path: "/faq", contentMarker: "Frequently Asked Questions", h1Prefix: null },
  { path: "/blog/best-meal-planning-apps", contentMarker: "5 Best Meal Planning Apps in 2026", h1Prefix: null },
  { path: "/blog", contentMarker: "Blog", h1Prefix: null }
];
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json"
};
function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || "").split("?")[0]);
    if (pathname.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const filePath = path.join(rootDir, pathname === "/" ? "index.html" : pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(rootDir, "index.html"), (err2, indexData) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store"
          });
          res.end(indexData);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}
function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
function prerenderHomepagePlugin() {
  let distDir = "";
  return {
    name: "edible-prerender-homepage",
    apply: "build",
    configResolved(config) {
      distDir = path.resolve(config.root, config.build.outDir || "dist");
    },
    async closeBundle() {
      if (process.env.SKIP_PRERENDER) return;
      await prerenderHomepage(distDir);
    }
  };
}
async function prerenderHomepage(distDir) {
  const indexHtmlPath = path.join(distDir, "index.html");
  const shellHtmlPath = path.join(distDir, "shell.html");
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error("[prerender] dist/index.html not found after build \u2014 cannot prerender.");
  }
  fs.copyFileSync(indexHtmlPath, shellHtmlPath);
  const { server, port } = await startStaticServer(distDir);
  let browser;
  try {
    const execPath = await resolveBrowserPath();
    browser = await puppeteer.launch({
      executablePath: execPath,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      try {
        const { hostname } = new URL(request.url());
        if (hostname === "127.0.0.1" || hostname === "localhost") {
          request.continue();
        } else {
          request.abort();
        }
      } catch {
        request.abort();
      }
    });
    for (const route of ROUTES) {
      const url = `http://127.0.0.1:${port}${route.path}`;
      const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 6e4 });
      if (!response || response.status() !== 200) {
        throw new Error(`[prerender] ${route.path} returned ${response ? response.status() : "no response"}`);
      }
      if (route.h1Prefix) {
        await page.waitForFunction(
          (prefix) => {
            const h1 = document.querySelector("h1");
            return !!(h1 && h1.textContent.includes(prefix));
          },
          { timeout: 3e4 },
          route.h1Prefix
        );
      } else {
        await page.waitForFunction(
          () => {
            const root = document.getElementById("root");
            return root && root.children.length > 0 && root.textContent.trim().length > 100;
          },
          { timeout: 3e4 }
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
      const html = "<!doctype html>\n" + await page.evaluate(() => document.documentElement.outerHTML);
      const hasContent = await page.evaluate((marker) => {
        const text = document.body ? document.body.textContent || "" : "";
        return text.replace(/\s+/g, " ").includes(marker.replace(/\s+/g, " "));
      }, route.contentMarker);
      if (!hasContent) {
        const h1Text = await page.evaluate(() => document.querySelector("h1")?.textContent);
        fs.writeFileSync(path.join(distDir, "prerender-debug.html"), html, "utf8");
        throw new Error(
          `[prerender] rendered HTML for ${route.path} is missing expected content ("${route.contentMarker}"). h1 textContent: ${JSON.stringify(h1Text)}. Debug dump written to dist/prerender-debug.html`
        );
      }
      if (html.includes('<div id="root"></div>')) {
        throw new Error(`[prerender] rendered HTML for ${route.path} still has an empty #root \u2014 nothing was rendered.`);
      }
      const outPath = route.path === "/" ? indexHtmlPath : path.join(distDir, route.path.replace(/^\//, ""), "index.html");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, html, "utf8");
      console.log(
        `[prerender] ${route.path} -> ${path.relative(distDir, outPath)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`
      );
    }
  } finally {
    if (browser) await browser.close();
    await closeServer(server);
  }
}

// vite.config.ts
function spaShellPreviewFallback() {
  let distDir = "";
  return {
    name: "spa-shell-preview-fallback",
    configResolved(config) {
      distDir = path2.resolve(config.root, config.build.outDir || "dist");
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.method === "GET" || req.method === "HEAD") {
          const pathname = (req.url || "").split("?")[0];
          if (pathname !== "/" && pathname !== "/index.html" && path2.extname(pathname) === "" && fs2.existsSync(path2.join(distDir, "shell.html"))) {
            req.url = "/shell.html";
          }
        }
        next();
      });
    }
  };
}
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react(), prerenderHomepagePlugin(), spaShellPreviewFallback()],
  server: {
    port: 5173
  },
  preview: {
    port: 5173
  },
  esbuild: {
    drop: ["console", "debugger"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2NyaXB0cy9wcmVyZW5kZXItcGx1Z2luLm1qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFkbWluXFxcXERlc2t0b3BcXFxcRWRpYmxlLmlvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEZXNrdG9wXFxcXEVkaWJsZS5pb1xcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWRtaW4vRGVza3RvcC9FZGlibGUuaW8vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJ1xyXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnXHJcbmltcG9ydCBwcmVyZW5kZXJIb21lcGFnZSBmcm9tICcuL3NjcmlwdHMvcHJlcmVuZGVyLXBsdWdpbi5tanMnXHJcblxyXG4vLyBEdXJpbmcgYHZpdGUgcHJldmlld2AsIHNlcnZlIHRoZSBwbGFpbiBTUEEgc2hlbGwgKGRpc3Qvc2hlbGwuaHRtbCkgZm9yIGFueVxyXG4vLyByb3V0ZSBvdGhlciB0aGFuIHRoZSBwcmVyZW5kZXJlZCBob21lcGFnZS4gVGhlIGJ1aWxkIGVtaXRzIGRpc3QvaW5kZXguaHRtbFxyXG4vLyBhcyB0aGUgZnVsbHktcmVuZGVyZWQgaG9tZXBhZ2UgYW5kIGRpc3Qvc2hlbGwuaHRtbCBhcyB0aGUgb3JpZ2luYWwgc2hlbGw7XHJcbi8vIHdpdGhvdXQgdGhpcywgYHZpdGUgcHJldmlld2Agd291bGQgZmFsbCBiYWNrIHRvIGluZGV4Lmh0bWwgZm9yIGV2ZXJ5IHJvdXRlLlxyXG5mdW5jdGlvbiBzcGFTaGVsbFByZXZpZXdGYWxsYmFjaygpIHtcclxuXHRsZXQgZGlzdERpciA9ICcnXHJcblx0cmV0dXJuIHtcclxuXHRcdG5hbWU6ICdzcGEtc2hlbGwtcHJldmlldy1mYWxsYmFjaycsXHJcblx0XHRjb25maWdSZXNvbHZlZChjb25maWcpIHtcclxuXHRcdFx0ZGlzdERpciA9IHBhdGgucmVzb2x2ZShjb25maWcucm9vdCwgY29uZmlnLmJ1aWxkLm91dERpciB8fCAnZGlzdCcpXHJcblx0XHR9LFxyXG5cdFx0Y29uZmlndXJlUHJldmlld1NlcnZlcihzZXJ2ZXIpIHtcclxuXHRcdFx0c2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCBfcmVzLCBuZXh0KSA9PiB7XHJcblx0XHRcdFx0aWYgKHJlcS5tZXRob2QgPT09ICdHRVQnIHx8IHJlcS5tZXRob2QgPT09ICdIRUFEJykge1xyXG5cdFx0XHRcdFx0Y29uc3QgcGF0aG5hbWUgPSAocmVxLnVybCB8fCAnJykuc3BsaXQoJz8nKVswXVxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwYXRobmFtZSAhPT0gJy8nICYmXHJcblx0XHRcdFx0XHRcdHBhdGhuYW1lICE9PSAnL2luZGV4Lmh0bWwnICYmXHJcblx0XHRcdFx0XHRcdHBhdGguZXh0bmFtZShwYXRobmFtZSkgPT09ICcnICYmXHJcblx0XHRcdFx0XHRcdGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGRpc3REaXIsICdzaGVsbC5odG1sJykpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0cmVxLnVybCA9ICcvc2hlbGwuaHRtbCdcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV4dCgpXHJcblx0XHRcdH0pXHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJhc2U6ICcvJyxcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgcHJlcmVuZGVySG9tZXBhZ2UoKSwgc3BhU2hlbGxQcmV2aWV3RmFsbGJhY2soKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczXHJcbiAgfSxcclxuICBwcmV2aWV3OiB7XHJcbiAgICBwb3J0OiA1MTczXHJcbiAgfSxcclxuICBlc2J1aWxkOiB7XHJcbiAgICBkcm9wOiBbJ2NvbnNvbGUnLCAnZGVidWdnZXInXVxyXG4gIH1cclxufSlcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEZXNrdG9wXFxcXEVkaWJsZS5pb1xcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBZG1pblxcXFxEZXNrdG9wXFxcXEVkaWJsZS5pb1xcXFxzY3JpcHRzXFxcXHByZXJlbmRlci1wbHVnaW4ubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9BZG1pbi9EZXNrdG9wL0VkaWJsZS5pby9zY3JpcHRzL3ByZXJlbmRlci1wbHVnaW4ubWpzXCI7aW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgaHR0cCBmcm9tICdub2RlOmh0dHAnXG5pbXBvcnQgb3MgZnJvbSAnbm9kZTpvcydcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCBwdXBwZXRlZXIgZnJvbSAncHVwcGV0ZWVyLWNvcmUnXG5pbXBvcnQgY2hyb21pdW0gZnJvbSAnQHNwYXJ0aWN1ei9jaHJvbWl1bSdcblxuYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUJyb3dzZXJQYXRoKCkge1xuXHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuXHRcdC8vIExpbnV4IC8gbWFjT1M6IHVzZSBAc3BhcnRpY3V6L2Nocm9taXVtJ3MgYnVuZGxlZCBiaW5hcnkgKHdvcmtzIG9uIFZlcmNlbCkuXG5cdFx0cmV0dXJuIGNocm9taXVtLmV4ZWN1dGFibGVQYXRoKClcblx0fVxuXHQvLyBXaW5kb3dzOiBmaW5kIGEgbG9jYWwgQ2hyb21lIC8gRWRnZSBpbnN0YWxsYXRpb24uXG5cdGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG5cdFx0cGF0aC5qb2luKHByb2Nlc3MuZW52WydQUk9HUkFNRklMRVMnXSB8fCAnJywgJ0dvb2dsZScsICdDaHJvbWUnLCAnQXBwbGljYXRpb24nLCAnY2hyb21lLmV4ZScpLFxuXHRcdHBhdGguam9pbihwcm9jZXNzLmVudlsnTE9DQUxBUFBEQVRBJ10gfHwgJycsICdHb29nbGUnLCAnQ2hyb21lJywgJ0FwcGxpY2F0aW9uJywgJ2Nocm9tZS5leGUnKSxcblx0XHRwYXRoLmpvaW4ocHJvY2Vzcy5lbnZbJ1BST0dSQU1GSUxFUyhYODYpJ10gfHwgJycsICdNaWNyb3NvZnQnLCAnRWRnZScsICdBcHBsaWNhdGlvbicsICdtc2VkZ2UuZXhlJyksXG5cdFx0cGF0aC5qb2luKHByb2Nlc3MuZW52WydQUk9HUkFNRklMRVMnXSB8fCAnJywgJ01pY3Jvc29mdCcsICdFZGdlJywgJ0FwcGxpY2F0aW9uJywgJ21zZWRnZS5leGUnKSxcblx0XVxuXHRmb3IgKGNvbnN0IHAgb2YgY2FuZGlkYXRlcykge1xuXHRcdGlmIChmcy5leGlzdHNTeW5jKHApKSByZXR1cm4gcFxuXHR9XG5cdHRocm93IG5ldyBFcnJvcignW3ByZXJlbmRlcl0gTm8gQ2hyb21lIG9yIEVkZ2UgZm91bmQgb24gV2luZG93cy4gSW5zdGFsbCBDaHJvbWUgb3IgRWRnZSB0byBydW4gdGhlIHByZXJlbmRlci4nKVxufVxuXG5jb25zdCBST1VURVMgPSBbXG5cdHsgcGF0aDogJy8nLCBjb250ZW50TWFya2VyOiAnVHVybiB5b3VyIGdyb2NlcmllcyBpbnRvIG1lYWwgcGxhbnMgaW5zdGFudGx5JywgaDFQcmVmaXg6ICdUdXJuIHlvdXIgZ3JvY2VyaWVzJyB9LFxuXHR7IHBhdGg6ICcvcHJpY2luZycsIGNvbnRlbnRNYXJrZXI6ICdTaW1wbGUgUHJpY2luZycsIGgxUHJlZml4OiBudWxsIH0sXG5cdHsgcGF0aDogJy9ob3ctaXQtd29ya3MnLCBjb250ZW50TWFya2VyOiAnRnJvbSBncm9jZXJpZXMgdG8gbWVhbCBwbGFucycsIGgxUHJlZml4OiBudWxsIH0sXG5cdHsgcGF0aDogJy9mYXEnLCBjb250ZW50TWFya2VyOiAnRnJlcXVlbnRseSBBc2tlZCBRdWVzdGlvbnMnLCBoMVByZWZpeDogbnVsbCB9LFxuXHR7IHBhdGg6ICcvYmxvZy9iZXN0LW1lYWwtcGxhbm5pbmctYXBwcycsIGNvbnRlbnRNYXJrZXI6ICc1IEJlc3QgTWVhbCBQbGFubmluZyBBcHBzIGluIDIwMjYnLCBoMVByZWZpeDogbnVsbCB9LFxuXHR7IHBhdGg6ICcvYmxvZycsIGNvbnRlbnRNYXJrZXI6ICdCbG9nJywgaDFQcmVmaXg6IG51bGwgfSxcbl1cblxuY29uc3QgTUlNRV9UWVBFUyA9IHtcblx0Jy5odG1sJzogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXG5cdCcuanMnOiAndGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04Jyxcblx0Jy5tanMnOiAndGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04Jyxcblx0Jy5jc3MnOiAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnLFxuXHQnLmpzb24nOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcsXG5cdCcucG5nJzogJ2ltYWdlL3BuZycsXG5cdCcuanBnJzogJ2ltYWdlL2pwZWcnLFxuXHQnLmpwZWcnOiAnaW1hZ2UvanBlZycsXG5cdCcud2VicCc6ICdpbWFnZS93ZWJwJyxcblx0Jy5hdmlmJzogJ2ltYWdlL2F2aWYnLFxuXHQnLmdpZic6ICdpbWFnZS9naWYnLFxuXHQnLnN2Zyc6ICdpbWFnZS9zdmcreG1sJyxcblx0Jy5pY28nOiAnaW1hZ2UveC1pY29uJyxcblx0Jy53b2ZmJzogJ2ZvbnQvd29mZicsXG5cdCcud29mZjInOiAnZm9udC93b2ZmMicsXG5cdCcudHRmJzogJ2ZvbnQvdHRmJyxcblx0Jy50eHQnOiAndGV4dC9wbGFpbjsgY2hhcnNldD11dGYtOCcsXG5cdCcueG1sJzogJ2FwcGxpY2F0aW9uL3htbDsgY2hhcnNldD11dGYtOCcsXG5cdCcubWFwJzogJ2FwcGxpY2F0aW9uL2pzb24nXG59XG5cbmZ1bmN0aW9uIHN0YXJ0U3RhdGljU2VydmVyKHJvb3REaXIpIHtcblx0Y29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIoKHJlcSwgcmVzKSA9PiB7XG5cdFx0Y29uc3QgcGF0aG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQoKHJlcS51cmwgfHwgJycpLnNwbGl0KCc/JylbMF0pXG5cdFx0aWYgKHBhdGhuYW1lLmluY2x1ZGVzKCcuLicpKSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwMylcblx0XHRcdHJlcy5lbmQoJ0ZvcmJpZGRlbicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cdFx0Y29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4ocm9vdERpciwgcGF0aG5hbWUgPT09ICcvJyA/ICdpbmRleC5odG1sJyA6IHBhdGhuYW1lKVxuXHRcdGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdC8vIFNQQSBmYWxsYmFjazogc2VydmUgaW5kZXguaHRtbCBmb3IgY2xpZW50LXNpZGUgcm91dGluZ1xuXHRcdFx0XHRmcy5yZWFkRmlsZShwYXRoLmpvaW4ocm9vdERpciwgJ2luZGV4Lmh0bWwnKSwgKGVycjIsIGluZGV4RGF0YSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnIyKSB7XG5cdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwNClcblx0XHRcdFx0XHRcdHJlcy5lbmQoJ05vdCBmb3VuZCcpXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVzLndyaXRlSGVhZCgyMDAsIHtcblx0XHRcdFx0XHRcdCdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04Jyxcblx0XHRcdFx0XHRcdCdDYWNoZS1Db250cm9sJzogJ25vLXN0b3JlJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0cmVzLmVuZChpbmRleERhdGEpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKS50b0xvd2VyQ2FzZSgpXG5cdFx0XHRyZXMud3JpdGVIZWFkKDIwMCwge1xuXHRcdFx0XHQnQ29udGVudC1UeXBlJzogTUlNRV9UWVBFU1tleHRdIHx8ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxuXHRcdFx0XHQnQ2FjaGUtQ29udHJvbCc6ICduby1zdG9yZSdcblx0XHRcdH0pXG5cdFx0XHRyZXMuZW5kKGRhdGEpXG5cdFx0fSlcblx0fSlcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG5cdFx0c2VydmVyLmxpc3RlbigwLCAnMTI3LjAuMC4xJywgKCkgPT4gcmVzb2x2ZSh7IHNlcnZlciwgcG9ydDogc2VydmVyLmFkZHJlc3MoKS5wb3J0IH0pKVxuXHR9KVxufVxuXG5mdW5jdGlvbiBjbG9zZVNlcnZlcihzZXJ2ZXIpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXJ2ZXIuY2xvc2UoKCkgPT4gcmVzb2x2ZSgpKSlcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcHJlcmVuZGVySG9tZXBhZ2VQbHVnaW4oKSB7XG5cdGxldCBkaXN0RGlyID0gJydcblx0cmV0dXJuIHtcblx0XHRuYW1lOiAnZWRpYmxlLXByZXJlbmRlci1ob21lcGFnZScsXG5cdFx0YXBwbHk6ICdidWlsZCcsXG5cdFx0Y29uZmlnUmVzb2x2ZWQoY29uZmlnKSB7XG5cdFx0XHRkaXN0RGlyID0gcGF0aC5yZXNvbHZlKGNvbmZpZy5yb290LCBjb25maWcuYnVpbGQub3V0RGlyIHx8ICdkaXN0Jylcblx0XHR9LFxuXHRcdGFzeW5jIGNsb3NlQnVuZGxlKCkge1xuXHRcdFx0aWYgKHByb2Nlc3MuZW52LlNLSVBfUFJFUkVOREVSKSByZXR1cm5cblx0XHRcdGF3YWl0IHByZXJlbmRlckhvbWVwYWdlKGRpc3REaXIpXG5cdFx0fVxuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByZXJlbmRlckhvbWVwYWdlKGRpc3REaXIpIHtcblx0Y29uc3QgaW5kZXhIdG1sUGF0aCA9IHBhdGguam9pbihkaXN0RGlyLCAnaW5kZXguaHRtbCcpXG5cdGNvbnN0IHNoZWxsSHRtbFBhdGggPSBwYXRoLmpvaW4oZGlzdERpciwgJ3NoZWxsLmh0bWwnKVxuXG5cdGlmICghZnMuZXhpc3RzU3luYyhpbmRleEh0bWxQYXRoKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignW3ByZXJlbmRlcl0gZGlzdC9pbmRleC5odG1sIG5vdCBmb3VuZCBhZnRlciBidWlsZCBcdTIwMTQgY2Fubm90IHByZXJlbmRlci4nKVxuXHR9XG5cblx0Ly8gS2VlcCB0aGUgb3JpZ2luYWwgU1BBIHNoZWxsIHNvIG5vbi1yb290IHJvdXRlcyBjYW4gc3RpbGwgcmV0dXJuIGl0LlxuXHRmcy5jb3B5RmlsZVN5bmMoaW5kZXhIdG1sUGF0aCwgc2hlbGxIdG1sUGF0aClcblxuXHRjb25zdCB7IHNlcnZlciwgcG9ydCB9ID0gYXdhaXQgc3RhcnRTdGF0aWNTZXJ2ZXIoZGlzdERpcilcblx0bGV0IGJyb3dzZXJcblx0dHJ5IHtcblx0XHRjb25zdCBleGVjUGF0aCA9IGF3YWl0IHJlc29sdmVCcm93c2VyUGF0aCgpXG5cdFx0YnJvd3NlciA9IGF3YWl0IHB1cHBldGVlci5sYXVuY2goe1xuXHRcdFx0ZXhlY3V0YWJsZVBhdGg6IGV4ZWNQYXRoLFxuXHRcdFx0YXJnczogY2hyb21pdW0uYXJncyxcblx0XHRcdGRlZmF1bHRWaWV3cG9ydDogY2hyb21pdW0uZGVmYXVsdFZpZXdwb3J0LFxuXHRcdFx0aGVhZGxlc3M6IGNocm9taXVtLmhlYWRsZXNzLFxuXHRcdH0pXG5cdFx0Y29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpXG5cdFx0YXdhaXQgcGFnZS5zZXRWaWV3cG9ydCh7IHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDkwMCB9KVxuXG5cdFx0Ly8gT25seSBhbGxvdyByZXF1ZXN0cyB0byB0aGUgbG9jYWwgcHJldmlldyBzZXJ2ZXIuIEV2ZXJ5dGhpbmcgZWxzZVxuXHRcdC8vIChTdXBhYmFzZSwgUG9zdEhvZywgU2VudHJ5LCBmb250cywgZXRjLikgaXMgYmxvY2tlZCBzbyB0aGUgcHJlcmVuZGVyXG5cdFx0Ly8gaXMgZGV0ZXJtaW5pc3RpYyBhbmQgZG9lc24ndCBlbWl0IGFuYWx5dGljcy90ZWxlbWV0cnkuXG5cdFx0YXdhaXQgcGFnZS5zZXRSZXF1ZXN0SW50ZXJjZXB0aW9uKHRydWUpXG5cdFx0cGFnZS5vbigncmVxdWVzdCcsIChyZXF1ZXN0KSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCB7IGhvc3RuYW1lIH0gPSBuZXcgVVJMKHJlcXVlc3QudXJsKCkpXG5cdFx0XHRcdGlmIChob3N0bmFtZSA9PT0gJzEyNy4wLjAuMScgfHwgaG9zdG5hbWUgPT09ICdsb2NhbGhvc3QnKSB7XG5cdFx0XHRcdFx0cmVxdWVzdC5jb250aW51ZSgpXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVxdWVzdC5hYm9ydCgpXG5cdFx0XHRcdH1cblx0XHRcdH0gY2F0Y2gge1xuXHRcdFx0XHRyZXF1ZXN0LmFib3J0KClcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Zm9yIChjb25zdCByb3V0ZSBvZiBST1VURVMpIHtcblx0XHRcdGNvbnN0IHVybCA9IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0ke3JvdXRlLnBhdGh9YFxuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwYWdlLmdvdG8odXJsLCB7IHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlMCcsIHRpbWVvdXQ6IDYwMDAwIH0pXG5cdFx0XHRpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnN0YXR1cygpICE9PSAyMDApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBbcHJlcmVuZGVyXSAke3JvdXRlLnBhdGh9IHJldHVybmVkICR7cmVzcG9uc2UgPyByZXNwb25zZS5zdGF0dXMoKSA6ICdubyByZXNwb25zZSd9YClcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJvdXRlLmgxUHJlZml4KSB7XG5cdFx0XHRcdGF3YWl0IHBhZ2Uud2FpdEZvckZ1bmN0aW9uKFxuXHRcdFx0XHRcdChwcmVmaXgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IGgxID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaDEnKVxuXHRcdFx0XHRcdFx0cmV0dXJuICEhKGgxICYmIGgxLnRleHRDb250ZW50LmluY2x1ZGVzKHByZWZpeCkpXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7IHRpbWVvdXQ6IDMwMDAwIH0sXG5cdFx0XHRcdFx0cm91dGUuaDFQcmVmaXhcblx0XHRcdFx0KVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gV2FpdCBmb3IgdGhlIHJvb3QgZGl2IHRvIGJlIHBvcHVsYXRlZCAobm9uLWhvbWVwYWdlIHJvdXRlcyB1c2UgaDIgc2VjdGlvbnMpXG5cdFx0XHRcdGF3YWl0IHBhZ2Uud2FpdEZvckZ1bmN0aW9uKFxuXHRcdFx0XHRcdCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcm9vdCAmJiByb290LmNoaWxkcmVuLmxlbmd0aCA+IDAgJiYgcm9vdC50ZXh0Q29udGVudC50cmltKCkubGVuZ3RoID4gMTAwXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR7IHRpbWVvdXQ6IDMwMDAwIH1cblx0XHRcdFx0KVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBMZXQgaW1hZ2VzL2FuaW1hdGlvbnMgc2V0dGxlIGJlZm9yZSBzZXJpYWxpemluZy5cblx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDc1MCkpXG5cblx0XHRcdGNvbnN0IGh0bWwgPVxuXHRcdFx0XHQnPCFkb2N0eXBlIGh0bWw+XFxuJyArIChhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5vdXRlckhUTUwpKVxuXG5cdFx0XHRjb25zdCBoYXNDb250ZW50ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgobWFya2VyKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHRleHQgPSBkb2N1bWVudC5ib2R5ID8gZG9jdW1lbnQuYm9keS50ZXh0Q29udGVudCB8fCAnJyA6ICcnXG5cdFx0XHRcdHJldHVybiB0ZXh0LnJlcGxhY2UoL1xccysvZywgJyAnKS5pbmNsdWRlcyhtYXJrZXIucmVwbGFjZSgvXFxzKy9nLCAnICcpKVxuXHRcdFx0fSwgcm91dGUuY29udGVudE1hcmtlcilcblxuXHRcdFx0aWYgKCFoYXNDb250ZW50KSB7XG5cdFx0XHRcdGNvbnN0IGgxVGV4dCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaDEnKT8udGV4dENvbnRlbnQpXG5cdFx0XHRcdGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKGRpc3REaXIsICdwcmVyZW5kZXItZGVidWcuaHRtbCcpLCBodG1sLCAndXRmOCcpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRgW3ByZXJlbmRlcl0gcmVuZGVyZWQgSFRNTCBmb3IgJHtyb3V0ZS5wYXRofSBpcyBtaXNzaW5nIGV4cGVjdGVkIGNvbnRlbnQgKFwiJHtyb3V0ZS5jb250ZW50TWFya2VyfVwiKS4gaDEgdGV4dENvbnRlbnQ6ICR7SlNPTi5zdHJpbmdpZnkoaDFUZXh0KX0uIERlYnVnIGR1bXAgd3JpdHRlbiB0byBkaXN0L3ByZXJlbmRlci1kZWJ1Zy5odG1sYFxuXHRcdFx0XHQpXG5cdFx0XHR9XG5cdFx0XHRpZiAoaHRtbC5pbmNsdWRlcygnPGRpdiBpZD1cInJvb3RcIj48L2Rpdj4nKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFtwcmVyZW5kZXJdIHJlbmRlcmVkIEhUTUwgZm9yICR7cm91dGUucGF0aH0gc3RpbGwgaGFzIGFuIGVtcHR5ICNyb290IFx1MjAxNCBub3RoaW5nIHdhcyByZW5kZXJlZC5gKVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBvdXRQYXRoID1cblx0XHRcdFx0cm91dGUucGF0aCA9PT0gJy8nID8gaW5kZXhIdG1sUGF0aCA6IHBhdGguam9pbihkaXN0RGlyLCByb3V0ZS5wYXRoLnJlcGxhY2UoL15cXC8vLCAnJyksICdpbmRleC5odG1sJylcblx0XHRcdGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUob3V0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKG91dFBhdGgsIGh0bWwsICd1dGY4Jylcblx0XHRcdGNvbnNvbGUubG9nKFxuXHRcdFx0XHRgW3ByZXJlbmRlcl0gJHtyb3V0ZS5wYXRofSAtPiAke3BhdGgucmVsYXRpdmUoZGlzdERpciwgb3V0UGF0aCl9ICgkeyhCdWZmZXIuYnl0ZUxlbmd0aChodG1sKSAvIDEwMjQpLnRvRml4ZWQoMSl9IEtCKWBcblx0XHRcdClcblx0XHR9XG5cdH0gZmluYWxseSB7XG5cdFx0aWYgKGJyb3dzZXIpIGF3YWl0IGJyb3dzZXIuY2xvc2UoKVxuXHRcdGF3YWl0IGNsb3NlU2VydmVyKHNlcnZlcilcblx0fVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0UixTQUFTLG9CQUFvQjtBQUN6VCxPQUFPLFdBQVc7QUFDbEIsT0FBT0EsU0FBUTtBQUNmLE9BQU9DLFdBQVU7OztBQ0hpVCxPQUFPLFFBQVE7QUFDalYsT0FBTyxVQUFVO0FBRWpCLE9BQU8sVUFBVTtBQUNqQixPQUFPLGVBQWU7QUFDdEIsT0FBTyxjQUFjO0FBRXJCLGVBQWUscUJBQXFCO0FBQ25DLE1BQUksUUFBUSxhQUFhLFNBQVM7QUFFakMsV0FBTyxTQUFTLGVBQWU7QUFBQSxFQUNoQztBQUVBLFFBQU0sYUFBYTtBQUFBLElBQ2xCLEtBQUssS0FBSyxRQUFRLElBQUksY0FBYyxLQUFLLElBQUksVUFBVSxVQUFVLGVBQWUsWUFBWTtBQUFBLElBQzVGLEtBQUssS0FBSyxRQUFRLElBQUksY0FBYyxLQUFLLElBQUksVUFBVSxVQUFVLGVBQWUsWUFBWTtBQUFBLElBQzVGLEtBQUssS0FBSyxRQUFRLElBQUksbUJBQW1CLEtBQUssSUFBSSxhQUFhLFFBQVEsZUFBZSxZQUFZO0FBQUEsSUFDbEcsS0FBSyxLQUFLLFFBQVEsSUFBSSxjQUFjLEtBQUssSUFBSSxhQUFhLFFBQVEsZUFBZSxZQUFZO0FBQUEsRUFDOUY7QUFDQSxhQUFXLEtBQUssWUFBWTtBQUMzQixRQUFJLEdBQUcsV0FBVyxDQUFDLEVBQUcsUUFBTztBQUFBLEVBQzlCO0FBQ0EsUUFBTSxJQUFJLE1BQU0sOEZBQThGO0FBQy9HO0FBRUEsSUFBTSxTQUFTO0FBQUEsRUFDZCxFQUFFLE1BQU0sS0FBSyxlQUFlLGlEQUFpRCxVQUFVLHNCQUFzQjtBQUFBLEVBQzdHLEVBQUUsTUFBTSxZQUFZLGVBQWUsa0JBQWtCLFVBQVUsS0FBSztBQUFBLEVBQ3BFLEVBQUUsTUFBTSxpQkFBaUIsZUFBZSxnQ0FBZ0MsVUFBVSxLQUFLO0FBQUEsRUFDdkYsRUFBRSxNQUFNLFFBQVEsZUFBZSw4QkFBOEIsVUFBVSxLQUFLO0FBQUEsRUFDNUUsRUFBRSxNQUFNLGlDQUFpQyxlQUFlLHFDQUFxQyxVQUFVLEtBQUs7QUFBQSxFQUM1RyxFQUFFLE1BQU0sU0FBUyxlQUFlLFFBQVEsVUFBVSxLQUFLO0FBQ3hEO0FBRUEsSUFBTSxhQUFhO0FBQUEsRUFDbEIsU0FBUztBQUFBLEVBQ1QsT0FBTztBQUFBLEVBQ1AsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsU0FBUztBQUFBLEVBQ1QsU0FBUztBQUFBLEVBQ1QsU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsU0FBUztBQUFBLEVBQ1QsVUFBVTtBQUFBLEVBQ1YsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUNUO0FBRUEsU0FBUyxrQkFBa0IsU0FBUztBQUNuQyxRQUFNLFNBQVMsS0FBSyxhQUFhLENBQUMsS0FBSyxRQUFRO0FBQzlDLFVBQU0sV0FBVyxvQkFBb0IsSUFBSSxPQUFPLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLFFBQUksU0FBUyxTQUFTLElBQUksR0FBRztBQUM1QixVQUFJLFVBQVUsR0FBRztBQUNqQixVQUFJLElBQUksV0FBVztBQUNuQjtBQUFBLElBQ0Q7QUFDQSxVQUFNLFdBQVcsS0FBSyxLQUFLLFNBQVMsYUFBYSxNQUFNLGVBQWUsUUFBUTtBQUM5RSxPQUFHLFNBQVMsVUFBVSxDQUFDLEtBQUssU0FBUztBQUNwQyxVQUFJLEtBQUs7QUFFUixXQUFHLFNBQVMsS0FBSyxLQUFLLFNBQVMsWUFBWSxHQUFHLENBQUMsTUFBTSxjQUFjO0FBQ2xFLGNBQUksTUFBTTtBQUNULGdCQUFJLFVBQVUsR0FBRztBQUNqQixnQkFBSSxJQUFJLFdBQVc7QUFDbkI7QUFBQSxVQUNEO0FBQ0EsY0FBSSxVQUFVLEtBQUs7QUFBQSxZQUNsQixnQkFBZ0I7QUFBQSxZQUNoQixpQkFBaUI7QUFBQSxVQUNsQixDQUFDO0FBQ0QsY0FBSSxJQUFJLFNBQVM7QUFBQSxRQUNsQixDQUFDO0FBQ0Q7QUFBQSxNQUNEO0FBQ0EsWUFBTSxNQUFNLEtBQUssUUFBUSxRQUFRLEVBQUUsWUFBWTtBQUMvQyxVQUFJLFVBQVUsS0FBSztBQUFBLFFBQ2xCLGdCQUFnQixXQUFXLEdBQUcsS0FBSztBQUFBLFFBQ25DLGlCQUFpQjtBQUFBLE1BQ2xCLENBQUM7QUFDRCxVQUFJLElBQUksSUFBSTtBQUFBLElBQ2IsQ0FBQztBQUFBLEVBQ0YsQ0FBQztBQUNELFNBQU8sSUFBSSxRQUFRLENBQUMsWUFBWTtBQUMvQixXQUFPLE9BQU8sR0FBRyxhQUFhLE1BQU0sUUFBUSxFQUFFLFFBQVEsTUFBTSxPQUFPLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUFBLEVBQ3JGLENBQUM7QUFDRjtBQUVBLFNBQVMsWUFBWSxRQUFRO0FBQzVCLFNBQU8sSUFBSSxRQUFRLENBQUMsWUFBWSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUMsQ0FBQztBQUM5RDtBQUVlLFNBQVIsMEJBQTJDO0FBQ2pELE1BQUksVUFBVTtBQUNkLFNBQU87QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLGVBQWUsUUFBUTtBQUN0QixnQkFBVSxLQUFLLFFBQVEsT0FBTyxNQUFNLE9BQU8sTUFBTSxVQUFVLE1BQU07QUFBQSxJQUNsRTtBQUFBLElBQ0EsTUFBTSxjQUFjO0FBQ25CLFVBQUksUUFBUSxJQUFJLGVBQWdCO0FBQ2hDLFlBQU0sa0JBQWtCLE9BQU87QUFBQSxJQUNoQztBQUFBLEVBQ0Q7QUFDRDtBQUVBLGVBQWUsa0JBQWtCLFNBQVM7QUFDekMsUUFBTSxnQkFBZ0IsS0FBSyxLQUFLLFNBQVMsWUFBWTtBQUNyRCxRQUFNLGdCQUFnQixLQUFLLEtBQUssU0FBUyxZQUFZO0FBRXJELE1BQUksQ0FBQyxHQUFHLFdBQVcsYUFBYSxHQUFHO0FBQ2xDLFVBQU0sSUFBSSxNQUFNLDRFQUF1RTtBQUFBLEVBQ3hGO0FBR0EsS0FBRyxhQUFhLGVBQWUsYUFBYTtBQUU1QyxRQUFNLEVBQUUsUUFBUSxLQUFLLElBQUksTUFBTSxrQkFBa0IsT0FBTztBQUN4RCxNQUFJO0FBQ0osTUFBSTtBQUNILFVBQU0sV0FBVyxNQUFNLG1CQUFtQjtBQUMxQyxjQUFVLE1BQU0sVUFBVSxPQUFPO0FBQUEsTUFDaEMsZ0JBQWdCO0FBQUEsTUFDaEIsTUFBTSxTQUFTO0FBQUEsTUFDZixpQkFBaUIsU0FBUztBQUFBLE1BQzFCLFVBQVUsU0FBUztBQUFBLElBQ3BCLENBQUM7QUFDRCxVQUFNLE9BQU8sTUFBTSxRQUFRLFFBQVE7QUFDbkMsVUFBTSxLQUFLLFlBQVksRUFBRSxPQUFPLE1BQU0sUUFBUSxJQUFJLENBQUM7QUFLbkQsVUFBTSxLQUFLLHVCQUF1QixJQUFJO0FBQ3RDLFNBQUssR0FBRyxXQUFXLENBQUMsWUFBWTtBQUMvQixVQUFJO0FBQ0gsY0FBTSxFQUFFLFNBQVMsSUFBSSxJQUFJLElBQUksUUFBUSxJQUFJLENBQUM7QUFDMUMsWUFBSSxhQUFhLGVBQWUsYUFBYSxhQUFhO0FBQ3pELGtCQUFRLFNBQVM7QUFBQSxRQUNsQixPQUFPO0FBQ04sa0JBQVEsTUFBTTtBQUFBLFFBQ2Y7QUFBQSxNQUNELFFBQVE7QUFDUCxnQkFBUSxNQUFNO0FBQUEsTUFDZjtBQUFBLElBQ0QsQ0FBQztBQUVELGVBQVcsU0FBUyxRQUFRO0FBQzNCLFlBQU0sTUFBTSxvQkFBb0IsSUFBSSxHQUFHLE1BQU0sSUFBSTtBQUNqRCxZQUFNLFdBQVcsTUFBTSxLQUFLLEtBQUssS0FBSyxFQUFFLFdBQVcsZ0JBQWdCLFNBQVMsSUFBTSxDQUFDO0FBQ25GLFVBQUksQ0FBQyxZQUFZLFNBQVMsT0FBTyxNQUFNLEtBQUs7QUFDM0MsY0FBTSxJQUFJLE1BQU0sZUFBZSxNQUFNLElBQUksYUFBYSxXQUFXLFNBQVMsT0FBTyxJQUFJLGFBQWEsRUFBRTtBQUFBLE1BQ3JHO0FBRUEsVUFBSSxNQUFNLFVBQVU7QUFDbkIsY0FBTSxLQUFLO0FBQUEsVUFDVixDQUFDLFdBQVc7QUFDWCxrQkFBTSxLQUFLLFNBQVMsY0FBYyxJQUFJO0FBQ3RDLG1CQUFPLENBQUMsRUFBRSxNQUFNLEdBQUcsWUFBWSxTQUFTLE1BQU07QUFBQSxVQUMvQztBQUFBLFVBQ0EsRUFBRSxTQUFTLElBQU07QUFBQSxVQUNqQixNQUFNO0FBQUEsUUFDUDtBQUFBLE1BQ0QsT0FBTztBQUVOLGNBQU0sS0FBSztBQUFBLFVBQ1YsTUFBTTtBQUNMLGtCQUFNLE9BQU8sU0FBUyxlQUFlLE1BQU07QUFDM0MsbUJBQU8sUUFBUSxLQUFLLFNBQVMsU0FBUyxLQUFLLEtBQUssWUFBWSxLQUFLLEVBQUUsU0FBUztBQUFBLFVBQzdFO0FBQUEsVUFDQSxFQUFFLFNBQVMsSUFBTTtBQUFBLFFBQ2xCO0FBQUEsTUFDRDtBQUdBLFlBQU0sSUFBSSxRQUFRLENBQUMsWUFBWSxXQUFXLFNBQVMsR0FBRyxDQUFDO0FBRXZELFlBQU0sT0FDTCxzQkFBdUIsTUFBTSxLQUFLLFNBQVMsTUFBTSxTQUFTLGdCQUFnQixTQUFTO0FBRXBGLFlBQU0sYUFBYSxNQUFNLEtBQUssU0FBUyxDQUFDLFdBQVc7QUFDbEQsY0FBTSxPQUFPLFNBQVMsT0FBTyxTQUFTLEtBQUssZUFBZSxLQUFLO0FBQy9ELGVBQU8sS0FBSyxRQUFRLFFBQVEsR0FBRyxFQUFFLFNBQVMsT0FBTyxRQUFRLFFBQVEsR0FBRyxDQUFDO0FBQUEsTUFDdEUsR0FBRyxNQUFNLGFBQWE7QUFFdEIsVUFBSSxDQUFDLFlBQVk7QUFDaEIsY0FBTSxTQUFTLE1BQU0sS0FBSyxTQUFTLE1BQU0sU0FBUyxjQUFjLElBQUksR0FBRyxXQUFXO0FBQ2xGLFdBQUcsY0FBYyxLQUFLLEtBQUssU0FBUyxzQkFBc0IsR0FBRyxNQUFNLE1BQU07QUFDekUsY0FBTSxJQUFJO0FBQUEsVUFDVCxpQ0FBaUMsTUFBTSxJQUFJLGtDQUFrQyxNQUFNLGFBQWEsdUJBQXVCLEtBQUssVUFBVSxNQUFNLENBQUM7QUFBQSxRQUM5STtBQUFBLE1BQ0Q7QUFDQSxVQUFJLEtBQUssU0FBUyx1QkFBdUIsR0FBRztBQUMzQyxjQUFNLElBQUksTUFBTSxpQ0FBaUMsTUFBTSxJQUFJLHdEQUFtRDtBQUFBLE1BQy9HO0FBRUEsWUFBTSxVQUNMLE1BQU0sU0FBUyxNQUFNLGdCQUFnQixLQUFLLEtBQUssU0FBUyxNQUFNLEtBQUssUUFBUSxPQUFPLEVBQUUsR0FBRyxZQUFZO0FBQ3BHLFNBQUcsVUFBVSxLQUFLLFFBQVEsT0FBTyxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDdkQsU0FBRyxjQUFjLFNBQVMsTUFBTSxNQUFNO0FBQ3RDLGNBQVE7QUFBQSxRQUNQLGVBQWUsTUFBTSxJQUFJLE9BQU8sS0FBSyxTQUFTLFNBQVMsT0FBTyxDQUFDLE1BQU0sT0FBTyxXQUFXLElBQUksSUFBSSxNQUFNLFFBQVEsQ0FBQyxDQUFDO0FBQUEsTUFDaEg7QUFBQSxJQUNEO0FBQUEsRUFDRCxVQUFFO0FBQ0QsUUFBSSxRQUFTLE9BQU0sUUFBUSxNQUFNO0FBQ2pDLFVBQU0sWUFBWSxNQUFNO0FBQUEsRUFDekI7QUFDRDs7O0FEOU1BLFNBQVMsMEJBQTBCO0FBQ2xDLE1BQUksVUFBVTtBQUNkLFNBQU87QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGVBQWUsUUFBUTtBQUN0QixnQkFBVUMsTUFBSyxRQUFRLE9BQU8sTUFBTSxPQUFPLE1BQU0sVUFBVSxNQUFNO0FBQUEsSUFDbEU7QUFBQSxJQUNBLHVCQUF1QixRQUFRO0FBQzlCLGFBQU8sWUFBWSxJQUFJLENBQUMsS0FBSyxNQUFNLFNBQVM7QUFDM0MsWUFBSSxJQUFJLFdBQVcsU0FBUyxJQUFJLFdBQVcsUUFBUTtBQUNsRCxnQkFBTSxZQUFZLElBQUksT0FBTyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDN0MsY0FDQyxhQUFhLE9BQ2IsYUFBYSxpQkFDYkEsTUFBSyxRQUFRLFFBQVEsTUFBTSxNQUMzQkMsSUFBRyxXQUFXRCxNQUFLLEtBQUssU0FBUyxZQUFZLENBQUMsR0FDN0M7QUFDRCxnQkFBSSxNQUFNO0FBQUEsVUFDWDtBQUFBLFFBQ0Q7QUFDQSxhQUFLO0FBQUEsTUFDTixDQUFDO0FBQUEsSUFDRjtBQUFBLEVBQ0Q7QUFDRDtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVMsQ0FBQyxNQUFNLEdBQUcsd0JBQWtCLEdBQUcsd0JBQXdCLENBQUM7QUFBQSxFQUNqRSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU0sQ0FBQyxXQUFXLFVBQVU7QUFBQSxFQUM5QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImZzIiwgInBhdGgiLCAicGF0aCIsICJmcyJdCn0K
