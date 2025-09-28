import passport from 'passport';
import dotenv from "dotenv";
import { Strategy as GitHubStrategy } from 'passport-github2';
import { findOrCreateUser } from '../services/auth.service';
import User from '../models/auth.model';
import { Request, Response } from 'express';

dotenv.config()

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackURL: '/api/auth/github/callback',
}, async (accessToken: string, __: string, profile: any, done: any) => {
    try {
        const user = await findOrCreateUser(profile, accessToken);
        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user: any, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export const githubLogin = passport.authenticate('github', { scope: ['public_repo'] });

export const githubCallback = (req: Request, res: Response) => {
    if (!req.user) {
        console.error('req.user is undefined - check session/deserializeUser');
        return res.status(401).json({ message: 'Authentication failed' });
    }

    res.redirect(`http://localhost:3000/github-repo-explorer?id=${((req.user as any)._id as string)}`);
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params

        const user = await User.findById(id);
        if (!user) {
            return res.status(401).json({ message: "User not found" })
        }

        res.status(200).json(user);
    } catch (error) {

    }
};
