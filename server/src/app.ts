import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import fileRoutes from "./routes/file.router";
import githubRoutes from "./routes/github.router";
import projectRoutes from "./routes/project.router";
import conversionRoutes from "./routes/conversion.router";

dotenv.config();

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", fileRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/conversion', conversionRoutes);

export default app;
