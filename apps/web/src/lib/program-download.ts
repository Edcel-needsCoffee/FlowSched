import { apiFetch } from './api';
import { downloadWorkbook,exportFileName } from './schedule-export';
export async function downloadProgramWorkbook(kind:'faculty'|'sections'|'rooms',id:string,termId:string,name:string,signatures:Record<string,string>={}){
  const query=new URLSearchParams({termId,...signatures});
  const blob=await apiFetch<Blob>(`/api/exports/${kind}/${id}?${query}`,{responseType:'blob'});
  downloadWorkbook(new Uint8Array(await blob.arrayBuffer()),exportFileName(name));
}
