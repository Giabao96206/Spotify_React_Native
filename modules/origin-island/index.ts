import { requireOptionalNativeModule } from "expo";

export type IslandCapabilities = {
  deviceCandidate: boolean;
  originOS: "unknown" | "unsupported";
  support: "unknown" | "unsupported";
  protocol: string;
  sceneRegistration: string;
};

type OriginIslandModule = {
  getCapabilities(): IslandCapabilities;
  setExperimentalEnabled(enabled: boolean): void;
  setQueueMetadata(queue: Record<string, string | null>[]): void;
  clearQueueMetadata(): void;
};

const native = requireOptionalNativeModule<OriginIslandModule>("OriginIsland");

// Optional on iOS/web and on older installed native builds.
export const originIsland = {
  getCapabilities: (): IslandCapabilities =>
    native?.getCapabilities() ?? {
      deviceCandidate: false,
      originOS: "unsupported",
      support: "unsupported",
      protocol: "native-module-unavailable",
      sceneRegistration: "unavailable",
    },
  setExperimentalEnabled: (enabled: boolean) =>
    native?.setExperimentalEnabled(enabled),
  setQueueMetadata: (queue: Record<string, string | null>[]) =>
    native?.setQueueMetadata(queue),
  clearQueueMetadata: () => native?.clearQueueMetadata(),
};
