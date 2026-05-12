# Security Specification for DEBI Lab Booking

## Data Invariants
1. **Relational Identity**: Every booking must have a `userEmail` matching the authenticated user's email.
2. **Domain Restriction**: Only `@bu.ac.th` emails are permitted.
3. **Immutability**: Once created, `date`, `startTime`, `endTime`, `userEmail`, and `fullName` cannot be modified by the user.
4. **Action-Based State**: Users can only update the `status` field (to 'cancelled').
5. **Terminal State**: A 'cancelled' booking cannot be reactivated by a user.
6. **Temporal Integrity**: `createdAt` must be set to the server timestamp.
7. **Admin Privilege**: Admins (listed in `/admins/` collection or hardcoded for this demo) have full control.

## The Dirty Dozen Payloads (Rejection Expected)
1. **Identity Spoofing**: User `a@bu.ac.th` tries to create a booking for `b@bu.ac.th`.
2. **Domain Bypass**: User `hacker@gmail.com` tries to create/read a booking.
3. **Shadow Field Injection**: Creating a document with an unvalidated field `isPriority: true`.
4. **Status Hijack**: Changing a `cancelled` booking back to `active`.
5. **Time Tampering**: Updating the `startTime` of an existing booking.
6. **Resource Exhaustion**: Document ID as a 1MB junk string.
7. **Empty Name**: Creating a booking with `fullName` less than 2 characters.
8. **Invalid Date**: Format `2024-13-45`.
9. **Email Spoofing**: Spoofing email token claim without `email_verified`.
10. **Admin Escalation**: User tries to update their own document to add `isAdmin: true`.
11. **PII Blanket Read**: Guest tries to list all emails from the bookings collection.
12. **Future Creation**: Setting `createdAt` to a year in the future.

## Test Runner (Draft)
A `firestore.rules.test.ts` would normally verify these, but here I will focus on the hardened rules directly.
