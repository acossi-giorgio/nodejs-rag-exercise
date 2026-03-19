import { runRagPipeline } from "../pipelines/ragPipeline.mjs";
import { runChatPipeline } from "../pipelines/chatPipeline.mjs";
import { runGardenPipeline } from "../pipelines/gardenPipeline.mjs";

export function getPipeline(type) {
    const pipelineRegistry = {
        rag: runRagPipeline,
        chat: runChatPipeline,
        garden: runGardenPipeline,
    };
    return pipelineRegistry[type];
}
