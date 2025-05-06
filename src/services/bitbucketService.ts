import { PRReviewResult } from "../types";

interface BitbucketComment {
  content: {
    raw: string;
  };
}

export class BitbucketService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private formatReviewAsComment(review: PRReviewResult): string {
    const sections = [
      "## Code Review Summary",
      "\n### Strengths",
      ...review.review.strengths.map((s) => `- ${s}`),
      "\n### Improvements",
      ...review.review.improvements.map((i) => `- ${i}`),
      "\n### Security Considerations",
      ...review.review.security.map((s) => `- ${s}`),
      "\n### Performance",
      ...review.review.performance.map((p) => `- ${p}`),
      "\n### Test Coverage",
      `Current: ${review.review.testCoverage.current}`,
      "\nMissing Tests:",
      ...review.review.testCoverage.missing.map((t) => `- ${t}`),
      "\n### Suggested Tests",
      "\n#### Unit Tests",
      ...review.tests.unitTests.map((t) => `\`\`\`typescript\n${t}\n\`\`\``),
      "\n#### Integration Tests",
      ...review.tests.integrationTests.map(
        (t) => `\`\`\`typescript\n${t}\n\`\`\``
      ),
      "\n#### E2E Tests",
      ...review.tests.e2eTests.map((t) => `\`\`\`typescript\n${t}\n\`\`\``),
    ];

    return sections.join("\n");
  }

  async addComment(
    workspace: string,
    repo: string,
    prNumber: string,
    review: PRReviewResult
  ): Promise<void> {
    const comment: BitbucketComment = {
      content: {
        raw: this.formatReviewAsComment(review),
      },
    };

    const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/pullrequests/${prNumber}/comments`;
    console.log(`\nBitbucket API Call:`);
    console.log(`URL: ${url}`);
    console.log(`Method: POST`);
    console.log(`Headers: {
  Authorization: Bearer ${this.accessToken.substring(0, 5)}...,
  Content-Type: application/json
}`);
    console.log(`Body length: ${JSON.stringify(comment).length} characters`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(comment),
      });

      console.log(
        `\nResponse Status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bitbucket API Error Response:", errorText);
        throw new Error(
          `Failed to add comment: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const responseData = await response.json();
      console.log("Comment added successfully:", responseData);
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }
  }
}
