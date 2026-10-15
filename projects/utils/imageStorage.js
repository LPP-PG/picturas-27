const axios = require("axios");
const fs = require("node:fs");
const https = require("node:https");

const key = fs.readFileSync(__dirname + "/../certs/selfsigned.key");
const cert = fs.readFileSync(__dirname + "/../certs/selfsigned.crt");

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert,
  key,
});

const img_storage_ms = "http://img_storage:11000";

async function get_image_internal_url(user, project, type, img) {
  return axios.get(
    `${img_storage_ms}/image/internal/${user}/${project}/${type}/${img}`,
  );
}

async function get_image_public_url(user, project, type, img) {
  return axios.get(
    `${img_storage_ms}/image/public/${user}/${project}/${type}/${img}`,
  );
}

async function post_image(user, project, type, file, options = {}) {
  return axios.post(
    `${img_storage_ms}/upload/${user}/${project}/${type}`,
    file,
    {
      ...options,
      headers: {
        ...(typeof file.getHeaders === "function"
          ? file.getHeaders()
          : {}),
        ...(options.headers || {}),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  );
}

async function delete_image(user, project, type, img, options = {}) {
  return axios.delete(
    `${img_storage_ms}/delete/${user}/${project}/${type}/${img}`,
    options,
  );
}

async function copy_image(
  userId,
  projectId,
  fromStage,
  toStage,
  fileName,
) {
  return axios.post(
    `${img_storage_ms}/copy/${userId}/${projectId}/${fromStage}/${toStage}/${fileName}`,
    {},
  );
}

async function get_storage_usage(userId, authorization) {
  const response = await axios.get(
    `${img_storage_ms}/usage/${userId}`,
    {
      headers: {
        Authorization: authorization,
      },
      timeout: 30000,
    },
  );

  return response.data;
}

module.exports = {
  get_image_internal_url,
  get_image_public_url,
  post_image,
  delete_image,
  copy_image,
  get_storage_usage,
};