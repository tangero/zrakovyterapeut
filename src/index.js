/**
 * Minimální Worker pro zrakovyterapeut.cz.
 *
 * Statický obsah servírují Workers Static Assets (viz wrangler.jsonc).
 * Worker zajišťuje kanonizaci URL (SEO) a bezpečnostní hlavičky.
 * Stránku 404 servíruje platforma automaticky ze souboru 404.html.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Kanonizace hosta: www → apex (SEO, jedna kanonická doména).
    if (url.hostname === "www.zrakovyterapeut.cz") {
      url.hostname = "zrakovyterapeut.cz";
      return Response.redirect(url.toString(), 301);
    }

    // Kanonizace: malá písmena, bez koncového lomítka (kromě kořene).
    const lower = url.pathname.toLowerCase();
    let canonical = lower;
    if (canonical.length > 1 && canonical.endsWith("/")) {
      canonical = canonical.slice(0, -1);
    }
    if (canonical !== url.pathname) {
      url.pathname = canonical;
      return Response.redirect(url.toString(), 301);
    }

    let response = await env.ASSETS.fetch(request);

    // Vlastní 404 stránka (platforma vrací jen prázdné tělo).
    if (response.status === 404 && url.pathname !== "/404.html") {
      const retry = new Request(new URL("/404.html", url), { method: "GET" });
      const notFound = await env.ASSETS.fetch(retry);
      if (notFound.ok) {
        response = new Response(notFound.body, {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
    }

    // Bezpečnostní hlavičky (obsah je čistě statický, bez inline skriptů).
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'"
    );

    return new Response(response.body, { status: response.status, headers });
  },
};
