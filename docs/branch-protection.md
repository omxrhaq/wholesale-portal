# Branch Protection

This repository relies on GitHub branch protection to make the CI and Security workflows blocking. The workflow files alone are not enough: GitHub must be configured to reject merges when required checks fail.

## Required Settings For `main`

Go to GitHub repository settings:

`Settings -> Branches -> Branch protection rules -> Add rule`

Use this rule:

- Branch name pattern: `main`
- Require a pull request before merging: enabled
- Require approvals: optional for a solo repository, recommended for team work
- Block direct pushes to `main`: enabled through "Restrict who can push to matching branches" or rulesets
- Require status checks to pass before merging: enabled
- Require branches to be up to date before merging: enabled
- Do not allow bypassing the above settings: enabled where available

## Required Checks

Mark these status checks as required:

- `CI / Lint, unit, and docs`
- `CI / Production build`
- `CI / Full regression guardrails`
- `CI / Database migrations`
- `Security / Dependency audit`
- `Security / Secret scan`
- `Security / CodeQL`
- `Security / Security tests and coverage`

GitHub may display job names without the workflow prefix in some settings screens. If so, select the matching job names exactly as they appear on a pull request.

## Code Scanning Merge Blocking

If the repository has GitHub code scanning rulesets available, enable merge blocking for CodeQL alerts. At minimum, block merges on high and critical code scanning alerts.

Suggested settings:

- Code scanning must pass before merge.
- New high or critical alerts block merge.
- Dismissed alerts require a reason.

This cannot be fully enforced from repository files in a public GitHub repository without configuring GitHub settings. Treat this document as the manual setup contract.

## Verification Checklist

After configuring branch protection:

- Open a test pull request against `main`.
- Confirm the PR shows `CI` and `Security` checks.
- Confirm the merge button is disabled while checks are pending.
- Push a harmless commit that makes one required check fail and confirm merge is blocked.
- Confirm direct push to `main` is rejected for normal users.
- Confirm CodeQL/code scanning alerts are visible in `Security -> Code scanning`.
- Confirm Dependabot alerts are visible in `Security -> Dependabot`.
- Compare required checks with `.github/BRANCH_PROTECTION_REQUIRED.md`.
- In `Settings -> Rules -> Rulesets` or `Settings -> Branches`, confirm bypass permissions are disabled or limited to repository administrators only.
- In a test PR, confirm `Security / Dependency audit` fails when `npm run security:audit` fails locally.

Record the active settings in the repository operations notes whenever they change.

## What Repository Code Cannot Enforce

The repository can define workflows, required-check names and documentation, but it cannot by itself enable GitHub branch protection, block administrator bypass, or enable code scanning merge protection. Those settings must be configured by a repository administrator in GitHub.
