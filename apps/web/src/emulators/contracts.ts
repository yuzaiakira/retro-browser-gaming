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
  /** Dedicated-origin J2ME only — export suite snapshots for rollback merge. */
  exportRmsMigration?(): Promise<unknown>;
  /** Stable session id for remount / probe evidence (FrameAdapter). */
  runtimeSessionId?(): string;
  /** Live iframe element when available (FrameAdapter). */
  runtimeFrame?(): HTMLIFrameElement | null;
  /** Receive authenticated shell-key forwards from the frame. */
  setShellKeyHandler?(
    handler: ((detail: { code: string; key: string }) => void) | null,
  ): void;
  /** Allow-list of KeyboardEvent.code values the frame may claim for the shell. */
  setShellShortcutCodes?(codes: string[]): Promise<void>;
}
