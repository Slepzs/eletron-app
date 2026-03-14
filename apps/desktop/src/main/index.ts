import { app } from "electron";

import { createMainWindow } from "./create-main-window";

app.whenReady().then(() => {
  const mainWindow = createMainWindow();

  void mainWindow.loadURL("data:text/html;charset=utf-8,<div id='root'></div>");

  app.on("activate", () => {
    if (mainWindow.isDestroyed()) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
