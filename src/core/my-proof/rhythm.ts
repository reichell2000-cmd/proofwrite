import { RhythmSample } from "../evidence/types";

export interface RhythmProfile {
  sampleCount:number;
  medianFlightMs:number|null;
  p90FlightMs:number|null;
  medianBurstLength:number|null;
}

const median=(xs:number[])=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const percentile=(xs:number[],p:number)=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))];};

export function buildRhythmProfile(samples:RhythmSample[]):RhythmProfile{
  const flights=samples.map(x=>x.flightMs).filter((x):x is number=>typeof x==="number"&&x<5000);
  const bursts=samples.map(x=>x.burstLength).filter((x):x is number=>typeof x==="number");
  return {sampleCount:samples.length,medianFlightMs:median(flights),p90FlightMs:percentile(flights,.9),medianBurstLength:median(bursts)};
}

// Conservative prototype signal. It measures profile continuity, never identity.
export function rhythmContinuity(a:RhythmProfile,b:RhythmProfile):number|null{
  if(a.sampleCount<40||b.sampleCount<40||a.medianFlightMs==null||b.medianFlightMs==null)return null;
  const d=Math.abs(a.medianFlightMs-b.medianFlightMs)/Math.max(80,a.medianFlightMs,b.medianFlightMs);
  return Math.max(0,Math.min(1,1-d));
}
