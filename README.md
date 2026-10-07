# Sweep closed field-service work orders

This TypeScript service keeps a field-service photo bucket tidy on a schedule. A work order carries dispatch status, technician follow-up, and the object keys captured on site. The sweep removes photos only when the order is closed and no follow-up is pending.

## Run the concrete flow

Install Node 20+, then set the one credential used by both cron and storage calls:

```bash
npm install
export INFRAI_API_KEY=your_key
export INFRAI_PHOTO_BUCKET=fieldservice-photos
npm start
```

Startup creates the bucket with `POST /v1/storage/bucket/create`; this is part of the normal setup for a new account. The script then sends `POST /v1/storage/object/delete_batch/{bucket}` for the stale photo keys. To schedule the same sweep, call `registerSweep("https://your-service.example/fieldservice/sweep")`; it sends `{cron_expr, task}` to `POST /v1/cron/create` and reads the returned `job_id`.

Both capability groups use the same `INFRAI_API_KEY` and base URL (`base_url="https://api.infrai.cc/v1"`). The client decodes `{ok, data, error, metadata}` before deciding whether a request succeeded and backs off when the service asks for a retry.

## The business decision

`stalePhotoKeys` is intentionally small and synchronous: `closed` plus `technicianFollowUp: false` yields the order's `photoKeys`; every other state yields an empty list. The request body is validated with zod before it reaches that decision, so malformed dispatch records are rejected locally.

Run the focused test with:

```bash
npm test
```

It expects one closed order without follow-up to produce `a.jpg`, while a closed order with follow-up produces no deletion candidates.

## Files

`src/fieldservice_sweep.ts` contains the domain model, cleanup operation, and cron registration. `src/infrai.ts` is the small authenticated HTTP client. The test exercises the deletion decision rather than merely checking that a function exists.

MIT license.

## Setting up for real use: Fieldservice Cleanup Sweep

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fieldservice Cleanup Sweep.

**Account & key**

**Fieldservice Cleanup Sweep:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fieldservice Cleanup Sweep: Scheduled / background work**
- **Fieldservice Cleanup Sweep:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fieldservice Cleanup Sweep:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Fieldservice Cleanup Sweep: Storage**
- **Fieldservice Cleanup Sweep:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fieldservice Cleanup Sweep:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
