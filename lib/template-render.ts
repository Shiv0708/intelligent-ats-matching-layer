export interface TemplateContext {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  stage: string;
  stageLabel: string;
  companyName: string;
  schedulingLink: string;
  notes: string;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = ctx[key as keyof TemplateContext];
    return value ?? '';
  });
}
