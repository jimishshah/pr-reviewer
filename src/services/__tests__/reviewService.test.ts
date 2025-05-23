import { describe, expect, it, vi } from "vitest";
import { PRContext } from "../../types";
import { ReviewService } from "../reviewService";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock the Gemini API
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockImplementation(({ contents }) => {
        const prompt = contents[0].parts[0].text;
        if (prompt.includes("Review the following pull request")) {
          return {
            response: {
              text: vi.fn().mockReturnValue(`
                \`\`\`json
                {
                  "strengths": ["Good code structure"],
                  "improvements": ["Add error handling"],
                  "security": ["No security issues found"],
                  "performance": ["Good performance"],
                  "testCoverage": {
                    "current": "Basic coverage",
                    "missing": ["Edge cases"]
                  }
                }
                \`\`\`
              `),
            },
          };
        } else if (
          prompt.includes("Generate tests for the following code changes")
        ) {
          return {
            response: {
              text: vi.fn().mockReturnValue(`
                \`\`\`json
                {
                  "unitTests": ["Test button click"],
                  "integrationTests": ["Test button in form"],
                  "e2eTests": ["Test button in user flow"]
                }
                \`\`\`
              `),
            },
          };
        }
        throw new Error("Unexpected prompt");
      }),
    }),
  })),
}));

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
    expect(GoogleGenerativeAI).toHaveBeenCalledWith(mockApiKey);
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
