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

## Prerequisites

- Node.js (latest LTS version recommended)
- A Google Gemini API key

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

3. Create a `.env` file in the root directory and add your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

## Usage

### Command Line Interface

To review a pull request, run:

```bash
npm run review <pr-url>
```

For example:

```bash
npm run review https://github.com/username/repo/pull/123
```

### Programmatic Usage

You can also use the PR reviewer programmatically in your code:

```typescript
import { reviewPullRequest } from "@beautybay-web/pr-reviewer";

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

The review results will be returned in the following format:

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
