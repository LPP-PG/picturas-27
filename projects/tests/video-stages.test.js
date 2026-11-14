const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { planVideoStages, videoStageRequest } = require("../utils/videoStages");

const edit = (procedure) => ({ procedure, params: {} });
const subtitles = edit("subtitles");
const extract = { procedure: "extract_frames", params: { mode: "count", count: 4, format: "png" } };

test("a run of ordinary edits uses one worker call in pipeline order", () => {
  const tools = ["brightness", "trim", "speed", "resize"].map(edit);
  assert.deepEqual(planVideoStages(tools, false), [{
    procedure: "video_edit", tools, preview: false, progressStart: 0, progressEnd: 100,
  }]);
  assert.deepEqual(planVideoStages([], true)[0].tools, []);
});

test("caption stages preserve order and preview cuts at the last temporal stage", () => {
  const stages = planVideoStages([subtitles, edit("trim"), subtitles, edit("speed"), subtitles, edit("cut")], true);
  assert.deepEqual(stages.map(({ procedure }) => procedure), [
    "video_edit", "video_subtitles", "video_edit", "video_subtitles",
    "video_edit", "video_subtitles", "video_edit",
  ]);
  assert.deepEqual(stages[0].tools, []);
  assert.deepEqual(stages.map(({ preview }) => preview), [false, false, false, false, true, false, false]);
  assert.equal(planVideoStages([subtitles], true)[0].preview, true);
});

test("extraction-only seeks the source and extraction preview spans preceding edits", () => {
  assert.deepEqual(planVideoStages([extract], false), [{
    procedure: "video_frames", extraction: extract.params, useSourceDuration: true,
    preview: false, progressStart: 0, progressEnd: 100,
  }]);
  const stages = planVideoStages([edit("trim"), subtitles, edit("speed"), extract], true);
  assert.deepEqual(stages.map(({ preview }) => preview), [false, false, false, true]);
  assert.equal(stages[2].progressEnd, 70);
  assert.equal(stages[3].progressStart, 70);
  assert.equal(stages[3].useSourceDuration, false);
  assert.throws(() => planVideoStages([extract, subtitles], false), /end of the pipeline/);
  assert.throws(() => planVideoStages([extract, extract], false), /once/);
});

test("handoff preserves the job ID, source identity and final file name", () => {
  const process = {
    msg_id: "preview-job",
    user_id: "owner",
    runner_id: "editor",
    project_id: "project",
    img_id: "video",
    og_img_uri: "images/src/clip.mov",
    new_img_uri: "images/preview/clip.mp4",
    cur_pos: 1,
    video_stages: planVideoStages([subtitles], true),
    video_stage_input: "/app/images/preview/preview-job/render-first/clip.mp4",
  };
  const request = videoStageRequest(process);
  assert.equal(request.messageId, process.msg_id);
  assert.equal(request.procedure, "video_subtitles");
  assert.deepEqual(request.parameters.progress, { user: "editor", projectId: "project", imgId: "video" });
  assert.equal(request.parameters.inputImageURI, process.video_stage_input);
  assert.equal(request.parameters.outputImageURI, path.join("images", "preview", "preview-job", "clip.mp4"));
  assert.equal(request.parameters.stageIndex, 1);
  assert.equal(request.parameters.terminal, true);
  assert.equal(request.parameters.progressPreview, true);
  assert.equal(request.parameters.preview, false);
});
