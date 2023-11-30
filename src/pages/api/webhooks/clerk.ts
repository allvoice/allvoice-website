import { type WebhookEvent } from "@clerk/nextjs/server";
import { buffer } from "micro";
import { type NextApiRequest, type NextApiResponse } from "next";
import { Webhook } from "svix";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405);
  }
  // Get the headers
  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Error occured -- no svix headers" });
  }

  // console.log("headers", req.headers, svix_id, svix_signature, svix_timestamp);
  // Get the body
  const body = (await buffer(req)).toString();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).json({ Error: err });
  }

  if (evt.type === "user.updated") {
    const userId = evt.data.id;
    const username = evt.data.username;
    if (username) {
      try {
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            username: username,
          },
        });
      } catch (err) {
        return res.status(500).json({ Error: err });
      }
    }
  }

  return res.status(200).json({ response: "Success" });
}
