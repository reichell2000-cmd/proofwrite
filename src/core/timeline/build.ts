import { EvidenceEvent } from "../evidence/types";

export type TimelineKind="writing"|"pause"|"paste"|"major_revision"|"focus_exit"|"snapshot";
export interface TimelineMarker { at:number; kind:TimelineKind; label:string; eventSeq?:number; }

export function buildTimeline(events:EvidenceEvent[]):TimelineMarker[]{
  const xs=[...events].sort((a,b)=>a.at-b.at);
  const out:TimelineMarker[]=[];
  for(let i=0;i<xs.length;i++){
    const e=xs[i];
    if(i>0 && e.at-xs[i-1].at>=60_000) out.push({at:xs[i-1].at,kind:"pause",label:`${Math.round((e.at-xs[i-1].at)/60000)}분 중단`});
    if(["insert","delete","replace"].includes(e.type)) out.push({at:e.at,kind:"writing",label:e.type==="insert"?"작성":"수정",eventSeq:e.seq});
    if(e.type==="paste") out.push({at:e.at,kind:"paste",label:`Paste ${e.insertedChars??0}자`,eventSeq:e.seq});
    if(e.type==="replace" && ((e.insertedChars??0)+(e.deletedChars??0)>=120)) out.push({at:e.at,kind:"major_revision",label:"Major Revision",eventSeq:e.seq});
    if(e.type==="blur"||e.type==="visibility_hidden") out.push({at:e.at,kind:"focus_exit",label:"창 이탈",eventSeq:e.seq});
    if(e.type==="snapshot") out.push({at:e.at,kind:"snapshot",label:"Save",eventSeq:e.seq});
  }
  return out;
}
