import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow } from "electron";

export function createMainWindow() {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const preloadPath = path.join(currentDirectory, "../preload/index.js");

  return new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#020617",
    webPreferences: {
      contextIsolation: true,
      preload: preloadPath,
      sandbox: true,
    },
  });
}
