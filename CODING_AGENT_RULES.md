# Coding Agent Rules

**READ THIS FILE FIRST** - Essential rules for all AI coding agents (Claude, Gemini, Codex, etc.)

## Post-Push Deployment Checks

### ⚠️ CRITICAL: Always Check Vercel Deployments After Pushing

After running `git push`, **ALWAYS** check Vercel deployment logs:

```bash
# 1. List recent deployments to see status
vercel ls

# 2. If latest deployment shows "● Error", get the logs
vercel logs <deployment-url>

# 3. If build fails, fix the issue and push again
```

**Why this matters:**
- Build errors are only visible in Vercel logs, not in local development
- Missing imports, environment variables, or build configuration issues won't surface until deployment
- Users expect you to proactively monitor and fix deployment issues

**Process:**
1. Make changes locally
2. Test locally if possible (`npm run build` or `npm run dev`)
3. Commit and push changes
4. **IMMEDIATELY** run `vercel ls` to check deployment status
5. If deployment shows "● Error", run `vercel logs <url>` and fix the issue
6. Repeat until deployment shows "● Ready"

## Code Quality Standards

### Always Prefer Existing Files
- **NEVER** create new files when you can edit existing ones
- Check for existing implementations before writing new code
- Reuse existing patterns and utilities

### Type Safety
- Always add proper TypeScript types
- Use type guards when filtering arrays
- Validate data at boundaries (API endpoints, form submissions)

### React Best Practices
- Wrap rendered text in proper elements (`<span>`, `<p>`, etc.)
- Never render objects directly - convert to strings first
- Filter out null/undefined values before mapping
- Use stable keys in lists (avoid index-based keys)

### Testing Before Committing
- Run `npm run build` to catch build errors
- Run `npm run test` if tests exist (but don't let failing tests block urgent fixes)
- Check `npm run lint` for code quality issues

## Git Workflow

### Commit Messages
- Use descriptive, imperative commit messages
- Include "why" not just "what"
- Add implementation details in commit body
- Always include the Claude Code attribution footer

### When to Use --no-verify
- Only use `git commit --no-verify` when:
  - Pre-commit hooks are failing on unrelated issues
  - Urgent production fixes are needed
  - You've confirmed the changes are safe
- **NEVER** use it to skip legitimate errors in your changes

## Debugging

### Check These First
1. Import paths - ensure all imports resolve correctly
2. Environment variables - check `.env.local` and Vercel dashboard
3. Build configuration - verify `next.config.js`, `vercel.json`, etc.
4. Dependencies - ensure `package.json` has all required packages
5. Type errors - TypeScript errors often indicate real issues

### Common Issues
- **Module not found**: Check import paths, file exists, and tsconfig paths
- **React rendering errors**: Check for objects being rendered as children
- **Build timeouts**: Look for infinite loops or heavy computations
- **Type errors**: Don't use `any` to bypass - fix the types properly

## Communication

### What to Report
- **Always** summarize what you changed and why
- **Always** report deployment status after pushing
- **Always** explain trade-offs in your implementation choices
- **Never** create files without explicitly stating what you created

### When to Ask Questions
- When requirements are ambiguous
- When multiple approaches are viable
- When changes might affect other parts of the system
- When you're unsure about deployment or infrastructure

## Remember

**Your job isn't done when code is pushed - it's done when the deployment is successful.**

Check `vercel ls` after every push. Fix errors immediately. Report status to the user.
