import { contextBridge } from "electron";

import { desktopApi } from "./api.js";

contextBridge.exposeInMainWorld("iamRobot", desktopApi);
