import express from 'express';
import passport from 'passport';
import { githubLogin, githubCallback, getProfile } from '../controllers/auth.controller';

const router = express.Router();

router.use(passport.initialize());
router.use(passport.session());

router.get('/github', githubLogin);
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), githubCallback);
router.get('/profile/:id', getProfile);

export default router;
