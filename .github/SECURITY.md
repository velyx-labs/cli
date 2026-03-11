# Security Policy

## Supported Versions

Security fixes are provided for the current maintained CLI version.

| Version | Supported |
| --- | --- |
| Latest | Yes |

## Reporting a Vulnerability

Do not open a public GitHub issue for security problems.

Report vulnerabilities privately at [security@velyx.dev](mailto:security@velyx.dev).

Include:

- a clear description of the issue
- exact reproduction steps
- affected commands, files, or install flows
- expected impact
- a proof of concept if it is necessary to validate the report

## Scope

This policy covers issues in this repository, including:

- CLI command execution and argument handling
- generated file paths and write targets
- dependency installation behavior
- registry communication performed by the CLI
- sensitive data exposure through CLI output or logs

## Out of Scope

The following are generally out of scope:

- vulnerabilities in third-party packages themselves
- security issues in a user's Laravel application unrelated to the CLI
- issues that require physical access or social engineering
- local environment problems with no repo-specific exploit path

## Response Expectations

- acknowledgement within 48 hours
- triage and validation of impact
- coordinated fix and disclosure when appropriate

## Reporter Guidance

- do not disclose the issue publicly before a fix is available
- do not access or alter data you do not own
- keep proofs of concept minimal and targeted

## Contact

- Security: [security@velyx.dev](mailto:security@velyx.dev)
- Fallback: [hello@velyx.dev](mailto:hello@velyx.dev)
