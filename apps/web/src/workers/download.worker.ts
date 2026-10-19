import {createSHA256,sha256} from 'hash-wasm';
import {db} from '@/lib/db';import {assetDirectory} from '@/lib/storage';import {assetKey,assetSchema,type Asset,type Download} from '@/lib/types';import {fetchRange} from '@/features/range';
interface SyncHandle{write(b:Uint8Array,o:{at:number}):number;read(b:Uint8Array,o:{at:number}):number;flush():void;truncate(n:number):void;close():void;getSize():number}
let controller:AbortController|undefined;let active=false;
self.onmessage=async(e:MessageEvent)=>{if(e.data.type==='pause'){controller?.abort();return;}if(e.data.type!=='start'||active)return;active=true;controller=new AbortController();const signal=controller.signal;let record:Download|undefined;let file:SyncHandle|undefined;
 try{const asset:Asset=assetSchema.parse(e.data.asset);const id=assetKey(asset);const database=await db();
 if(!navigator.locks||!navigator.storage.getDirectory)throw new Error('STORAGE_UNSUPPORTED');
 await navigator.locks.request(`asset:${id}`,{ifAvailable:true},async lock=>{if(!lock)throw new Error('DOWNLOAD_BUSY_OTHER_TAB');
 const previous=await database.get('downloads',id);const chunkSize=previous?.chunkSize??Math.min(Math.max(Number(e.data.chunkSize)||8*1024*1024,64*1024),8*1024*1024);
 record={id,asset,state:'checking-space',bytesVerified:0,chunkSize,updatedAt:Date.now(),speed:0};
 const emit=async(state:Download['state'],error?:string)=>{record={...record!,state,error,updatedAt:Date.now()};await database.put('downloads',record);self.postMessage(record);};
 await emit('checking-space');const estimate=await navigator.storage.estimate();if(estimate.quota!==undefined&&estimate.quota-(estimate.usage??0)<asset.byteSize-(previous?.bytesVerified??0)+1024*1024)throw new Error('QUOTA_INSUFFICIENT');
 const directory=await assetDirectory(asset,true);const handle=await directory.getFileHandle('content.bin',{create:true});file=await (handle as unknown as {createSyncAccessHandle():Promise<SyncHandle>}).createSyncAccessHandle();
 // Rehash every journaled chunk after restart; flushed-but-uncommitted bytes are overwritten.
 const committed=new Map<number,boolean>();
 for(const chunk of await database.getAllFromIndex('chunks','downloadId',id)){const bytes=new Uint8Array(chunk.length);const count=file.read(bytes,{at:chunk.start});if(count===chunk.length&&await sha256(bytes)===chunk.sha256){committed.set(chunk.index,true);record!.bytesVerified+=chunk.length;}else await database.delete('chunks',chunk.id);}
 await emit('downloading');let last=performance.now();
 for(let index=0,start=0;start<asset.byteSize;index++,start+=chunkSize){if(signal.aborted)throw new DOMException('Paused','AbortError');if(committed.has(index))continue;const end=Math.min(asset.byteSize-1,start+chunkSize-1);let bytes:Uint8Array|undefined;
 for(let attempt=0;attempt<3;attempt++){try{bytes=await fetchRange(asset,start,end,AbortSignal.any([signal,AbortSignal.timeout(30000)]));break;}catch(error){if(signal.aborted||attempt===2||/RANGE_(200|403|404|412|416)|ETAG_CHANGED/.test(String(error)))throw error;await new Promise(resolve=>setTimeout(resolve,250*2**attempt));}}
 if(!bytes)throw new Error('DOWNLOAD_FAILED');const checksum=await sha256(bytes);const written=file.write(bytes,{at:start});if(written!==bytes.length)throw new Error('SHORT_WRITE');file.flush();
 await database.put('chunks',{id:`${id}:${index}`,downloadId:id,index,start,length:bytes.length,sha256:checksum});
 const now=performance.now();const speed=bytes.length/Math.max(.001,(now-last)/1000);record!.speed=record!.speed?record!.speed*.7+speed*.3:speed;last=now;record!.bytesVerified+=bytes.length;await emit('downloading');}
 await emit('verifying');file.truncate(asset.byteSize);file.flush();const hash=await createSHA256();hash.init();const buffer=new Uint8Array(1024*1024);
 for(let offset=0;offset<asset.byteSize;offset+=buffer.length){if(signal.aborted)throw new DOMException('Paused','AbortError');const count=file.read(buffer,{at:offset});if(count!==Math.min(buffer.length,asset.byteSize-offset))throw new Error('SHORT_READ');hash.update(buffer.subarray(0,count));}
 if(hash.digest()!==asset.sha256)throw new Error('SHA256_MISMATCH');await emit('verified');});
 }catch(error){const message=error instanceof Error?error.message:String(error);if(record){record={...record,state:signal.aborted?'paused':message==='SHA256_MISMATCH'?'fatal-error':'recoverable-error',error:signal.aborted?undefined:message,updatedAt:Date.now()};await (await db()).put('downloads',record);self.postMessage(record);}else self.postMessage({state:'recoverable-error',error:message});}finally{file?.close();active=false;self.postMessage({type:'finished'});}
};
