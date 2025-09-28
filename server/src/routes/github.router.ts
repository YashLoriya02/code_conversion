import { Router } from 'express';
import { GitHubController } from '../controllers/github.controller'

const router = Router();
const githubController = new GitHubController();

router.post('/files', githubController.getRepoFiles);
router.post('/file-content', githubController.getFileContent);
router.post('/create-repo/:id', githubController.createRepo);

export default router;
