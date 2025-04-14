import { z } from "zod";

export const CodeReviewSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  security: z.array(z.string()),
  performance: z.array(z.string()),
  testCoverage: z.object({
    current: z.string(),
    missing: z.array(z.string()),
  }),
});

export type CodeReview = z.infer<typeof CodeReviewSchema>;

export const TestGenerationSchema = z.object({
  unitTests: z.array(z.string()),
  integrationTests: z.array(z.string()),
  e2eTests: z.array(z.string()),
});

export type TestGeneration = z.infer<typeof TestGenerationSchema>;

export interface PRReviewResult {
  review: CodeReview;
  tests: TestGeneration;
}

export interface FileChange {
  path: string;
  content: string;
  type: "added" | "modified" | "deleted";
}

export interface PRContext {
  title: string;
  description: string;
  changes: FileChange[];
  baseBranch: string;
  targetBranch: string;
}
