Run the full ship workflow:

1. **Branch** — create a new feature branch named `ship/<short-slug>` based on the staged/unstaged changes (e.g. `ship/improve-product-ui`)
2. **Commit** — stage all changed files and commit with a concise message describing what changed
3. **Push** — push the branch to the remote with `-u origin <branch>`
4. **PR** — create a GitHub pull request into main using `gh pr create` with a short title and a brief summary of the changes
5. **Merge** — once the PR is created, immediately merge it with `gh pr merge --squash --delete-branch` and confirm it landed on main

Report the PR URL and final commit SHA when done.
