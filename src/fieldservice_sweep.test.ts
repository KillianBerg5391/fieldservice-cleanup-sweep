import assert from "node:assert/strict";
import { stalePhotoKeys, WorkOrder } from "./fieldservice_sweep.js";

const closed = WorkOrder.parse({id: "WO-1", status: "closed", technicianFollowUp: false, photoKeys: ["a.jpg"]});
const followed = WorkOrder.parse({id: "WO-2", status: "closed", technicianFollowUp: true, photoKeys: ["b.jpg"]});
assert.deepEqual(stalePhotoKeys(closed), ["a.jpg"]);
assert.deepEqual(stalePhotoKeys(followed), []);
console.log("stale photo decision passed");
