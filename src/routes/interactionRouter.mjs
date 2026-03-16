import { Router } from "express";
import { interactionHandler } from "../controllers/interactionController.mjs";

export const interactionRouter = Router();

interactionRouter.post("/", interactionHandler);
