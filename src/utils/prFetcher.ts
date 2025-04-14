import { PRContext } from "../types";

export async function fetchPRDetails(prUrl: string): Promise<PRContext> {
  // Extract PR number and repo from URL
  const match = prUrl.match(/pull-requests\/(\d+)/);
  if (!match) {
    throw new Error(
      "Invalid PR URL format. Expected format: https://bitbucket.org/workspace/repo/pull-requests/123",
    );
  }
  const prNumber = match[1];

  // For Bitbucket (since I see bitbucket-pipelines.yml in your workspace)
  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${process.env.BITBUCKET_WORKSPACE}/${process.env.BITBUCKET_REPO_SLUG}/pullrequests/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BITBUCKET_ACCESS_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.statusText}`);
  }

  const prData = await response.json();

  // Fetch changes
  const changesResponse = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${process.env.BITBUCKET_WORKSPACE}/${process.env.BITBUCKET_REPO_SLUG}/pullrequests/${prNumber}/diff`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BITBUCKET_ACCESS_TOKEN}`,
      },
    },
  );

  if (!changesResponse.ok) {
    throw new Error(
      `Failed to fetch PR changes: ${changesResponse.statusText}`,
    );
  }

  const changes = await changesResponse.text();

  return {
    title: prData.title,
    description: prData.description,
    changes: parseChanges(changes),
    baseBranch: prData.destination.branch.name,
    targetBranch: prData.source.branch.name,
  };
}

function parseChanges(diff: string): PRContext["changes"] {
  // Simple diff parser - you might want to use a proper diff parser library
  const changes: PRContext["changes"] = [];
  let currentFile = "";
  let currentContent = "";
  let currentType: "added" | "modified" | "deleted" = "modified";

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        changes.push({
          path: currentFile,
          content: currentContent,
          type: currentType,
        });
      }
      currentFile = line.split(" ")[2].substring(2); // Remove 'a/'
      currentContent = "";
      currentType = "modified";
    } else if (line.startsWith("new file")) {
      currentType = "added";
    } else if (line.startsWith("deleted file")) {
      currentType = "deleted";
    } else {
      currentContent += line + "\n";
    }
  }

  if (currentFile) {
    changes.push({
      path: currentFile,
      content: currentContent,
      type: currentType,
    });
  }

  return changes;
}
