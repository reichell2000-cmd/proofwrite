export const features = {
  free: {
    editor:true, evidenceCollector:true, thoughtTrace:true, proofScore:true,
    writingTimeline:true, writingReplay:true, teacherReadingGuide:true,
    studentHighlight:true, basicMyProofPrototype:true
  },
  pro: {
    aiAssessment:false, semanticThoughtTrace:false, growthEngine:false,
    classAnalytics:false, longTermMyProof:false
  }
} as const;
