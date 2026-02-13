import { Router } from 'express';
import {
  generateToken,
  validateToken,
  logViolation,
  checkAccess,
  generateWatermark,
  getSecurityStatus,
  revokeAllTokens,
} from '../controllers/security.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Session token management
router.post('/generate-token', authenticate, generateToken);
router.post('/validate-token', authenticate, validateToken);

// Violation tracking and escalation
router.post('/log-violation', authenticate, logViolation);

// Security status and permissions
router.get('/check-access', authenticate, checkAccess);
router.get('/status', authenticate, getSecurityStatus);

// Content protection (watermarking)
router.post('/watermark', authenticate, generateWatermark);

// Session management
router.post('/revoke-tokens', authenticate, revokeAllTokens);

export default router;
