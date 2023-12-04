import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "~/env.mjs";
import { type S3Event, type S3EventRecord } from "aws-lambda";
import { prisma } from "~/server/db";
import logger from "~/logger";

type CephEventRecord = S3EventRecord & { eventId: string; opaqueData: string };
type CephS3Event = Omit<S3Event, "Records"> & { Records: CephEventRecord[] };

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logger.debug("uploaded-file webhook hit");
  const event = req.body as CephS3Event;

  if (event.Records == undefined) {
    res.status(404).end();
  }

  for (const record of event.Records) {
    if (record.opaqueData != env.BUCKET_NOTIFICATION_SECRET) {
      console.error("RECIEVED S3 NOTIFICATION WITHOUT OPAQUE_DATA SECRET");
      return;
    }

    const key = record.s3.object.key;

    logger.info(
      "/webhooks/internal/uploaded-file: received upload confirmation",
      {
        key,
      },
    );

    switch (true) {
      case key.startsWith("test/"):
        await prisma.testSound.update({
          where: { bucketKey: key },
          data: { uploadComplete: true, fileSize: record.s3.object.size },
        });
        break;
      case key.startsWith("preview/"):
        await prisma.previewSound.update({
          where: { bucketKey: key },
          data: { uploadComplete: true, fileSize: record.s3.object.size },
        });
        break;
      case key.startsWith("seed/"):
        await prisma.seedSound.update({
          where: { bucketKey: key },
          data: { uploadComplete: true, fileSize: record.s3.object.size },
        });
        break;
      default:
        logger.error("invalid key prefix", { key });
        res
          .status(400)
          .json({ error: "Malformed request, invalid key prefix", key: key });
        return;
    }
  }

  res.status(200).end();
};

export default handler;
