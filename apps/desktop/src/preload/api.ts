import type { DesktopSeedState } from "../shared/seed-state";
import { getDesktopSeedState } from "../shared/seed-state";

export interface DesktopApi {
  getSeedState(): DesktopSeedState;
}

export const desktopApi: DesktopApi = {
  getSeedState: getDesktopSeedState,
};
