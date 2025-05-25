import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<{ enabled: boolean }>
) {
  // Dev‐mode stub (toggle your SKIP_PAYMENTS constant in the component)
  return res.status(200).json({ enabled: true });
}
