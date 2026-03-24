# Auth Flow Spec (Design Handoff)

## Scope

This document only covers:

- Login
- Account application (instead of open registration)
- Application review and account activation

## Roles

- `user`: normal account
- `admin`: can review account applications
- `super_admin`: can review applications and appoint admins

## Entry Points

- Login page
- "Apply for account" page
- Application review page (admin+ only)

## Flow A: Login

1. User opens login page.
2. User submits `username + password`.
3. System validates credentials.
4. If valid and account is active:
   - issue access token
   - create/login session context
   - redirect to workspace
5. If invalid:
   - show generic error ("invalid credentials")
6. If account is disabled:
   - deny login
   - show disabled-account message

## Flow B: Apply for Account (Registration Request)

1. Visitor opens "Apply for account".
2. Visitor submits:
   - username
   - password
   - application reason
3. System validates payload and uniqueness.
4. System creates application with `pending` status.
5. UI returns "application submitted" confirmation.

## Flow C: Application Review (Admin+)

1. Admin/Super Admin opens pending application list.
2. Reviewer opens one application detail.
3. Reviewer chooses:
   - Approve
   - Reject
4. Approve path:
   - create `user` account (active)
   - mark application as `approved`
   - store reviewer and reviewed time
5. Reject path:
   - mark application as `rejected`
   - store reviewer and reviewed time

## Permission Rules

- Only `admin` and `super_admin` can review applications.
- Only `super_admin` can appoint `admin`.
- `super_admin` account is bootstrapped from environment config only.
- Public self-registration is not allowed; only application submission is public.

## UI States (for Design)

- Login:
  - default
  - invalid credentials
  - account disabled
- Apply page:
  - default form
  - validation error
  - submitted success
- Review page:
  - pending list
  - empty state
  - approve/reject confirmation
  - action result toast

## API Interaction Summary

- `POST /api/applications` -> submit request
- `GET /api/applications/pending` -> list pending (admin+)
- `POST /api/applications/:id/approve` -> approve (admin+)
- `POST /api/applications/:id/reject` -> reject (admin+)

## Out of Scope (Current Phase)

- Password reset
- MFA
- Email verification
- SSO / OAuth
- Detailed audit timeline UI
