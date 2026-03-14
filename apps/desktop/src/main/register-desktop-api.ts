import type { RuntimeSubscription } from "@iamrobot/orchestration";
import { BrowserWindow, dialog, ipcMain, type WebContents } from "electron";

import {
  type DesktopRunEventPayload,
  type DesktopRunSubscriptionInput,
  type DesktopSnapshotEventPayload,
  type DesktopSnapshotSubscriptionInput,
  type DesktopSubscriptionDisposeInput,
  desktopIpcChannels,
} from "../shared/desktop-api.js";
import type { DesktopRuntimeService } from "./runtime-service.js";

interface RegisteredRendererSubscription {
  readonly senderId: number;
  readonly unsubscribe: RuntimeSubscription;
}

const rendererSubscriptions = new Map<string, RegisteredRendererSubscription>();
const subscriptionIdsBySender = new Map<number, Set<string>>();
const senderCleanupBindings = new Set<number>();

let handlersRegistered = false;

export function registerDesktopApiHandlers(service: DesktopRuntimeService): void {
  if (handlersRegistered) {
    return;
  }

  handlersRegistered = true;

  ipcMain.handle(desktopIpcChannels.listRuns, () => service.listRuns());
  ipcMain.handle(desktopIpcChannels.getRunDetails, (_, runId) => service.getRunDetails(runId));
  ipcMain.handle(desktopIpcChannels.createTask, (_, input) => service.createTask(input));
  ipcMain.handle(desktopIpcChannels.startRun, (_, input) => service.startRun(input));
  ipcMain.handle(desktopIpcChannels.resolveApproval, (_, input) => service.resolveApproval(input));
  ipcMain.handle(desktopIpcChannels.retryRun, (_, input) => service.retryRun(input));
  ipcMain.handle(desktopIpcChannels.cancelRun, (_, runId) => service.cancelRun(runId));
  ipcMain.handle(desktopIpcChannels.selectDirectory, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, { properties: ["openDirectory"] });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
  ipcMain.handle(
    desktopIpcChannels.subscribeToSnapshot,
    async (event, input: DesktopSnapshotSubscriptionInput) => {
      bindSenderCleanup(event.sender);

      const unsubscribe = await service.subscribeToSnapshot((snapshot) => {
        if (event.sender.isDestroyed()) {
          return;
        }

        const payload: DesktopSnapshotEventPayload = {
          subscriptionId: input.subscriptionId,
          snapshot,
        };

        event.sender.send(desktopIpcChannels.snapshotEvent, payload);
      });

      storeRendererSubscription(event.sender.id, input.subscriptionId, unsubscribe);
    },
  );
  ipcMain.handle(
    desktopIpcChannels.subscribeToRun,
    async (event, input: DesktopRunSubscriptionInput) => {
      bindSenderCleanup(event.sender);

      const unsubscribe = await service.subscribeToRun(input.runId, (domainEvent) => {
        if (event.sender.isDestroyed()) {
          return;
        }

        const payload: DesktopRunEventPayload = {
          subscriptionId: input.subscriptionId,
          event: domainEvent,
        };

        event.sender.send(desktopIpcChannels.runEvent, payload);
      });

      storeRendererSubscription(event.sender.id, input.subscriptionId, unsubscribe);
    },
  );
  ipcMain.handle(desktopIpcChannels.unsubscribe, (_, input: DesktopSubscriptionDisposeInput) => {
    removeRendererSubscription(input.subscriptionId);
  });
}

function bindSenderCleanup(sender: WebContents): void {
  if (senderCleanupBindings.has(sender.id)) {
    return;
  }

  senderCleanupBindings.add(sender.id);

  sender.once("destroyed", () => {
    removeAllRendererSubscriptions(sender.id);
    senderCleanupBindings.delete(sender.id);
  });
}

function storeRendererSubscription(
  senderId: number,
  subscriptionId: string,
  unsubscribe: RuntimeSubscription,
): void {
  removeRendererSubscription(subscriptionId);

  rendererSubscriptions.set(subscriptionId, {
    senderId,
    unsubscribe,
  });

  const senderSubscriptions = subscriptionIdsBySender.get(senderId) ?? new Set<string>();
  senderSubscriptions.add(subscriptionId);
  subscriptionIdsBySender.set(senderId, senderSubscriptions);
}

function removeRendererSubscription(subscriptionId: string): void {
  const existingSubscription = rendererSubscriptions.get(subscriptionId);

  if (existingSubscription === undefined) {
    return;
  }

  existingSubscription.unsubscribe();
  rendererSubscriptions.delete(subscriptionId);

  const senderSubscriptions = subscriptionIdsBySender.get(existingSubscription.senderId);

  if (senderSubscriptions === undefined) {
    return;
  }

  senderSubscriptions.delete(subscriptionId);

  if (senderSubscriptions.size === 0) {
    subscriptionIdsBySender.delete(existingSubscription.senderId);
  }
}

function removeAllRendererSubscriptions(senderId: number): void {
  const senderSubscriptions = subscriptionIdsBySender.get(senderId);

  if (senderSubscriptions === undefined) {
    return;
  }

  for (const subscriptionId of senderSubscriptions) {
    const registeredSubscription = rendererSubscriptions.get(subscriptionId);
    registeredSubscription?.unsubscribe();
    rendererSubscriptions.delete(subscriptionId);
  }

  subscriptionIdsBySender.delete(senderId);
}
