import { describe, expect, it } from "vitest";
import { PRContext } from "../../types";
import { ReviewService } from "../reviewService";

describe("ReviewService", () => {
  const mockApiKey = "test-api-key";
  const mockContext: PRContext = {
    title: "Test PR",
    description: "Test description",
    changes: [
      {
        path: "src/components/Button.tsx",
        content: "export const Button = () => <button>Click me</button>;",
        type: "added",
      },
    ],
    baseBranch: "main",
    targetBranch: "feature/test",
  };

  it("should initialize with API key", () => {
    const service = new ReviewService(mockApiKey);
    expect(service).toBeInstanceOf(ReviewService);
  });

  it("should generate review and tests", async () => {
    const service = new ReviewService(mockApiKey);
    const result = await service.reviewPR(mockContext);

    expect(result).toHaveProperty("review");
    expect(result).toHaveProperty("tests");
    expect(result.review).toHaveProperty("strengths");
    expect(result.review).toHaveProperty("improvements");
    expect(result.review).toHaveProperty("security");
    expect(result.review).toHaveProperty("performance");
    expect(result.review).toHaveProperty("testCoverage");
    expect(result.tests).toHaveProperty("unitTests");
    expect(result.tests).toHaveProperty("integrationTests");
    expect(result.tests).toHaveProperty("e2eTests");
  });
});
