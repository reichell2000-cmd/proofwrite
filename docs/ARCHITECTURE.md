# Pilot architecture

## Boundaries

Next.js App Router + React + Tiptap/ProseMirror. Existing FREE algorithms remain in `src/core`. UI lives in `src/components`; authenticated Node route handlers in `src/app/api`; durable file operations, authentication and validation in `src/server`.

No LLM client, API key, analytics tracker, external font or AI detector. No system keyboard hooks. PRO flags remain false.

## Writing pipeline

1. Editor document transactions emit ordered ProseMirror steps and a plain-text delta.
2. Korean composition transactions are grouped through compositionend. Raw intermediate composition strings are not separately scored. Editor-only optional rhythm collection excludes composition and repeated keys.
3. Empty start, large changes, manual save, 45-second dirty interval/50-event threshold and submission create checkpoints; ordinary keystrokes store steps rather than full documents.
4. Current document + pending events are copied to IndexedDB approximately once per second while dirty. Server receives batches on a four-second interval, explicit save, reconnect and visibility change.
5. Server validates a 500-event client batch with Zod, revision/sequence checks, ProseMirror replay, text-delta/count equality and snapshot equality. It atomically replaces a submission file under a process-wide write mutex.
6. Submissions lock on final submit. Lost-response batches are idempotent; conflicting versions receive 409 without a blind overwrite.
7. Same-browser Web Locks prevent simultaneous editing tabs. No Web Locks means server conflict handling is the fallback.

## Access model

Teacher: password from environment, HMAC-authenticated HttpOnly/SameSite cookie. Student: unguessable assignment participation code grants creation, then a separate HttpOnly per-document cookie grants read/write access. A student cannot list assignments or open another student's document. Participation code is a classroom invitation, **not verified institutional identity**. The Pilot has a single teacher scope; all users with that password share the same classroom administration.

Cookie lifetime: seven days. Production requires HTTPS, secure cookies, a stable session secret and a configured public origin behind a proxy. No secrets in browser localStorage or exported records. Exported assignment metadata omits its participation code.

## Persistence limits

Single Node process and one persistent volume. Atomic rename prevents partially written JSON; in-process queue serializes mutations. This is not a multi-process database or a geographically replicated store. Teacher lists currently scan submission files. Load/capacity measurements are not yet available.

Per document: about 50k content units, 50k events, 24MB serialized record. Images: PNG/JPEG/WebP <=250KB each, local data URLs only; remote pasted images are stripped to avoid third-party tracking requests. An image change and checkpoints may repeat image data. Long or image-heavy reports should wait for blob storage.

Local recovery does not cache the whole application for offline launch. If the page is already loaded, writing can continue offline; reconnect sends pending records. On recovery conflicts the local backup is preserved and available as JSON. Abrupt device power loss can lose the last unsaved interval. Old local drafts require an institution's device-cleanup policy.

## Evidence limits

Client-originated events cannot establish identity, honest event reporting, or tamper resistance. Sequence/replay validation only establishes internal consistency against earlier server records. Character counts are UTF-16 code units; they are not grapheme counts. Estimated activity sums edit gaps <=60s within the same foreground session; it is not measured attention. Browser exit/session-end events are best effort; a resumed session is explicit even if a previous crash omitted session_end.

## Feedback and follow-up learning

Assignments optionally include a learning goal and up to four content criteria. Old records without these fields remain readable. The roster omits numeric scores; the review opens on full text with process scores inside a closed disclosure.

Teacher review completion requires the reading acknowledgement, a quote present in the final document, a specific strength and a next revision. An optional question and reaction accompany the feedback. Incomplete reviews are stripped from student GET responses. Updating a completed review as a draft hides it until it is sent again.

The student-only `POST /api/submissions/[id]/learning-response` accepts a short rewritten excerpt and an explanation/question after published feedback. It uses the review timestamp and response version for optimistic conflict detection, with idempotent identical retries. The latest response is stored separately without altering the submitted document, events, synchronization revision or process score. Stale responses are labelled as answers to earlier feedback. These short responses are explicitly saved by a button and are not IndexedDB writing drafts. Teacher feedback and student follow-up become part of the existing per-submission JSON export and retention scope.
