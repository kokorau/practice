---
name: pr-create
description: Create a PR and ensure it passes CI with no conflicts
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*)
---

Create a Pull Request and ensure it's ready to merge:

## Steps

1. **Verify branch status**
   - Confirm you're not on master branch
   - Check for uncommitted changes

2. **Push branch to origin**
   ```bash
   git push -u origin HEAD
   ```

3. **Create Pull Request**
   - Use `gh pr create` with appropriate title and body
   - Follow the PR template format from CLAUDE.md

4. **Check for conflicts**
   - If conflicts exist with master, resolve them
   - Rebase or merge as appropriate

5. **Wait for CI**
   - Use `gh pr checks` to monitor CI status
   - If CI fails, investigate and fix the issues
   - Repeat until all checks pass

6. **Final verification**
   - Confirm PR is ready for review with `gh pr view`

## Notes
- PR should be created against master branch
- Commit messages should be clear and descriptive
- Fix any linting or type errors before pushing
