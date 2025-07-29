import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.router";
import githubRoutes from "./routes/github.router";

dotenv.config();

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", fileRoutes);
app.use('/api/github', githubRoutes);

export default app;
