import { Router } from "express";
import { startSessionHandler } from "../controllers/sessionController.mjs";

export const sessionRouter = Router();

sessionRouter.post("/", startSessionHandler);
