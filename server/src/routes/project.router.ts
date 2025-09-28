import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';

const router = Router();
const projectController = new ProjectController();

router.post('/analyze', projectController.analyzeProject);
// router.get('/component/:componentName/:projectPath', projectController.getComponentDetails);

export default router;
