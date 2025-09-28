import { Router } from 'express';
import { ConversionController } from '../controllers/conversion.controller';

const router = Router();
const conversionController = new ConversionController();

router.post('/end-to-end', conversionController.convertComponent);
router.post('/code', conversionController.convertCode);

export default router;
