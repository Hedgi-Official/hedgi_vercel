import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// This router is kept as a placeholder, but the FBS rate implementation has been moved
// to server/routes/fbs-rate.ts to follow the consistent pattern used by ActivTrades and Tickmill

export default router;