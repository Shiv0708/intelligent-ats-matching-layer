export const PIPELINE_STAGES = [
  { id: 'applied', label: 'Applied', description: 'Application received', color: '#dbeafe' },
  { id: 'screening', label: 'Screening', description: 'Resume & profile review', color: '#e0e7ff' },
  { id: 'phone_screen', label: 'Phone Screen', description: 'Initial recruiter call', color: '#ede9fe' },
  { id: 'technical', label: 'Technical', description: 'Technical assessment / interview', color: '#fef3c7' },
  { id: 'onsite', label: 'Onsite / Final', description: 'Final round interviews', color: '#ffedd5' },
  { id: 'offer', label: 'Offer', description: 'Offer extended', color: '#d1fae5' },
  { id: 'hired', label: 'Hired', description: 'Candidate accepted', color: '#bbf7d0' },
  { id: 'rejected', label: 'Rejected', description: 'Not moving forward', color: '#fee2e2' },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];

export const PIPELINE_STAGE_IDS = PIPELINE_STAGES.map((s) => s.id);

export function isValidStage(stage: string): stage is PipelineStageId {
  return PIPELINE_STAGE_IDS.includes(stage as PipelineStageId);
}

export function getStageMeta(stage: string) {
  return PIPELINE_STAGES.find((s) => s.id === stage) ?? PIPELINE_STAGES[0];
}
