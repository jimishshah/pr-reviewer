import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CodeReview,
  CodeReviewSchema,
  PRContext,
  PRReviewResult,
  TestGeneration,
  TestGenerationSchema,
} from "../types";

export class ReviewService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private cleanResponse(text: string): string {
    // First, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // If no code block found, try to clean the text
    return text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
  }

  private async generateReview(context: PRContext): Promise<CodeReview> {
    const prompt = this.buildReviewPrompt(context);
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Failed to generate review");
    }

    const cleanedText = this.cleanResponse(text);
    console.log("Cleaned response:", cleanedText); // Debug log

    try {
      return CodeReviewSchema.parse(JSON.parse(cleanedText));
    } catch (error: unknown) {
      console.error("Failed to parse review response:", error);
      console.error("Raw response:", text);
      if (error instanceof Error) {
        throw new Error(`Failed to parse review response: ${error.message}`);
      }
      throw new Error("Failed to parse review response: Unknown error");
    }
  }

  private async generateTests(context: PRContext): Promise<TestGeneration> {
    const prompt = this.buildTestPrompt(context);
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Failed to generate tests");
    }

    const cleanedText = this.cleanResponse(text);
    console.log("Cleaned test response:", cleanedText); // Debug log

    try {
      return TestGenerationSchema.parse(JSON.parse(cleanedText));
    } catch (error: unknown) {
      console.error("Failed to parse test response:", error);
      console.error("Raw test response:", text);
      if (error instanceof Error) {
        throw new Error(`Failed to parse test response: ${error.message}`);
      }
      throw new Error("Failed to parse test response: Unknown error");
    }
  }

  private buildReviewPrompt(context: PRContext): string {
    return `
      Review the following pull request:
      Title: ${context.title}
      Description: ${context.description}
      
      Changes:
      ${context.changes
        .map(
          (change) => `
        File: ${change.path}
        Type: ${change.type}
        Content:
        ${change.content}
      `,
        )
        .join("\n")}
      
      Please provide a structured review focusing on:
      1. TypeScript best practices
      2. React patterns and performance
      3. Architecture and code organization
      4. Security considerations
      
      Format the response as a JSON object matching this schema:
      {
        "strengths": string[],
        "improvements": string[],
        "security": string[],
        "performance": string[],
        "testCoverage": {
          "current": string,
          "missing": string[]
        }
      }
    `;
  }

  private buildTestPrompt(context: PRContext): string {
    return `
      Generate tests for the following code changes:
      ${context.changes
        .map(
          (change) => `
        File: ${change.path}
        Content:
        ${change.content}
      `,
        )
        .join("\n")}
      
      Please provide test implementations for:
      1. Unit tests
      2. Integration tests
      3. E2E tests
      
      Format the response as a JSON object matching this schema:
      {
        "unitTests": string[],
        "integrationTests": string[],
        "e2eTests": string[]
      }
    `;
  }

  async reviewPR(context: PRContext): Promise<PRReviewResult> {
    const [review, tests] = await Promise.all([
      this.generateReview(context),
      this.generateTests(context),
    ]);

    return { review, tests };
  }
}
