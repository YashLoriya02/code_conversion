import express from "express";
import { convertCode } from "../controllers/file.controller";

const router = express.Router();

router.post("/convert-code", convertCode);

export default router;
