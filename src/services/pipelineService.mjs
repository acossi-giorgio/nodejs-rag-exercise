import { runRagPipeline } from "../pipelines/ragPipeline.mjs";
import { runRagWithRephrasingPipeline } from "../pipelines/ragWithRephrasingPipeline.mjs";
import { runChatPipeline } from "../pipelines/chatPipeline.mjs";
import { runGardenPipeline } from "../pipelines/gardenPipeline.mjs";

export function getPipeline(type) {
    const pipelineRegistry = {
        "rag": runRagPipeline,
        "rag-rephrasing": runRagWithRephrasingPipeline,
        "chat": runChatPipeline,
        "garden-assistant": runGardenPipeline,
    };
    return pipelineRegistry[type];
}
