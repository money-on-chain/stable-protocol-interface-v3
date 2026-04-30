const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" fill-rule="evenodd"><rect width="32" height="32"/><g fill="#000" fill-rule="nonzero" transform="translate(5 6)"><path d="M17.2147838,13.6899428 L1.60251046,13.6899428 C0.718270572,13.6899428 0,12.9785621 0,12.1058799 L0,1.59233473 C0,0.714138002 0.722454672,0 1.61087866,0 L17.2147838,0 L17.2147838,1.3510719 L1.61087866,1.3510719 C1.47559275,1.3510719 1.36680614,1.45998483 1.36680614,1.59233473 L1.36680614,12.1058799 C1.36680614,12.2340939 1.47280335,12.3388709 1.60251046,12.3388709 L17.2133891,12.3388709 L17.2133891,13.6899428 L17.2147838,13.6899428 Z"/><path d="M20.3821478,19.9972427 L4.78521618,19.9972427 L4.78521618,18.6461708 L20.3821478,18.6461708 C20.5202232,18.6461708 20.6317992,18.5358792 20.6317992,18.3993934 L20.6317992,7.91893569 C20.6317992,7.77555663 20.5132497,7.65975047 20.3695955,7.65975047 L4.78521618,7.65975047 L4.78521618,6.30867857 L20.3695955,6.30867857 C21.2691771,6.30867857 22,7.03108844 22,7.92031433 L22,18.400772 C22,19.2817261 21.2747559,20 20.3821478,20 L20.3821478,19.9972427 Z"/></g></g></svg>
`;

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scheduled Maintenance</title>
  <style>
    * { box-sizing: border-box; }

    html {
      min-height: 100%;
      background: #fbfbfd;
    }

    body {
      min-height: 100vh;
      margin: 0;
      background:
        linear-gradient(
          to right bottom,
          #ffffff 0%,
          #fbfbfd 35%,
          #f7f8fc 70%,
          #ffffff 100%
        );
      color: #0f1419;
      font-family:
        "Open Sans",
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .maintenance-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 64px 24px;
    }

    .maintenance-card {
      width: min(892px, 100%);
      min-height: 438px;
      display: flex;
      align-items: center;
      padding: 80px 46px;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
    }

    .maintenance-content {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(180px, 280px);
      align-items: center;
      gap: 72px;
    }

    .maintenance-copy { max-width: 390px; }

    .maintenance-logo {
      width: 160px;
      height: 160px;
      justify-self: center;
      order: 2;
    }

    .maintenance-copy h1 {
      margin: 0 0 8px;
      color: #4b5cf0;
      font-family:
        "Sora",
        "Open Sans",
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      font-size: 26px;
      font-weight: 700;
      line-height: 1.2;
    }

    .maintenance-copy p {
      margin: 0;
      color: #0f1419;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.45;
    }

    .maintenance-note {
      padding-top: 24px;
      color: #8f9bac;
      font-size: 14px;
    }

    @media (max-width: 720px) {
      .maintenance-page { padding: 24px; }

      .maintenance-card {
        min-height: auto;
        padding: 48px 28px;
      }

      .maintenance-content {
        grid-template-columns: 1fr;
        gap: 32px;
        text-align: left;
      }

      .maintenance-logo {
        width: 120px;
        height: 120px;
        justify-self: start;
        order: 0;
      }
    }

    @media (max-width: 420px) {
      .maintenance-page { padding: 16px; }
      .maintenance-card { padding: 36px 20px; }
      .maintenance-copy h1 { font-size: 24px; }
      .maintenance-copy p { font-size: 15px; }
    }
  </style>
</head>
<body>
  <main class="maintenance-page" aria-labelledby="maintenance-title">
    <section class="maintenance-card">
      <div class="maintenance-content">
        <div class="maintenance-logo" aria-label="RoC">
          ${LOGO_SVG}
        </div>

        <div class="maintenance-copy">
          <h1 id="maintenance-title">Scheduled maintenance.</h1>
          <p>RoC is temporarily offline while updates are being deployed.</p>
          <p class="maintenance-note">Try again in a few minutes.</p>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;

export default {
  async fetch(request) {
    return new Response(HTML, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
        "retry-after": "300",
      },
    });
  },
};