import { EvidenceEvent, WritingSnapshot } from "../evidence/types";

export type ReadingGuideReason = "student_pick" | "major_revision" | "paste_transformation" | "late_revision";

export interface ReadingGuideItem {
  reason: ReadingGuideReason;
  title: string;
  detail: string;
  snapshotSeq?: number;
  eventSeq?: number;
}

export function buildReadingGuide(events: EvidenceEvent[], snapshots: WritingSnapshot[], studentPick?: string): ReadingGuideItem[] {
  const items: ReadingGuideItem[]=[];
  if(studentPick?.trim()) items.push({reason:"student_pick",title:"학생이 선생님께 꼭 보여주고 싶은 대목",detail:studentPick.trim()});
  const major=events.filter(e=>e.type==="replace" && ((e.insertedChars??0)+(e.deletedChars??0)>=120)).sort((a,b)=>((b.insertedChars??0)+(b.deletedChars??0))-((a.insertedChars??0)+(a.deletedChars??0)))[0];
  if(major) items.push({reason:"major_revision",title:"변화가 큰 대목",detail:`한 번에 약 ${(major.insertedChars??0)+(major.deletedChars??0)}자 규모로 다시 구성했습니다.`,eventSeq:major.seq});
  const paste=events.filter(e=>e.type==="paste").sort((a,b)=>(b.insertedChars??0)-(a.insertedChars??0))[0];
  if(paste) items.push({reason:"paste_transformation",title:"확인할 외부 텍스트 구간",detail:`${paste.insertedChars??0}자가 붙여넣어진 시점과 이후 수정과정을 확인하세요.`,eventSeq:paste.seq});
  if(snapshots.length>1) items.push({reason:"late_revision",title:"마지막까지 다듬은 부분",detail:"최종 두 버전의 차이를 확인하면 학생이 마지막에 무엇을 고쳤는지 볼 수 있습니다.",snapshotSeq:snapshots.at(-1)?.seq});
  return items.slice(0,3);
}
