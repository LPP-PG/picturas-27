const VideoAccount = require("../models/videoAccount");
const Video = require("../models/video");
const { getVideoLimits } = require("./videoLimits");
const { get_storage_usage } = require("./imageStorage");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureAccount(userId) {
  try {
    await VideoAccount.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          reservations: [],
          revision: 0,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Outro pedido pode ter criado a mesma conta entretanto.
    if (error.code !== 11000) throw error;
  }
}

async function readUsage(userId, projectId, authorization) {
  const [storage, videos] = await Promise.all([
    get_storage_usage(userId, authorization),
    Video.find({ user_id: userId })
      .select("_id project_id")
      .lean(),
  ]);

  if (
    !Number.isSafeInteger(storage.total_bytes) ||
    storage.total_bytes < 0 ||
    !storage.groups ||
    typeof storage.groups !== "object"
  ) {
    throw httpError(
      503,
      "Não foi possível confirmar o espaço ocupado.",
    );
  }

  const groups = storage.groups;
  let accountBytes = storage.total_bytes;
  const projectGroups = new Set([String(projectId)]);

  for (const video of videos) {
    const videoGroup = groups[String(video._id)];

    // As miniaturas de vídeo não descontam da quota.
    const thumbnailBytes = videoGroup?.stages?.preview || 0;
    accountBytes -= thumbnailBytes;

    if (String(video.project_id) === String(projectId)) {
      projectGroups.add(String(video._id));
    }
  }

  let projectBytes = 0;

  for (const groupId of projectGroups) {
    const group = groups[groupId];
    if (!group) continue;

    projectBytes += group.total_bytes;

    // Nos grupos identificados pelo ID do vídeo,
    // preview contém a respetiva miniatura.
    if (groupId !== String(projectId)) {
      projectBytes -= group.stages?.preview || 0;
    }
  }

  return {
    account_bytes: Math.max(0, accountBytes),
    project_bytes: Math.max(0, projectBytes),
  };
}

async function getUploadCapacity({
  userId,
  projectId,
  userType,
  authorization,
}) {
  await ensureAccount(userId);

  const account = await VideoAccount.findById(userId).lean();
  const occupied = await readUsage(
    userId,
    projectId,
    authorization,
  );
  const limits = getVideoLimits(userType);

  const reservedAccount = account.reservations.reduce(
    (sum, item) => sum + item.bytes,
    0,
  );

  const reservedProject = account.reservations.reduce(
    (sum, item) =>
      sum +
      (String(item.project_id) === String(projectId)
        ? item.bytes
        : 0),
    0,
  );

  return {
    revision: account.revision,
    limits,
    occupied,
    reserved_account_bytes: reservedAccount,
    reserved_project_bytes: reservedProject,
    account_available_bytes: Math.max(
      0,
      limits.maxAccountBytes -
        occupied.account_bytes -
        reservedAccount,
    ),
    project_available_bytes: Math.max(
      0,
      limits.maxProjectBytes -
        occupied.project_bytes -
        reservedProject,
    ),
  };
}

async function reserveUpload({
  userId,
  projectId,
  uploadId,
  bytes,
  userType,
  authorization,
}) {
  const limits = getVideoLimits(userType);

  if (
    !Number.isSafeInteger(bytes) ||
    bytes <= 0 ||
    bytes > limits.maxSizeBytes
  ) {
    throw httpError(
      400,
      "O tamanho do ficheiro não respeita os limites do perfil.",
    );
  }

  await ensureAccount(userId);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const existing = await VideoAccount.findOne({
      _id: userId,
      "reservations.upload_id": uploadId,
    }).lean();

    if (existing) {
      const reservation = existing.reservations.find(
        (item) => String(item.upload_id) === String(uploadId),
      );

      if (
        String(reservation.project_id) !== String(projectId) ||
        reservation.bytes !== bytes
      ) {
        throw httpError(409, "A reserva não corresponde ao ficheiro.");
      }

      return;
    }

    const capacity = await getUploadCapacity({
      userId,
      projectId,
      userType,
      authorization,
    });

    if (bytes > capacity.account_available_bytes) {
      throw httpError(409, "Espaço insuficiente na conta.");
    }

    if (bytes > capacity.project_available_bytes) {
      throw httpError(409, "Espaço insuficiente no projeto.");
    }

    const result = await VideoAccount.updateOne(
      {
        _id: userId,
        revision: capacity.revision,
        "reservations.upload_id": { $ne: uploadId },
      },
      {
        $push: {
          reservations: {
            upload_id: uploadId,
            project_id: projectId,
            bytes,
            active: false,
          },
        },
        $inc: { revision: 1 },
      },
    );

    if (result.modifiedCount === 1) return;
  }

  throw httpError(
    409,
    "O armazenamento está a ser atualizado. Tente novamente.",
  );
}

async function acquireUploadSlot(userId, uploadId, userType) {
  const limits = getVideoLimits(userType);

  const result = await VideoAccount.updateOne(
    {
      _id: userId,
      reservations: {
        $elemMatch: {
          upload_id: uploadId,
          active: false,
        },
      },
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$reservations",
                as: "reservation",
                cond: { $eq: ["$$reservation.active", true] },
              },
            },
          },
          limits.maxConcurrentUploads,
        ],
      },
    },
    {
      $set: { "reservations.$.active": true },
      $inc: { revision: 1 },
    },
  );

  return result.modifiedCount === 1;
}
async function releaseUploadReservation(userId, uploadId) {
  await VideoAccount.updateOne(
    {
      _id: userId,
      "reservations.upload_id": uploadId,
    },
    {
      $pull: {
        reservations: { upload_id: uploadId },
      },
      $inc: { revision: 1 },
    },
  );
}

module.exports = {
  getUploadCapacity,
  reserveUpload,
  acquireUploadSlot,
  releaseUploadReservation,
};