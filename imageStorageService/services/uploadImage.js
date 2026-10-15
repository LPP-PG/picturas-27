const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

const s3 = require("./s3Client");
const createBucket = require("./createBucket");

function checkCancellation(signal) {
  if (signal?.aborted) {
    const error = new Error("Carregamento cancelado.");
    error.name = "AbortError";
    throw error;
  }
}

async function uploadImage(
  userId,
  projectId,
  file,
  stage,
  { signal, storageFileName } = {},
) {
  if (!file || (!file.path && !Buffer.isBuffer(file.buffer))) {
    throw new Error("Não foi recebido um ficheiro válido.");
  }

  checkCancellation(signal);

  const bucketName = `user-${userId}`;
  await createBucket(bucketName);

  checkCancellation(signal);

  const contentType = file.mimetype || "application/octet-stream";
  const extension = contentType.split("/")[1] || "bin";
  const fileName = storageFileName || `${randomUUID()}.${extension}`;
  const imageKey = `${projectId}/${stage}/${fileName}`;

  const body = file.path
    ? fs.createReadStream(file.path)
    : file.buffer;

  const transfer = s3.upload(
    {
      Bucket: bucketName,
      Key: imageKey,
      Body: body,
      ContentType: contentType,
    },
    {
      queueSize: 2,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    },
  );

  const abort = () => {
    transfer.abort();
    if (file.path) body.destroy();
  };

  signal?.addEventListener("abort", abort, { once: true });

  try {
    checkCancellation(signal);

    const data = await transfer.promise();

    checkCancellation(signal);

    return {
      imageKey,
      location: data.Location,
    };
  } catch (error) {
    if (storageFileName) {
      try {
        await s3.deleteObject({
          Bucket: bucketName,
          Key: imageKey,
        }).promise();
      } catch (cleanupError) {
        console.error(
          "Erro ao limpar objeto incompleto:",
          cleanupError.message,
        );
      }
    }

    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    if (file.path) body.destroy();
  }
}

module.exports = uploadImage;