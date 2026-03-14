import { app } from "electron";

import { createMainWindow } from "./create-main-window.js";
import { createDesktopRuntimeService } from "./create-runtime-service.js";
import { registerDesktopApiHandlers } from "./register-desktop-api.js";

const desktopRendererDevUrl = "http://localhost:5173";

app
  .whenReady()
  .then(async () => {
    const desktopRuntime = await createDesktopRuntimeService({
      userDataPath: app.getPath("userData"),
    });
    registerDesktopApiHandlers(desktopRuntime);

    let mainWindow = createMainWindow();
    void loadMainWindowContent(mainWindow);

    app.on("activate", () => {
      if (mainWindow.isDestroyed()) {
        mainWindow = createMainWindow();
        void loadMainWindowContent(mainWindow);
      }
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start the IAM Robot desktop runtime.", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

async function loadMainWindowContent(mainWindow: ReturnType<typeof createMainWindow>) {
  try {
    await mainWindow.loadURL(desktopRendererDevUrl);
  } catch {
    await mainWindow.loadURL(createRendererUnavailableDataUrl());
  }
}

function createRendererUnavailableDataUrl(): string {
  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>IAM Robot</title>
        <style>
          :root {
            color-scheme: dark;
            font-family: "SF Pro Display", "Inter Variable", ui-sans-serif, system-ui, sans-serif;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.2), transparent 30%),
              radial-gradient(circle at top right, rgba(20, 184, 166, 0.18), transparent 28%),
              #020617;
            color: #e2e8f0;
          }

          main {
            width: min(560px, calc(100vw - 48px));
            padding: 32px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 24px;
            background: rgba(8, 15, 28, 0.72);
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.45);
          }

          p {
            margin: 0;
            line-height: 1.6;
            color: #94a3b8;
          }

          h1 {
            margin: 12px 0 16px;
            font-size: 32px;
            line-height: 1.05;
          }

          code {
            display: inline-block;
            margin-top: 18px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.9);
            color: #7dd3fc;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <main>
          <p>IAM Robot</p>
          <h1>Renderer server unavailable.</h1>
          <p>
            The Electron main process and preload bridge started correctly, but the renderer dev
            server is not running on <strong>${desktopRendererDevUrl}</strong>.
          </p>
          <code>pnpm --filter @iamrobot/desktop run dev:renderer</code>
        </main>
      </body>
    </html>
  `;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
