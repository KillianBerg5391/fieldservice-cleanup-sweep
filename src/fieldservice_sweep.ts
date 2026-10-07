import { z } from "zod";
import { InfraiClient } from "./infrai.js";

export const WorkOrder = z.object({
  id: z.string(), status: z.enum(["open", "dispatched", "closed"]),
  technicianFollowUp: z.boolean(), photoKeys: z.array(z.string()),
});
export type WorkOrder = z.infer<typeof WorkOrder>;

export function stalePhotoKeys(order: WorkOrder): string[] {
  return order.status === "closed" && !order.technicianFollowUp ? order.photoKeys : [];
}

export async function runSweep(orders: WorkOrder[], bucket: string, client = new InfraiClient()) {
  await client.request("/storage/bucket/create", "POST", {name: bucket});
  const keys = orders.flatMap(stalePhotoKeys);
  if (keys.length) await client.request(`/storage/object/delete_batch/${encodeURIComponent(bucket)}`, "POST", {keys});
  return {scanned: orders.length, deleted: keys.length};
}

export async function registerSweep(taskUrl: string, client = new InfraiClient()) {
  return client.request<{job_id: string}>("/cron/create", "POST", {cron_expr: "0 2 * * *", task: taskUrl});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const orders = [
    {id: "WO-1042", status: "closed", technicianFollowUp: false, photoKeys: ["WO-1042/before.jpg", "WO-1042/after.jpg"]},
    {id: "WO-1043", status: "dispatched", technicianFollowUp: false, photoKeys: ["WO-1043/site.jpg"]},
  ].map(value => WorkOrder.parse(value));
  runSweep(orders, process.env.INFRAI_PHOTO_BUCKET ?? "fieldservice-photos").then(result => console.log(JSON.stringify(result)));
}
