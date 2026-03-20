import { runRagPipeline } from "../pipelines/ragPipeline.mjs";
import { runRagWithRephrasingPipeline } from "../pipelines/ragWithRephrasingPipeline.mjs";
import { runChatPipeline } from "../pipelines/chatPipeline.mjs";
import { runGardenAssistantPipeline } from "../pipelines/gardenAssistantPipeline.mjs";

export function getPipeline(type) {
    const pipelineRegistry = {
        "rag": runRagPipeline,
        "rag-rephrasing": runRagWithRephrasingPipeline,
        "chat": runChatPipeline,
        "garden-assistant": runGardenAssistantPipeline,
    };
    return pipelineRegistry[type];
}
