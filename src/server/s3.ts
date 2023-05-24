import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "~/env.mjs";

// Create S3 client
export const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: env.BUCKET_HOST,
  region: "dummy", // needs to be any non empty string to satisfy s3. We dont actually care what this is
  forcePathStyle: true, // causes bucket name to be in path instead of subdomain
});

export function getPublicUrl(bucketKey: string) {
  return `${env.BUCKET_HOST}/${env.BUCKET_NAME}/${bucketKey}`;
}

export async function testUploadGetDelete() {
  const key = "test-file";
  // Upload the file
  const putObjectCommand = new PutObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
    Body: "test content",
  });

  try {
    const response = await s3Client.send(putObjectCommand);
    console.log("File uploaded successfully:", response);
  } catch (error) {
    console.error("Error uploading file:", error);
  }

  const getObjectCommand = new GetObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(getObjectCommand);
    const data = await response.Body?.transformToString();
    console.log("Fetched file content:", data);
  } catch (error) {
    console.error("Error getting file content:", error);
  }

  const deleteObjectCommand = new DeleteObjectCommand({
    Bucket: env.BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(deleteObjectCommand);
    console.log("File deleted successfully:", response);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}
