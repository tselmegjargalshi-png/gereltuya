import "server-only";
import type { NotificationChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { getChannelProvider } from "./channels";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  /** Extra outbound channels in addition to the in-app inbox. */
  channels?: Exclude<NotificationChannel, "IN_APP">[];
  dedupeKey?: string;
};

export async function notify(input: NotifyInput) {
  if (input.dedupeKey) {
    const existing = await db.notification.findUnique({ where: { dedupeKey: input.dedupeKey } });
    if (existing) return existing;
  }
  const record = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      dedupeKey: input.dedupeKey,
    },
  });

  if (input.channels?.length) {
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, phone: true } });
    await Promise.allSettled(
      input.channels.map((channel) => {
        const to = channel === "EMAIL" ? user?.email : channel === "SMS" ? user?.phone : input.userId;
        if (!to) return Promise.resolve({ ok: false });
        return getChannelProvider(channel).send({ to, title: input.title, body: input.body, link: input.link });
      }),
    );
  }
  return record;
}

export async function notifyMany(inputs: NotifyInput[]) {
  for (const input of inputs) await notify(input);
}
