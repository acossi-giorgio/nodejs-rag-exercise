import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });

const schemas = {
  "temperature": ajv.compile({
    type: "object",
    additionalProperties: false,
    required: ["deviceId", "value", "timestamp"],
    properties: {
      deviceId:  { type: "string", minLength: 1 },
      value:     { type: "number" },
      unit:      { type: "string" },
      timestamp: { type: "string" },
    },
  }),
  "humidity": ajv.compile({
    type: "object",
    additionalProperties: false,
    required: ["deviceId", "value", "timestamp"],
    properties: {
      deviceId:  { type: "string", minLength: 1 },
      value:     { type: "number" },
      unit:      { type: "string" },
      timestamp: { type: "string" },
    },
  }),
};

function formatErrors(errors = []) {
  return errors.map((e) => ({
    field:   e.instancePath || e.params?.missingProperty || "",
    message: e.message,
    keyword: e.keyword,
  }));
}

export function validateMqttPayload(topic, payload) {
  const validator = schemas[topic];
  if (!validator) return { valid: true };

  const valid = validator(payload);
  if (valid) return { valid: true };
  return { valid: false, errors: formatErrors(validator.errors) };
}
