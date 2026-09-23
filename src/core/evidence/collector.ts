import { EvidenceEvent, EvidenceEventType, RhythmSample } from "./types";

type Emit=(event:EvidenceEvent)=>void;

export class EvidenceCollector {
  private seq=0;
  private lastKeyDownAt:number|null=null;
  private burstLength=0;
  private rhythm:RhythmSample[]=[];
  constructor(private submissionId:string, private sessionId:string, private emit:Emit){}

  record(type:EvidenceEventType, data:Partial<Omit<EvidenceEvent,"id"|"submissionId"|"sessionId"|"seq"|"type"|"at">>={}, at=Date.now()){
    const e:EvidenceEvent={id:crypto.randomUUID(),submissionId:this.submissionId,sessionId:this.sessionId,seq:++this.seq,type,at,...data};
    this.emit(e); return e;
  }

  keyDown(at=performance.now()){
    const flight=this.lastKeyDownAt==null?undefined:Math.max(0,at-this.lastKeyDownAt);
    if(flight!=null && flight<1200) this.burstLength++; else this.burstLength=1;
    this.rhythm.push({at:Date.now(),flightMs:flight,burstLength:this.burstLength,pauseBeforeMs:flight!=null&&flight>=1200?flight:undefined});
    this.lastKeyDownAt=at;
  }

  rhythmFeatures(){
    // Typed characters are intentionally not stored here.
    return [...this.rhythm];
  }

  attachDocumentSignals(){
    const onVisibility=()=>this.record(document.hidden?"visibility_hidden":"visibility_visible");
    const onBlur=()=>this.record("blur");
    const onFocus=()=>this.record("focus");
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("blur",onBlur); window.addEventListener("focus",onFocus);
    return ()=>{document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("blur",onBlur);window.removeEventListener("focus",onFocus);};
  }
}
