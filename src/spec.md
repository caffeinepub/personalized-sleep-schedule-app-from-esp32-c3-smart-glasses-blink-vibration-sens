# Specification

## Summary
**Goal:** Unblock the stuck live deployment by forcing a clean rebuild of the Eye-R frontend and backend and redeploying the freshly built artifacts to the live canister, with verbatim error reporting if anything fails.

**Planned changes:**
- Run a clean (no-cache) build for both the Motoko backend and React frontend.
- Redeploy the newly built WASM and frontend assets to the **live** canister (not draft).
- Add a post-deploy smoke test to confirm the live URL loads and the backend canister responds to basic calls.
- If any build/deploy step fails, capture and present verbatim failure details: failing step, exact command, full stdout/stderr, and exit code.

**User-visible outcome:** The live Eye-R URL loads the latest frontend and the live backend canister responds; if deployment fails, the exact build/deploy error output is available for diagnosis.
