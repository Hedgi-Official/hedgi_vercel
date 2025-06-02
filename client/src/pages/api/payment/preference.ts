import type { NextApiRequest, NextApiResponse } from 'next';

type Pref = { id: string; public_key: string };

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Pref>
) {
  // Dev‐mode stub
  return res.status(200).json({
    id: 'DEV_PREF_ID',
    public_key: 'DEV_PUBLIC_KEY',
  });
}
