const path = require("path");

// Keep adjacent edits in a single FFmpeg pass. A subtitle stage consumes the
// exact timeline produced so far; frame extraction is always terminal.
function planVideoStages(tools, preview) {
  const extraction = tools.find((tool) => tool.procedure === "extract_frames");
  if (extraction && (tools.at(-1) !== extraction ||
      tools.filter((tool) => tool.procedure === "extract_frames").length !== 1)) {
    throw new Error("Frame extraction must appear once, at the end of the pipeline");
  }

  const stages = [];
  let edits = [];
  function addEdits() {
    stages.push({ procedure: "video_edit", tools: edits, preview: false });
    edits = [];
  }

  for (const tool of tools) {
    if (tool === extraction) break;
    if (tool.procedure === "subtitles") {
      // Normalize the initial input even when the subtitle stage has no audio.
      if (edits.length || !stages.length) addEdits();
      stages.push({ procedure: "video_subtitles", preview: false });
    } else {
      edits.push(tool);
    }
  }
  if (edits.length || (!extraction && !stages.length)) addEdits();

  if (preview && !extraction) {
    let previewStage = 0;
    stages.forEach((stage, index) => {
      if (stage.tools?.some((tool) => ["trim", "speed"].includes(tool.procedure))) previewStage = index;
    });
    stages[previewStage].preview = true;
  }

  const editProgress = extraction && stages.length ? 70 : 100;
  const planned = stages.map((stage, index) => ({
    ...stage,
    progressStart: index * editProgress / stages.length,
    progressEnd: (index + 1) * editProgress / stages.length,
  }));
  if (extraction) {
    planned.push({
      procedure: "video_frames",
      extraction: extraction.params ?? {},
      useSourceDuration: !stages.length,
      preview,
      progressStart: stages.length ? 70 : 0,
      progressEnd: 100,
    });
  }
  return planned;
}

function videoWorkDir(process) {
  return path.join(path.dirname(process.new_img_uri), process.msg_id);
}

function videoStageRequest(process) {
  const { procedure, ...stage } = process.video_stages[process.cur_pos];
  const preview = process.msg_id.startsWith("preview-");
  return {
    messageId: process.msg_id,
    timestamp: new Date().toISOString(),
    procedure,
    parameters: {
      ...stage,
      stageIndex: process.cur_pos,
      inputImageURI: process.video_stage_input || process.og_img_uri,
      outputImageURI: path.join(videoWorkDir(process), path.basename(process.new_img_uri)),
      terminal: process.cur_pos === process.video_stages.length - 1,
      progressPreview: preview,
      progress: {
        user: String(process.runner_id || process.user_id),
        projectId: String(process.project_id),
        imgId: String(process.img_id),
      },
    },
  };
}

module.exports = { planVideoStages, videoStageRequest, videoWorkDir };
