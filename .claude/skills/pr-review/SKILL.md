---
name: pr-review
description: Review a PR for correctness and quality
allowed-tools: Bash(git:*), Bash(gh:*)
---

Review a Pull Request for quality and correctness.

## Usage
Provide PR number or URL as argument: `/pr-review 123` or `/pr-review https://github.com/...`

## Review Steps

1. **Fetch PR information**
   ```bash
   gh pr view <PR_NUMBER> --json title,body,files,additions,deletions,baseRefName,headRefName
   ```

2. **Get changed files**
   ```bash
   gh pr diff <PR_NUMBER>
   ```

3. **Checkout PR locally** (if needed for deeper analysis)
   ```bash
   gh pr checkout <PR_NUMBER>
   ```

4. **Review checklist**
   - [ ] PR title and description are clear
   - [ ] Changes match the stated purpose
   - [ ] No unrelated changes included
   - [ ] Code follows project conventions
   - [ ] No obvious bugs or security issues
   - [ ] Tests are included if applicable

5. **Provide feedback**
   - Summarize the changes
   - List any concerns or suggestions
   - Give overall assessment (approve/request changes/comment)

## Notes
- Focus on correctness and maintainability
- Check for breaking changes
- Verify backward compatibility handling follows CLAUDE.md guidelines
