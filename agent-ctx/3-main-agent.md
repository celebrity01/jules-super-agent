# Task 3 - Main Agent: Add GitHub Repository Creation Feature

## Summary
Added a complete GitHub repository creation feature to the Jules Super Agent, including API proxy routes, client helpers, a dialog component, and sidebar GitHub token management.

## Files Created
1. `src/app/api/github/user/route.ts` - GET proxy to GitHub API /user
2. `src/app/api/github/repos/route.ts` - GET proxy to GitHub API /user/repos
3. `src/app/api/github/create-repo/route.ts` - POST proxy to GitHub API /user/repos
4. `src/components/add-repo-dialog.tsx` - Two-tab dialog (Create New / Connect Existing)

## Files Modified
1. `src/lib/jules-client.ts` - Added GitHubUser, GitHubRepo types and getGitHubUser, getGitHubRepos, createGitHubRepo helpers
2. `src/components/dashboard.tsx` - Added githubToken state (localStorage), showAddRepoDialog state, renders AddRepoDialog
3. `src/components/sidebar.tsx` - Added GitHub Connection section in Settings, "+" Add Repo buttons in Sessions/Sources views

## Verification
- `bun run lint` — zero errors
- Dev server compiles and runs without errors
