import { PromptStage } from './schemas/prompt.schema';

interface PromptTemplate {
  stage: PromptStage;
  index: number;
  text: string;
}

export function generatePrompts(
  brandName: string,
  category: string,
  competitors: string[],
  targetAudience: string,
): PromptTemplate[] {
  const prompts: PromptTemplate[] = [];

  // === AWARENESS STAGE (6 prompts) — brand discovery, no brand name ===
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 1,
    text: `What are the best skincare brands for ${category}?`,
  });
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 2,
    text: `Recommend a good ${category} brand for ${targetAudience}`,
  });
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 3,
    text: `Which ${category} brands do dermatologists recommend?`,
  });
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 4,
    text: `Top-rated ${category} brands in 2026`,
  });
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 5,
    text: `What ${category} brands are most trusted for ${targetAudience}?`,
  });
  prompts.push({
    stage: PromptStage.AWARENESS,
    index: 6,
    text: `Which ${category} brands are most popular right now?`,
  });

  // === CONSIDERATION STAGE (6 prompts) — brand vs competitor + generic ===
  // Use up to 3 competitor vs prompts, fill remaining with generic
  const vsPrompts: PromptTemplate[] = competitors.slice(0, 3).map((comp, i) => ({
    stage: PromptStage.CONSIDERATION,
    index: i + 1,
    text: `${brandName} vs ${comp} for ${category} — which is better?`,
  }));

  const genericConsideration = [
    `Is ${brandName} worth it for ${targetAudience}?`,
    `What do people say about ${brandName} ${category}?`,
    `How does ${brandName} compare to other ${category} brands?`,
  ];

  const remainingSlots = 6 - vsPrompts.length;
  vsPrompts.forEach((p) => prompts.push(p));
  genericConsideration.slice(0, remainingSlots).forEach((text, i) =>
    prompts.push({
      stage: PromptStage.CONSIDERATION,
      index: vsPrompts.length + i + 1,
      text,
    }),
  );

  // === DECISION STAGE (6 prompts) — purchase intent ===
  prompts.push({
    stage: PromptStage.DECISION,
    index: 1,
    text: `Should I buy ${brandName} for ${category}?`,
  });
  prompts.push({
    stage: PromptStage.DECISION,
    index: 2,
    text: `Where is the best place to buy ${brandName}?`,
  });
  prompts.push({
    stage: PromptStage.DECISION,
    index: 3,
    text: `Is ${brandName} still recommended in 2026?`,
  });
  prompts.push({
    stage: PromptStage.DECISION,
    index: 4,
    text: `Is ${brandName} a legit ${category} brand?`,
  });
  prompts.push({
    stage: PromptStage.DECISION,
    index: 5,
    text: `What is the best ${brandName} product for ${targetAudience}?`,
  });
  prompts.push({
    stage: PromptStage.DECISION,
    index: 6,
    text: `Is ${brandName} safe to use for ${targetAudience}?`,
  });

  return prompts;
}
