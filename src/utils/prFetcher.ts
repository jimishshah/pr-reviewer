import { PRContext } from "../types";

interface RepoInfo {
  platform: "bitbucket" | "github";
  workspace: string;
  repo: string;
  prNumber: string;
}

function extractRepoInfo(prUrl: string): RepoInfo {
  // Try Bitbucket URL first
  const bitbucketMatch = prUrl.match(
    /bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/
  );
  if (bitbucketMatch) {
    return {
      platform: "bitbucket",
      workspace: bitbucketMatch[1],
      repo: bitbucketMatch[2],
      prNumber: bitbucketMatch[3],
    };
  }

  // Try GitHub URL
  const githubMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (githubMatch) {
    return {
      platform: "github",
      workspace: githubMatch[1],
      repo: githubMatch[2],
      prNumber: githubMatch[3],
    };
  }

  throw new Error(
    "Invalid PR URL format. Expected format:\n" +
      "Bitbucket: https://bitbucket.org/workspace/repo/pull-requests/123\n" +
      "GitHub: https://github.com/owner/repo/pull/123"
  );
}

async function fetchBitbucketPR(
  workspace: string,
  repo: string,
  prNumber: string
): Promise<PRContext> {
  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/pullrequests/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BITBUCKET_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.statusText}`);
  }

  const prData = await response.json();

  const changesResponse = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/pullrequests/${prNumber}/diff`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BITBUCKET_ACCESS_TOKEN}`,
      },
    }
  );

  if (!changesResponse.ok) {
    throw new Error(
      `Failed to fetch PR changes: ${changesResponse.statusText}`
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

async function fetchGitHubPR(
  owner: string,
  repo: string,
  prNumber: string
): Promise<PRContext> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch PR: ${response.statusText}`);
  }

  const prData = await response.json();

  const changesResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!changesResponse.ok) {
    throw new Error(
      `Failed to fetch PR changes: ${changesResponse.statusText}`
    );
  }

  const changesData = await changesResponse.json();

  return {
    title: prData.title,
    description: prData.body || "",
    changes: changesData.map((file: any) => ({
      path: file.filename,
      content: file.patch || "",
      type:
        file.status === "added"
          ? "added"
          : file.status === "removed"
            ? "deleted"
            : "modified",
    })),
    baseBranch: prData.base.ref,
    targetBranch: prData.head.ref,
  };
}

export async function fetchPRDetails(prUrl: string): Promise<PRContext> {
  const repoInfo = extractRepoInfo(prUrl);

  if (repoInfo.platform === "bitbucket") {
    if (!process.env.BITBUCKET_ACCESS_TOKEN) {
      throw new Error(
        "BITBUCKET_ACCESS_TOKEN environment variable is required for Bitbucket PRs"
      );
    }
    return fetchBitbucketPR(
      repoInfo.workspace,
      repoInfo.repo,
      repoInfo.prNumber
    );
  } else {
    if (!process.env.GITHUB_ACCESS_TOKEN) {
      throw new Error(
        "GITHUB_ACCESS_TOKEN environment variable is required for GitHub PRs"
      );
    }
    return fetchGitHubPR(repoInfo.workspace, repoInfo.repo, repoInfo.prNumber);
  }
}

function parseChanges(diff: string): PRContext["changes"] {
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
