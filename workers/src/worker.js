// Static asset extensions — 404s on these are real errors, not SPA routes
const STATIC_ASSET_RE = /\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif|json|map|txt|xml)(\?.*)?$/i;

// Unversioned PWA files must not be cached — browsers use them to detect SW updates
const NO_CACHE_RE = /^\/(sw\.js|manifest\.webmanifest|manifest\.json)([\?#].*)?$/i;

// Service worker that replaces whatever SW is registered at its URL, wipes
// the caches, unregisters itself and reloads the open tabs, so they hit the
// network (and this worker) again. Served where a stale SW would otherwise
// keep serving a cached app forever:
//   - /service-worker.js: the legacy (classic) dapp's CRA service worker,
//     still installed for users of dapp.moneyonchain.com. v3 never uses this
//     path (its own SW is /sw.js), so it is safe to serve on every host.
//   - /sw.js on a non-canonical host (see CANONICAL_HOST): v3's own SW on the
//     old hostname, which would otherwise keep serving the cached app and
//     never see the redirect.
const SW_KILL_SWITCH = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) client.navigate(client.url);
  })());
});
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/service-worker.js") {
      return killSwitchResponse();
    }

    // CANONICAL_HOST (optional var): every other hostname routed to this
    // worker is redirected there, e.g. manage.moneyonchain.com ->
    // dapp.moneyonchain.com. The browser keeps the #hash route on redirect.
    // 302, not 301: browsers cache a 301 forever, which would make a rollback
    // impossible. Switch to 301 once the migration is settled.
    if (env.CANONICAL_HOST && url.hostname !== env.CANONICAL_HOST) {
      if (url.pathname === "/sw.js") {
        return killSwitchResponse();
      }
      url.hostname = env.CANONICAL_HOST;
      return Response.redirect(url.toString(), 302);
    }

    const cid = await env.DAPP_KV.get("current_cid");
    if (!cid) {
      return new Response("No version deployed yet.", { status: 503 });
    }

    if (url.pathname === "/_version") {
      return new Response(JSON.stringify({ cid }), {
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
      });
    }

    let servedCid = cid;
    let response = await fetchFromGateway(env.PINATA_GATEWAY, cid, url.pathname + url.search);

    // Clients running an older build (a tab left open across a deploy, or a
    // stale service worker) request hashed chunks that no longer exist in the
    // current CID. Look the asset up in recent previous deploys before giving up.
    if (response.status === 404 && STATIC_ASSET_RE.test(url.pathname)) {
      const fallback = await fetchFromPreviousCids(env, cid, url.pathname + url.search);
      if (fallback) {
        ({ response, cid: servedCid } = fallback);
      }
    }

    // SPA fallback: unknown paths that aren't static assets get index.html
    if (response.status === 404 && !STATIC_ASSET_RE.test(url.pathname)) {
      response = await fetchFromGateway(env.PINATA_GATEWAY, cid, "/index.html");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      // Vite builds with base:"" use relative ./assets/ paths. Without <base href="/">,
      // those paths break when index.html is served for a deep SPA route like /governance.
      const patched = html.includes("<base ")
        ? html
        : html.replace("<head>", '<head><base href="/">');
      const headers = new Headers(response.headers);
      headers.delete("content-encoding"); // body is now raw (decompressed) text
      headers.delete("content-length");   // length changed after patching
      headers.set("content-type", "text/html; charset=utf-8");
      // HTML must never be served from browser cache — the CID can change on next deploy
      headers.set("cache-control", "no-cache");
      headers.set("x-ipfs-cid", cid);
      return new Response(patched, { status: response.status, headers });
    }

    const headers = new Headers(response.headers);
    headers.delete("location"); // strip upstream redirect hints so the hash never leaks
    if (NO_CACHE_RE.test(url.pathname)) {
      headers.set("cache-control", "no-cache");
    }
    headers.set("x-ipfs-cid", servedCid);
    return new Response(response.body, { status: response.status, headers });
  },
};

function killSwitchResponse() {
  return new Response(SW_KILL_SWITCH, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}

function fetchFromGateway(gateway, cid, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${gateway}/ipfs/${cid}${normalizedPath}`, { redirect: "follow" });
}

// previous_cids is a JSON array of earlier deploys, newest first, maintained
// by the release workflows when they update current_cid.
async function fetchFromPreviousCids(env, currentCid, path) {
  const previous = (await env.DAPP_KV.get("previous_cids", { type: "json" })) ?? [];
  for (const cid of previous) {
    if (cid === currentCid) continue;
    const response = await fetchFromGateway(env.PINATA_GATEWAY, cid, path);
    if (response.ok) return { response, cid };
  }
  return null;
}
