const mongoose = require("mongoose");

const Project = require("../models/project");
const Video = require("../models/video");
const VideoUpload = require("../models/videoUpload");
const { delete_image } = require("./imageStorage");

const deletionSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    last_error: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const Deletion =
  mongoose.models.VideoProjectDeletion ||
  mongoose.model("VideoProjectDeletion", deletionSchema);

async function prepareVideoProjectDeletion(userId, projectId) {
  await Deletion.updateOne(
    { _id: projectId },
    {
      $setOnInsert: {
        user_id: userId,
        last_error: "",
      },
    },
    { upsert: true },
  );
}

async function deleteStoredFile(userId, videoId, stage, key) {
  if (!key) return;

  try {
    await delete_image(
      String(userId),
      String(videoId),
      stage,
      key.split("/").pop(),
      { timeout: 30000 },
    );
  } catch (error) {
    if (error.response?.status !== 404) throw error;
  }
}

let working = false;

async function processVideoProjectDeletions() {
  if (working || mongoose.connection.readyState !== 1) return;
  working = true;

  try {
    const jobs = await Deletion.find().limit(20);

    for (const job of jobs) {
      try {
        // Preparar a tarefa não autoriza apagar conteúdo.
        // Só limpar depois de o projeto ter sido eliminado.
        const projectStillExists = await Project.exists({
          _id: job._id,
        });

        if (projectStillExists) continue;

        // A recuperação de uploads cancela os workers ativos
        // e trata os temporários e respetivas reservas.
        await VideoUpload.updateMany(
          {
            user_id: job.user_id,
            project_id: job._id,
            state: {
              $in: [
                "waiting",
                "uploading",
                "validating",
                "thumbnail",
              ],
            },
          },
          {
            $set: {
              cancel_requested: true,
              cleanup_pending: true,
            },
          },
        );

        const pending = await VideoUpload.exists({
          user_id: job.user_id,
          project_id: job._id,
          $or: [
            { cleanup_pending: true },
            {
              state: {
                $in: [
                  "waiting",
                  "uploading",
                  "validating",
                  "thumbnail",
                ],
              },
            },
          ],
        });

        // Não apagar ficheiros enquanto um worker pode
        // ainda estar a escrever nesse projeto.
        if (pending) continue;

        const videos = await Video.find({
          user_id: job.user_id,
          project_id: job._id,
        });

        for (const video of videos) {
          await deleteStoredFile(
            job.user_id,
            video._id,
            "src",
            video.storage_key,
          );

          await deleteStoredFile(
            job.user_id,
            video._id,
            "preview",
            video.thumbnail_key,
          );

          await Video.deleteOne({
            _id: video._id,
            user_id: job.user_id,
            project_id: job._id,
          });
        }

        // Limpar também os nomes conhecidos das tentativas,
        // mesmo que o respetivo registo Video já não exista.
        const uploads = await VideoUpload.find({
          user_id: job.user_id,
          project_id: job._id,
        })
          .select("video_id stored_files")
          .lean();

        for (const upload of uploads) {
          for (const file of upload.stored_files || []) {
            await deleteStoredFile(
              job.user_id,
              upload.video_id,
              file.stage,
              file.file_name,
            );
          }
        }

        await Deletion.deleteOne({ _id: job._id });
      } catch (error) {
        console.error(
          "Limpeza de projeto de vídeo pendente:",
          String(job._id),
          error.message,
        );

        await Deletion.updateOne(
          { _id: job._id },
          { $set: { last_error: error.message } },
        ).catch(() => {});
      }
    }
  } catch (error) {
    console.error(
      "Erro ao recuperar eliminações de vídeo:",
      error.message,
    );
  } finally {
    working = false;
  }
}

const timer = setInterval(
  () => void processVideoProjectDeletions(),
  15000,
);

timer.unref();

module.exports = {
  prepareVideoProjectDeletion,
  processVideoProjectDeletions,
};