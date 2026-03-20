import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../config/llm.mjs";
import { getMongoDb } from "../config/database.mjs";
import { env } from "../config/env.mjs";
import { getLatestReading } from "../repositories/mqttEventRepository.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildGardenAssistantPrompt } from "../prompts/gardenAssistantPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();

function formatReading(doc) {
    if (!doc) return "NA";
    const { value, unit } = doc.payload ?? {};
    const at = doc.receivedAt ?? "";
    return unit ? `${value}${unit} ${at}` : `${value}${at}`;
}

export async function runGardenAssistantPipeline(question, _sources = [], interactions = []) {
    logger.info("Garden assistant pipeline start");

    logger.info("Building interaction history");
    const history = interactions.flatMap((i) => [
        new HumanMessage(i.question ?? ""),
        new AIMessage(i.answer ?? ""),
    ]);
    
    logger.info("Fetching latest sensor readings from MongoDB");
    const db = await getMongoDb();
    const [tempDoc, humDoc] = await Promise.all([
        getLatestReading(db, env.mongo.collections.mqttTemperature),
        getLatestReading(db, env.mongo.collections.mqttHumidity),
    ]);
    const temperature = formatReading(tempDoc);
    const humidity = formatReading(humDoc);
    logger.debug("Sensor readings", { temperature, humidity });

    logger.info("Generating garden advice");
    const prompt = buildGardenAssistantPrompt();
    const input = { question, temperature, humidity, history };
    await logPrompt(prompt, input, history);
    const rawAnswer = await prompt.pipe(llm).pipe(new StringOutputParser()).invoke(input);
    logger.debug("Response", { rawAnswer });

    logger.info("Garden pipeline completed successfully");
    return {
        answer: cleanRawResponse(rawAnswer),
        sensors: { temperature, humidity },
    };
}
