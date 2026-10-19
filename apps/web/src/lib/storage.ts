import {createSHA256} from 'hash-wasm';
import {assetKey,type Asset} from './types';
export async function assetDirectory(a:Asset,create=false){const root=await navigator.storage.getDirectory();const games=await root.getDirectoryHandle('games',{create});return games.getDirectoryHandle(assetKey(a),{create});}
export async function assetFile(a:Asset){return (await (await assetDirectory(a)).getFileHandle('content.bin')).getFile();}
export async function hashFile(file:Blob){const hasher=await createSHA256();hasher.init();const reader=file.stream().getReader();try{for(;;){const {done,value}=await reader.read();if(done)break;hasher.update(value);}}finally{reader.releaseLock();}return hasher.digest();}
export async function verifyAsset(a:Asset){try{const f=await assetFile(a);return f.size===a.byteSize&&await hashFile(f)===a.sha256;}catch{return false;}}
export async function removeAsset(a:Asset){const root=await navigator.storage.getDirectory();try{const games=await root.getDirectoryHandle('games');await games.removeEntry(assetKey(a),{recursive:true});}catch(e){if(!(e instanceof DOMException&&e.name==='NotFoundError'))throw e;}}
