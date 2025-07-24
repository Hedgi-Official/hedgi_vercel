import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ status: string; statusDetail?: string }>
) {
  // Dev‐mode stub
  console.log('[Dev stub] /api/payment/process', req.body);
  return res.status(200).json({
    status: 'approved',
    statusDetail: 'dev-mode stub',
  });
}
