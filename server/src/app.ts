import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import githubRoutes from "./routes/github.router";
import projectRoutes from "./routes/project.router";
import authRoutes from "./routes/auth.router";
import conversionRoutes from "./routes/conversion.router";
import session from 'express-session';
import passport from 'passport';
import mongoose from 'mongoose';

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/code-conversion';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/github', githubRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/auth', authRoutes);

export default app;
