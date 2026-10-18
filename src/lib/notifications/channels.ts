import type { NotificationChannel } from "@prisma/client";

export type OutboundMessage = { to: string; title: string; body: string; link?: string | null };

export interface ChannelProvider {
  channel: Exclude<NotificationChannel, "IN_APP">;
  name: string;
  send(message: OutboundMessage): Promise<{ ok: boolean; providerRef?: string }>;
}

/**
 * Demo providers. They record the message in server logs instead of sending it.
 * Replace with real implementations (e.g. a Mongolian SMS gateway, Resend, FCM)
 * by adding a provider here and selecting it with SMS_PROVIDER / EMAIL_PROVIDER.
 */
function demoProvider(channel: ChannelProvider["channel"]): ChannelProvider {
  return {
    channel,
    name: "demo",
    async send(message) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[notify:${channel.toLowerCase()}:demo] -> ${message.to}: ${message.title}. ${message.body}`);
      }
      return { ok: true, providerRef: `demo_${Date.now()}` };
    },
  };
}

const registry: Record<ChannelProvider["channel"], ChannelProvider> = {
  SMS: demoProvider("SMS"),
  EMAIL: demoProvider("EMAIL"),
  PUSH: demoProvider("PUSH"),
};

export function getChannelProvider(channel: ChannelProvider["channel"]): ChannelProvider {
  return registry[channel];
}
