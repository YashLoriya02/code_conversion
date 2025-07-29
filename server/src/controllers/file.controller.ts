import { Request, Response } from "express";
import { convertReactCodeToReactNative } from "../utils/llmConversion";

export const convertCode = async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    try {
        const convertedCode = await convertReactCodeToReactNative(code);
        return res.json({ originalCode: code, convertedCode });
    } catch (err) {
        console.error("Error during conversion", err);
        return res.status(500).json({ error: "Conversion failed" });
    }
};
