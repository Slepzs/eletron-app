import { app } from "electron";

import { createMainWindow } from "./create-main-window";
import { createDesktopRuntimeService } from "./create-runtime-service";
import { registerDesktopApiHandlers } from "./register-desktop-api";

app
  .whenReady()
  .then(async () => {
    const desktopRuntime = await createDesktopRuntimeService({
      userDataPath: app.getPath("userData"),
    });
    registerDesktopApiHandlers(desktopRuntime);

    let mainWindow = createMainWindow();
    void mainWindow.loadURL("data:text/html;charset=utf-8,<div id='root'></div>");

    app.on("activate", () => {
      if (mainWindow.isDestroyed()) {
        mainWindow = createMainWindow();
        void mainWindow.loadURL("data:text/html;charset=utf-8,<div id='root'></div>");
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
