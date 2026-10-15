const express = require("express");

const uploadRoutes = require("./route/upload");
const imageRoutes = require("./route/images");
const deleteRoutes = require("./route/delete");
const copyRoutes = require("./route/copy");
const usageRoutes = require("./route/usage");

const app = express();

app.use("/upload", uploadRoutes);
app.use("/image", imageRoutes);
app.use("/delete", deleteRoutes);
app.use("/copy", copyRoutes);
app.use("/usage", usageRoutes);

const PORT = process.env.PORT || 11000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});