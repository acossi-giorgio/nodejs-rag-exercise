import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });

const combinedValidator = ajv.compile({
  type: "object",
  additionalProperties: false,
  required: ["fieldname", "originalname", "mimetype", "buffer"],
  properties: {
    fieldname: { type: "string", minLength: 1 },
    originalname: { type: "string", minLength: 1 },
    mimetype: { type: "string", minLength: 1 },
    buffer: { type: "object" },
    encoding: { type: "string" },
    size: { type: "number" },
    chunkSize: { type: "string" },
    chunkOverlap: { type: "string" },
    minChunkLen: { type: "string" },
    maxSpecialRatio: { type: "string" },
  },
});

function formatErrors(errors = []) {
  return errors.map((error) => ({
    field: error.instancePath || error.params?.missingProperty || "",
    message: error.message,
    keyword: error.keyword,
  }));
}

export function validateUploadDocument(file, body) {
  const data = { ...file, ...body };
  const valid = combinedValidator(data);
  if (valid) return { valid: true };
  return { valid: false, errors: formatErrors(combinedValidator.errors) };
}
