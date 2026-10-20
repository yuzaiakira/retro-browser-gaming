import {z} from 'zod';
export const assetSchema=z.object({id:z.string().uuid(),role:z.string(),filename:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/),url:z.string(),byteSize:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),version:z.string(),etag:z.string().optional(),rangeSupported:z.boolean()});
export const manifestSchema=z.object({manifestVersion:z.literal(1),releaseId:z.string().uuid(),revision:z.string(),core:z.object({code:z.string(),version:z.string()}),assets:z.array(assetSchema).min(1),requiredFiles:z.array(z.string()),entryFile:z.string(),offlineRequirements:z.array(z.string()),requiredCapabilities:z.array(z.string())});
export type Asset=z.infer<typeof assetSchema>;
export type Manifest=z.infer<typeof manifestSchema>;
export interface Core {id:string;code:string;version:string;status:string;runtime_type:string;min_capabilities:string[];supported_extensions:string[];licensed_asset_manifest:{path:string;sha256:string;byteSize:number;license:string;source:string}[]}
export interface Release {id:string;console:{id:string;slug:string;name:string;status:string};region:string;revision:string;recommended_core:Core;status:string;compatibility_note:string}
export interface Game {id:string;slug:string;title:string;description:string;genre:string;releases:Release[]}
export interface Installation {id:string;game:Game;release:Release;manifest:Manifest;state:'downloaded'|'ready-offline'|'missing';verifiedAt:number;shellVersion:string}
export type DownloadState='queued'|'checking-space'|'downloading'|'paused'|'verifying'|'verified'|'recoverable-error'|'fatal-error'|'cancelled';
export interface Download {id:string;asset:Asset;state:DownloadState;bytesVerified:number;chunkSize:number;error?:string;updatedAt:number;speed:number}
export interface Chunk {id:string;downloadId:string;index:number;start:number;length:number;sha256:string}
export interface Save {id:string;releaseId:string;core:string;version:string;slot:number;kind:'state';bytes:Uint8Array;sha256:string;createdAt:number}
/** Identity includes version so a catalog republish cannot resume stale chunks. */
export const assetKey=(a:Asset)=>`${a.id}-${a.version}-${a.sha256}`;
export const formatBytes=(n:number)=>n<1048576?`${(n/1024).toFixed(1)} KiB`:`${(n/1048576).toFixed(1)} MiB`;
