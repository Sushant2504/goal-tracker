import { prisma } from "./prisma";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message, link },
  });
}

export async function sendTeamsNotification(
  webhookUrl: string,
  title: string,
  message: string,
  link?: string
) {
  const card = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: title,
    themeColor: "0076D7",
    title,
    sections: [
      {
        activityTitle: title,
        text: message,
      },
    ],
    potentialAction: link
      ? [
          {
            "@type": "OpenUri",
            name: "Open in Portal",
            targets: [{ os: "default", uri: link }],
          },
        ]
      : [],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
  } catch {
    console.error("Failed to send Teams notification");
  }
}
