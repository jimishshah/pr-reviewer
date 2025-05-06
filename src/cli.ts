import { config } from "dotenv";
import { reviewPullRequest } from "./index";
import { fetchPRDetails } from "./utils/prFetcher";
import { BitbucketService } from "./services/bitbucketService";

config();

interface CliOptions {
  addComment: boolean;
  prUrl: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    addComment: false,
    prUrl: "",
  };

  for (const arg of args) {
    if (arg === "--add-comment" || arg === "-c") {
      options.addComment = true;
    } else if (!arg.startsWith("-")) {
      options.prUrl = arg;
    }
  }

  return options;
}

function extractRepoInfo(prUrl: string): {
  workspace: string;
  repo: string;
  prNumber: string;
} {
  const match = prUrl.match(
    /bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/
  );
  if (!match) {
    throw new Error("Invalid Bitbucket PR URL format");
  }
  return {
    workspace: match[1],
    repo: match[2],
    prNumber: match[3],
  };
}

async function main() {
  const options = parseArgs();

  if (!options.prUrl) {
    console.error("Please provide a PR URL");
    console.error("Usage: npm run review [--add-comment|-c] <pr-url>");
    process.exit(1);
  }

  try {
    console.log("Fetching PR details...");
    const prContext = await fetchPRDetails(options.prUrl);

    console.log("Reviewing PR...");
    const result = await reviewPullRequest(prContext);

    console.log("\nReview Results:");
    console.log(JSON.stringify(result, null, 2));

    if (options.addComment) {
      const token = process.env.BITBUCKET_ACCESS_TOKEN;
      if (!token) {
        throw new Error(
          "BITBUCKET_ACCESS_TOKEN environment variable is required for adding comments"
        );
      }

      console.log("\nBitbucket Integration:");
      console.log("Token found:", token.substring(0, 5) + "...");
      console.log("Token length:", token.length);

      const bitbucketService = new BitbucketService(token);
      const repoInfo = extractRepoInfo(options.prUrl);

      console.log("Repo info:", repoInfo);
      console.log("\nAdding comment to Bitbucket PR...");

      try {
        await bitbucketService.addComment(
          repoInfo.workspace,
          repoInfo.repo,
          repoInfo.prNumber,
          result
        );
        console.log("Comment added successfully!");
      } catch (error) {
        console.error("Failed to add comment:", error);
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
