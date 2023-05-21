import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "~/env.mjs";
import { type S3Event, type S3EventRecord } from "aws-lambda";
import { prisma } from "~/server/db";

type CephEventRecord = S3EventRecord & { eventId: string; opaqueData: string };
type CephS3Event = Omit<S3Event, "Records"> & { Records: CephEventRecord[] };

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const event = req.body as CephS3Event;

  if (event.Records == undefined) {
    res.status(404).end();
  }

  for (const record of event.Records) {
    if (record.opaqueData != env.BUCKET_NOTIFICATION_SECRET) {
      console.error("RECIEVED S3 NOTIFICATION WITHOUT OPAQUE_DATA SECRET");
      return;
    }

    console.log(
      "/webhooks/internal/uploaded-file: received upload confirmation for: " +
        record.s3.object.key
    );

    await prisma.seedSound.update({
      where: { bucketKey: record.s3.object.key },
      data: { uploadComplete: true, fileSize: record.s3.object.size },
    });
  }

  res.status(200).end();
};

export default handler;
