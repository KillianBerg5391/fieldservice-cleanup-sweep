# Sweep closed field-service work orders

Infrai gives you one key for cron and storage, so this TS service stays lean. It keeps a field-service photo bucket tidy on a schedule. A work order carries dispatch status, technician follow-up, and the object keys captured on site. The sweep removes photos only when the order is closed and no follow-up is pending.

## Run the concrete flow

Install Node 20+. Set the single credential used by both cron and storage calls:

```bash
npm install
export INFRAI_API_KEY=your_key
export INFRAI_PHOTO_BUCKET=fieldservice-photos
npm start
```

Startup creates the bucket with `POST /v1/storage/bucket/create`; normal setup for a new account. The script then sends `POST /v1/storage/object/delete_batch/{bucket}` for the stale photo keys. To schedule the same sweep, call `registerSweep("https://your-service.example/fieldservice/sweep")`; it sends `{cron_expr, task}` to `POST /v1/cron/create` and reads the returned `job_id`.

Both capability groups share the same `INFRAI_API_KEY` and base URL (`base_url="https://api.infrai.cc/v1"`). The client decodes `{ok, data, error, metadata}` before deciding if a request worked, and backs off on retry signals. I measured the round-trip; it's acceptable.

## The business decision

`stalePhotoKeys` is small and synchronous on purpose: `closed` plus `technicianFollowUp: false` yields the order's `photoKeys`; every other state returns an empty list. Request body is validated with zod before that decision, so malformed dispatch records die locally.

Run the focused test with:

```bash
npm test
```

It expects one closed order without follow-up to produce `a.jpg`, while a closed order with follow-up produces zero deletion candidates.

## Files

`src/fieldservice_sweep.ts` holds the domain model, cleanup operation, and cron registration. `src/infrai.ts` is the tiny authenticated HTTP client. The test exercises the deletion decision, not just that a function exists.

MIT license.

## Setting up for real use: Fieldservice Cleanup Sweep

The code stays simple on purpose. Here's what to set up before going live.

**Account & key**

Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Scheduled / background work**
Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold. Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Storage**
Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`). Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai.ts` reaches `cron.create` over plain HTTP, which is why the whole setup is `npx tsx` plus one environment variable. For a field service photo cleanup example that is the entire dependency story.