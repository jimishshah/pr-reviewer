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
                  "summary": "This PR adds a new calculator function",
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
                  "unitTests": ["Test function behavior"],
                  "integrationTests": ["Test module integration"],
                  "e2eTests": ["Test complete user workflow"]
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
        path: "src/utils/calculator.js",
        content: "function add(a, b) { return a + b; }",
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

  it("should fallback to other models when one fails", async () => {
    // Mock the Gemini API to fail for the first model and succeed for the second
    let callCount = 0;
    const mockGenerateContent = vi.fn().mockImplementation(({ contents }) => {
      const prompt = contents[0].parts[0].text;
      callCount++;
      
      if (callCount <= 2) {
        // First two calls (one for review, one for tests) should fail
        throw new Error("Model unavailable");
      } else {
        // Subsequent calls should succeed
        if (prompt.includes("Review the following pull request")) {
          return {
            response: {
              text: vi.fn().mockReturnValue(`
                \`\`\`json
                {
                  "summary": "Fallback model worked for review",
                  "strengths": ["Resilient system"],
                  "improvements": ["None needed"],
                  "security": ["All good"],
                  "performance": ["Excellent"],
                  "testCoverage": {
                    "current": "Full coverage",
                    "missing": []
                  }
                }
                \`\`\`
              `),
            },
          };
        } else {
          return {
            response: {
              text: vi.fn().mockReturnValue(`
                \`\`\`json
                {
                  "unitTests": ["Fallback test worked"],
                  "integrationTests": ["Integration fallback worked"],
                  "e2eTests": ["E2E fallback worked"]
                }
                \`\`\`
              `),
            },
          };
        }
      }
    });

    // Replace the mock
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }) as any);

    const service = new ReviewService(mockApiKey);
    const result = await service.reviewPR(mockContext);

    // Should succeed with the fallback model
    expect(result.review.summary).toBe("Fallback model worked for review");
    expect(result.tests.unitTests[0]).toBe("Fallback test worked");
    expect(mockGenerateContent).toHaveBeenCalledTimes(4); // 2 failures + 2 successes
  });
});
