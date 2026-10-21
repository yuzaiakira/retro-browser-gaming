export interface RuntimeCapabilities {saveState:boolean;audio:boolean;analog:boolean;seekableMedia?:boolean}
export interface EmulatorAdapter {
  readonly capabilities: RuntimeCapabilities;
  load(
    file: File,
    options: { core: string; name: string; bios?: File; companions?: File[] },
  ): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): Promise<void>;
  setVolume(value: number): Promise<void>;
  input(command: number, value: number): void;
  exportState(): Promise<Uint8Array>;
  importState(bytes: Uint8Array): Promise<void>;
  dispose(): void;
  seekableStats?(): Promise<{
    bytesRead: number;
    peakPayload: number;
    payloadCapacity: number;
    mounts: number;
  } | null>;
  /** Dedicated-origin J2ME only — transfer validated launcher RMS snapshots. */
  importRmsMigration?(payload: unknown): Promise<unknown>;
}
