import { config } from "dotenv";
import { reviewPullRequest } from "./index";
import { fetchPRDetails } from "./utils/prFetcher";

config();

async function main() {
  const prUrl = process.argv[2];
  if (!prUrl) {
    console.error("Please provide a PR URL");
    process.exit(1);
  }

  try {
    console.log("Fetching PR details...");
    const prContext = await fetchPRDetails(prUrl);

    console.log("Reviewing PR...");
    const result = await reviewPullRequest(prContext);

    console.log("\nReview Results:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
