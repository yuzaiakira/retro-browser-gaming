import {manifestSchema,type Game,type Manifest} from './types';
export async function api<T>(path:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(`/api/v1/${path}`,{signal,cache:'no-store'});
 if(!response.ok)throw new Error(`API_${response.status}: ${response.status===404?'This game is unavailable.':'Catalog unavailable. Check your connection and retry.'}`);
 return response.json();
}
export type Catalog={count:number;next:string|null;previous:string|null;results:Game[]};
export async function getManifest(releaseId:string):Promise<Manifest>{
 const m=manifestSchema.parse(await api(`releases/${releaseId}/download-manifest/`));
 if(m.releaseId!==releaseId)throw new Error('MANIFEST_ID_MISMATCH');
 const names=new Set(m.assets.map(a=>a.filename));
 if(names.size!==m.assets.length||!names.has(m.entryFile)||m.requiredFiles.some(n=>!names.has(n)))throw new Error('INCOMPLETE_BUNDLE');
 // Local development URLs are proxied through the application origin. S3 URLs stay direct.
 m.assets=m.assets.map(a=>{const u=new URL(a.url,location.origin);if(u.pathname.startsWith('/dev-assets/'))return {...a,url:u.pathname};if(!['https:','http:'].includes(u.protocol))throw new Error('UNSAFE_ASSET_URL');return a;});
 return m;
}
