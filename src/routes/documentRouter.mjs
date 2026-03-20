import { Router } from "express";
import multer from "multer";
import { uploadDocumentHandler, deleteDocumentHandler } from "../controllers/documentController.mjs";

export const documentRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

documentRouter.post("/", upload.single("file"), uploadDocumentHandler);
documentRouter.delete("/:name", deleteDocumentHandler);
