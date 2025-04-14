import { config } from "dotenv";
import { ReviewService } from "./services/reviewService";
import { PRContext } from "./types";

config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

const reviewService = new ReviewService(apiKey);

export async function reviewPullRequest(context: PRContext) {
  try {
    const result = await reviewService.reviewPR(context);
    return result;
  } catch (error) {
    console.error("Failed to review pull request:", error);
    throw error;
  }
}
