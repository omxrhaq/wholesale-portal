# Branch Protection Required Checks

GitHub branch protection or repository rulesets must require these checks before merging to `main`:

- `CI / Lint, unit, and docs`
- `CI / Production build`
- `CI / Full regression guardrails`
- `CI / Database migrations`
- `Security / Dependency audit`
- `Security / Secret scan`
- `Security / CodeQL`
- `Security / Security tests and coverage`

Repository code cannot enforce these GitHub settings by itself. A repository admin must configure them in GitHub:

`Settings -> Branches -> Branch protection rules` or `Settings -> Rules -> Rulesets`

Manual requirements:

- Require a pull request before merging.
- Block direct pushes to `main`.
- Require the status checks listed above.
- Require branches to be up to date before merging.
- Block merges on high/critical CodeQL or code scanning alerts where the repository plan supports code scanning protection rules.

Verification:

- A test pull request cannot merge while a required check is pending.
- A test pull request cannot merge after a required check fails.
- A normal user cannot push directly to `main`.
- New high/critical CodeQL alerts block merge where code scanning protection is available.
