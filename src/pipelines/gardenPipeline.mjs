import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../config/llm.mjs";
import { getMongoDb } from "../config/database.mjs";
import { env } from "../config/env.mjs";
import { getLatestReading } from "../repositories/mqttEventRepository.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildGardenPrompt } from "../prompts/gardenPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();

function formatReading(doc) {
    if (!doc) return "N/A (no data available)";
    const { value, unit } = doc.payload ?? {};
    const at = doc.receivedAt ? new Date(doc.receivedAt).toISOString() : "unknown time";
    return unit ? `${value} ${unit} (sampled at ${at})` : `${value} (sampled at ${at})`;
}

export async function runGardenPipeline(question, _sources = [], interactions = []) {
    logger.info("Garden pipeline start");

    const pipeline = RunnableSequence.from([
        RunnableLambda.from(async (context) => {
            logger.info("Building interaction history");
            const history = (context.interactions ?? []).flatMap((i) => [
                new HumanMessage(i.question ?? ""),
                new AIMessage(i.answer ?? ""),
            ]);
            return { ...context, history };
        }),
        RunnableLambda.from(async (context) => {
            logger.info("Fetching latest sensor readings from MongoDB");
            const db = await getMongoDb();
            const [tempDoc, humDoc] = await Promise.all([
                getLatestReading(db, env.mongo.collections.mqttTemperature),
                getLatestReading(db, env.mongo.collections.mqttHumidity),
            ]);
            const temperature = formatReading(tempDoc);
            const humidity = formatReading(humDoc);
            logger.debug("[Garden] Sensor readings", { temperature, humidity });
            return { ...context, temperature, humidity };
        }),
        RunnableLambda.from(async (context) => {
            logger.info("Generating garden advice");
            const prompt = buildGardenPrompt();
            const input = {
                question: context.question,
                temperature: context.temperature,
                humidity: context.humidity,
                history: context.history ?? [],
            };
            await logPrompt(prompt, input, context.history);
            const chain = prompt.pipe(llm).pipe(new StringOutputParser());
            const rawAnswer = await chain.invoke(input);
            logger.debug("Response", { rawAnswer });
            return { ...context, answer: cleanRawResponse(rawAnswer) };
        }),
    ]);

    const result = await pipeline.invoke({ question, interactions });
    logger.info("Garden pipeline completed successfully");
    return {
        answer: result.answer,
        sensors: {
            temperature: result.temperature,
            humidity: result.humidity,
        },
    };
}
