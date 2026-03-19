import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });

const interactionRequestValidator = ajv.compile({
    type: "object",
    additionalProperties: false,
    required: ["question", "type"],
    properties: {
        sessionId: { type: "string" },
        question: { type: "string" },
        type: { type: "string" }
    }
});

export function validateInteractionRequest(data) {
  const valid = interactionRequestValidator(data);
  if (valid) return { valid: true };
  return {
    valid: false,
      errors: interactionRequestValidator.errors?.map(e => ({
      field: e.instancePath || e.params.missingProperty || "",
      message: e.message,
      keyword: e.keyword
    })) || []
  };
}