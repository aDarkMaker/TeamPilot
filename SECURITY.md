# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Please report security issues privately. Do not open a public issue, and do not
discuss the finding in public until it has been addressed.

**Preferred channel - GitHub private vulnerability reporting:**

https://github.com/aDarkMaker/TeamPilot/security/advisories/new

That route keeps the report, the discussion and the fix advisory visible only to
the maintainer. If you cannot use it, email `2261265112@qq.com` with `SECURITY`
in the subject line.

### What to include

- A description of the issue and the impact you believe it has
- Steps to reproduce, or a minimal proof of concept
- The affected surface: URL, endpoint, or file and revision
- Any preconditions required to trigger it

Please redact real user data, credentials and tokens from screenshots and logs.

### What to expect

| Stage                           | Target                             |
| ------------------------------- | ---------------------------------- |
| Acknowledgement of your report  | 3 business days                    |
| Initial assessment and severity | 7 business days                    |
| Fix or mitigation               | Agreed with you, based on severity |

We will keep you updated as the assessment progresses, and we will credit you in
the advisory unless you ask us not to. Fixes ship to the live deployment, so
there is no staged patch release to wait for.

## Scope

In scope:

- The production deployment at `https://huaxiaoke.work`
- Authentication and session handling (`/api/auth/*`, JWT carried in an httpOnly cookie)
- Authorization boundaries between the `user`, `admin` and `super_admin` roles
- The public recruitment endpoints and the file upload path

Out of scope:

- Findings that require an existing `admin` or `super_admin` session and grant no
  additional privilege
- Denial of service, spam and volumetric attacks
- Missing hardening headers with no demonstrated impact
- Scanner output without a working proof of concept
- Social engineering aimed at maintainers

## Guidelines

- Do not access, modify or exfiltrate data that is not yours. Use your own
  account and test data where possible.
- Do not run automated scanners against the production deployment. Ask first and
  we will arrange a target.
- Allow reasonable time for a fix before any public disclosure.
- There is no paid bounty programme. We are glad to credit reporters in the
  advisory.

## Notes

This policy covers the current `main` branch and the live deployment. It is
reviewed when the deployment changes.
