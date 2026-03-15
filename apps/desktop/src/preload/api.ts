import { ipcRenderer } from "electron";

import {
  type DesktopApi,
  type DesktopRunEventPayload,
  type DesktopSnapshotEventPayload,
  desktopIpcChannels,
} from "../shared/desktop-api.js";

export type { DesktopApi } from "../shared/desktop-api.js";

export const desktopApi: DesktopApi = {
  setHeartbeatMode: (enabled) => ipcRenderer.invoke(desktopIpcChannels.setHeartbeatMode, enabled),
  getHeartbeatMode: () => ipcRenderer.invoke(desktopIpcChannels.getHeartbeatMode),
  getReplayDiagnostics: () => ipcRenderer.invoke(desktopIpcChannels.getReplayDiagnostics),
  listRuns: () => ipcRenderer.invoke(desktopIpcChannels.listRuns),
  getRunDetails: (runId) => ipcRenderer.invoke(desktopIpcChannels.getRunDetails, runId),
  createProject: (input) => ipcRenderer.invoke(desktopIpcChannels.createProject, input),
  createTask: (input) => ipcRenderer.invoke(desktopIpcChannels.createTask, input),
  selectProject: (projectId) => ipcRenderer.invoke(desktopIpcChannels.selectProject, projectId),
  startRun: (input) => ipcRenderer.invoke(desktopIpcChannels.startRun, input),
  resolveApproval: (input) => ipcRenderer.invoke(desktopIpcChannels.resolveApproval, input),
  retryRun: (input) => ipcRenderer.invoke(desktopIpcChannels.retryRun, input),
  cancelRun: (runId) => ipcRenderer.invoke(desktopIpcChannels.cancelRun, runId),
  selectDirectory: () => ipcRenderer.invoke(desktopIpcChannels.selectDirectory),
  async subscribeToSnapshot(onSnapshot) {
    const subscriptionId = globalThis.crypto.randomUUID();
    const listener = (_event: Electron.IpcRendererEvent, payload: DesktopSnapshotEventPayload) => {
      if (payload.subscriptionId === subscriptionId) {
        onSnapshot(payload.snapshot);
      }
    };

    ipcRenderer.on(desktopIpcChannels.snapshotEvent, listener);

    try {
      await ipcRenderer.invoke(desktopIpcChannels.subscribeToSnapshot, {
        subscriptionId,
      });
    } catch (error) {
      ipcRenderer.removeListener(desktopIpcChannels.snapshotEvent, listener);
      throw error;
    }

    return () => {
      ipcRenderer.removeListener(desktopIpcChannels.snapshotEvent, listener);
      void ipcRenderer.invoke(desktopIpcChannels.unsubscribe, {
        subscriptionId,
      });
    };
  },
  async subscribeToRun(runId, onEvent) {
    const subscriptionId = globalThis.crypto.randomUUID();
    const listener = (_event: Electron.IpcRendererEvent, payload: DesktopRunEventPayload) => {
      if (payload.subscriptionId === subscriptionId) {
        onEvent(payload.event);
      }
    };

    ipcRenderer.on(desktopIpcChannels.runEvent, listener);

    try {
      await ipcRenderer.invoke(desktopIpcChannels.subscribeToRun, {
        runId,
        subscriptionId,
      });
    } catch (error) {
      ipcRenderer.removeListener(desktopIpcChannels.runEvent, listener);
      throw error;
    }

    return () => {
      ipcRenderer.removeListener(desktopIpcChannels.runEvent, listener);
      void ipcRenderer.invoke(desktopIpcChannels.unsubscribe, {
        subscriptionId,
      });
    };
  },
};
