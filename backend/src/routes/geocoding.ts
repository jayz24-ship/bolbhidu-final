import { Router } from 'express';
import { geocodeCity } from '../controllers/geocoding.js';

const router = Router();

// GET /geocoding/city?q=Mumbai
router.get('/city', geocodeCity);

export default router;
