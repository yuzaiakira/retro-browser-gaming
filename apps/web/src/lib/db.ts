import {openDB, type DBSchema} from 'idb';
import type {Chunk,Download,Game,Installation,Save} from './types';
interface RetroDB extends DBSchema {
 downloads:{key:string;value:Download}; chunks:{key:string;value:Chunk;indexes:{downloadId:string}};
 installations:{key:string;value:Installation}; settings:{key:string;value:unknown};
 saves:{key:string;value:Save}; library:{key:string;value:Game};
}
export const db=()=>openDB<RetroDB>('retro-library',1,{upgrade(database){
 database.createObjectStore('downloads',{keyPath:'id'});
 const chunks=database.createObjectStore('chunks',{keyPath:'id'});chunks.createIndex('downloadId','downloadId');
 database.createObjectStore('installations',{keyPath:'id'});database.createObjectStore('settings');
 database.createObjectStore('saves',{keyPath:'id'});database.createObjectStore('library',{keyPath:'id'});
}});
export async function setting<T>(key:string,fallback:T):Promise<T>{return ((await (await db()).get('settings',key)) as T|undefined)??fallback;}
export async function setSetting(key:string,value:unknown){await (await db()).put('settings',value,key);}
