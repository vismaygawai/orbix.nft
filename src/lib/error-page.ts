export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>orbix.nft — Signal Interrupted</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; background: #0a0a18; color: #f5f5f7; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border-radius: 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.12); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; letter-spacing: 0.06em; text-transform: uppercase; color: #ff2ebd; }
      p { color: rgba(245, 245, 247, 0.72); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.625rem 1.25rem; border-radius: 0.75rem; font: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.16); }
      .primary { background: #ff2ebd; color: #fff; border-color: transparent; }
      .secondary { background: rgba(255, 255, 255, 0.06); color: #f5f5f7; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Signal Interrupted</h1>
      <p>Something went wrong while rendering this page. You can try refreshing or return home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try Again</button>
        <a class="secondary" href="/">Return Home</a>
      </div>
    </div>
  </body>
</html>`;
}
