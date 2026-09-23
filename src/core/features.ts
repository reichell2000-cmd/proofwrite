// FREE features remain on. PRO capability gates are deliberately off; no AI client is shipped.
export const features = {
  free: {
    editor: true,
    autoSave: true,
    evidenceCollector: true,
    thoughtTrace: true,
    proofScore: true,
    writingTimeline: true,
    writingReplay: true,
    externalTextTransformation: true,
    teacherReadingGuide: true,
    studentHighlight: true,
    reflections: true,
    aiUsePolicy: true,
    basicMyProofPrototype: true,
  },
  pro: {
    aiAssessment: false,
    semanticThoughtTrace: false,
    growthEngine: false,
    classAnalytics: false,
    longTermMyProof: false,
    humanAIContribution: false,
    advancedReadingGuide: false,
  },
} as const;
