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
  private models: string[] = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro"
  ];

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private cleanResponse(text: string): string {
    // First, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // If no code block found, try to clean the text
    let cleaned = text
      .replace(/```(?:json)?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Try to fix common JSON formatting issues
    cleaned = cleaned
      // Fix missing commas between array elements
      .replace(/"\s*\n\s*"/g, '",\n"')
      // Fix missing commas between object properties
      .replace(/"\s*\n\s*"/g, '",\n"')
      // Remove any trailing commas in arrays or objects
      .replace(/,(\s*[}\]])/g, "$1")
      // Fix escaped characters
      .replace(/\\([^"\\\/bfnrtu])/g, "$1") // Remove invalid escapes
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      ) // Convert unicode escapes
      .replace(/\\n/g, " ") // Replace newlines with spaces
      .replace(/\\r/g, " ") // Replace carriage returns with spaces
      .replace(/\\t/g, " ") // Replace tabs with spaces
      // Fix quotes
      .replace(/(?<!\\)"/g, '\\"')
      .replace(/\\"/g, '"')
      // Remove any remaining invalid escape sequences
      .replace(/\\([^"\\\/bfnrtu])/g, "$1");

    return cleaned;
  }

  private async tryWithModels<T>(
    operation: (modelName: string) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const errors: Error[] = [];
    
    for (const modelName of this.models) {
      try {
        console.log(`Trying ${operationName} with model: ${modelName}`);
        return await operation(modelName);
      } catch (error) {
        console.warn(`${operationName} failed with ${modelName}:`, error instanceof Error ? error.message : error);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    
    throw new Error(
      `${operationName} failed with all models. Errors: ${errors.map(e => e.message).join('; ')}`
    );
  }

  private async generateReview(context: PRContext): Promise<CodeReview> {
    const prompt = this.buildReviewPrompt(context);

    return this.tryWithModels(async (modelName: string) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });

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

      try {
        const cleanText = this.cleanResponse(text);
        const json = JSON.parse(cleanText);
        return CodeReviewSchema.parse(json);
      } catch (error: unknown) {
        console.error("Failed to parse review response:", error);
        console.error("Raw response:", text);

        if (error instanceof Error) {
          throw new Error(
            `Failed to parse review response: ${error.message}\nRaw response: ${text}`
          );
        }
        throw new Error("Failed to parse review response: Unknown error");
      }
    }, "Review generation");
  }

  private async generateTests(context: PRContext): Promise<TestGeneration> {
    const prompt = this.buildTestPrompt(context);

    return this.tryWithModels(async (modelName: string) => {
      const model = this.genAI.getGenerativeModel({ model: modelName });

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

      try {
        const cleanText = this.cleanResponse(text);
        const json = JSON.parse(cleanText);
        return TestGenerationSchema.parse(json);
      } catch (error: unknown) {
        console.error("Failed to parse test response:", error);
        console.error("Raw response:", text);

        if (error instanceof Error) {
          throw new Error(
            `Failed to parse test response: ${error.message}\nRaw response: ${text}`
          );
        }
        throw new Error("Failed to parse test response: Unknown error");
      }
    }, "Test generation");
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
      `
        )
        .join("\n")}
      
      Please provide a structured review focusing on:
      1. Summary of the changes, think from user perspective what the changes mean for the user and impact of the changes
      2. Code quality and best practices
      3. Design patterns and performance
      4. Architecture and code organization
      5. Security considerations
      
      Format the response as a JSON object matching this schema:
      {
        "summary": string,
        "strengths": string[],
        "improvements": string[],
        "security": string[],
        "performance": string[],
        "testCoverage": {
          "current": string,
          "missing": string[]
        }
      }
      Recheck the response JSON is a valid JSON object and fix it before returning.
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
      `
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
