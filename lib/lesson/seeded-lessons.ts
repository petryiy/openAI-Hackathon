import type { LessonSpec } from "@/lib/lesson/schema";
import { SEEDED_CHAIN_RULE_LESSON_ID, seededChainRuleLesson } from "@/lib/lesson/seeded-chain-rule";
import { SEEDED_DERIVATIVE_LESSON_ID, seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";

const SEEDED_LESSONS: Readonly<Record<string, LessonSpec>> = {
  [SEEDED_DERIVATIVE_LESSON_ID]: seededDerivativeLesson,
  [SEEDED_CHAIN_RULE_LESSON_ID]: seededChainRuleLesson,
};

export function getSeededLesson(id: string) {
  return SEEDED_LESSONS[id] ?? null;
}

export function isSeededLessonId(id: string) {
  return id in SEEDED_LESSONS;
}
