import type {Asset} from '@/lib/types';
export async function fetchRange(a:Asset,start:number,end:number,signal:AbortSignal):Promise<Uint8Array>{
 const headers:Record<string,string>={Range:`bytes=${start}-${end}`};if(a.etag)headers['If-Match']=`"${a.etag.replaceAll('"','')}"`;
 const response=await fetch(a.url,{headers,signal,cache:'no-store'});
 if(response.status!==206)throw new Error(`RANGE_${response.status}${[403,404,412,416].includes(response.status)?': Refresh manifest or re-download.':''}`);
 if(response.headers.get('Content-Range')!==`bytes ${start}-${end}/${a.byteSize}`)throw new Error('INVALID_CONTENT_RANGE');
 const etag=response.headers.get('ETag');if(a.etag&&etag&&etag.replaceAll('"','')!==a.etag.replaceAll('"',''))throw new Error('ETAG_CHANGED');
 const length=end-start+1;const bytes=new Uint8Array(length);let offset=0;const reader=response.body?.getReader();if(!reader)throw new Error('EMPTY_BODY');
 try{for(;;){const {done,value}=await reader.read();if(done)break;if(offset+value.byteLength>length)throw new Error('OVERSIZED_CHUNK');bytes.set(value,offset);offset+=value.byteLength;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(offset!==length)throw new Error('TRUNCATED_CHUNK');return bytes;
}
