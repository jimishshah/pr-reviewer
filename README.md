# PR Reviewer

An AI-powered pull request review tool that uses Google's Gemini AI to analyze code changes and generate comprehensive reviews and test suggestions.

## Features

- Automated code review with focus on:
  - TypeScript best practices
  - React patterns and performance
  - Architecture and code organization
  - Security considerations
- Test generation suggestions for:
  - Unit tests
  - Integration tests
  - E2E tests
- Support for both Bitbucket and GitHub pull requests

## Prerequisites

- Node.js (latest LTS version recommended)
- A Google Gemini API key
- Either a Bitbucket or GitHub access token

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd pr-reviewer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:

```
# Required for all PRs
GEMINI_API_KEY=your_gemini_api_key_here

# Required for Bitbucket PRs
BITBUCKET_ACCESS_TOKEN=your_bitbucket_access_token_here

# Required for GitHub PRs
GITHUB_ACCESS_TOKEN=your_github_access_token_here
```

## Usage

### Command Line Interface

To review a pull request, run:

```bash
npm run review <pr-url>
```

The tool supports both Bitbucket and GitHub PR URLs:

Bitbucket example:

```bash
# Review PR without adding comments
npm run review https://bitbucket.org/workspace/repo/pull-requests/123

# Review PR and add comments directly to Bitbucket
npm run review https://bitbucket.org/workspace/repo/pull-requests/123 -- -c
```

GitHub example:

```bash
npm run review https://github.com/owner/repo/pull/123
```

### Command Line Options

- `-c` or `--comment`: Add review comments directly to the Bitbucket PR (Bitbucket only)

### Programmatic Usage

You can also use the PR reviewer programmatically in your code:

```typescript
import { reviewPullRequest } from "pr-reviewer";

const result = await reviewPullRequest({
  title: "PR Title",
  description: "PR Description",
  changes: [
    {
      path: "src/file.ts",
      type: "modified",
      content: "file content",
    },
  ],
});
```

## Development

- Run tests: `npm test`
- Lint code: `npm run lint`
- Format code: `npm run format`

## Output Format

The review result will be returned in the following format:

```json
{
  "review": {
    "strengths": string[],
    "improvements": string[],
    "security": string[],
    "performance": string[],
    "testCoverage": {
      "current": string,
      "missing": string[]
    }
  },
  "tests": {
    "unitTests": string[],
    "integrationTests": string[],
    "e2eTests": string[]
  }
}
```

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
