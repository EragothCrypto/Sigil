import { Router, type IRouter } from 'express';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import { createSolanaRpc } from '../../monitoring/chains/solana/rpc.js';
import { evaluateSolanaWallet, validSolanaAddress, TOKEN_2022_PROGRAM, type ProgramRead, type SolanaCluster } from '../../monitoring/chains/solana/wallet-state.js';

export async function scanSolanaWallet(wallet: string, cluster: SolanaCluster, signal?: AbortSignal) {
  const rpc = createSolanaRpc(cluster, signal);
  try { await rpc.verifyCluster(); }
  catch { return evaluateSolanaWallet(wallet, cluster, {legacy: {reason: 'solana_cluster_unavailable'}, token2022: {reason: 'solana_cluster_unavailable'}}); }
  const read = async (program: string): Promise<ProgramRead> => {
    try { return await rpc.readAccounts(wallet, program); }
    catch { return {reason: 'solana_rpc_unavailable'}; }
  };
  const [legacy, token2022] = await Promise.all([read(TOKEN_PROGRAM_ADDRESS), read(TOKEN_2022_PROGRAM)]);
  return evaluateSolanaWallet(wallet, cluster, {legacy, token2022});
}
const router: IRouter = Router();
router.post('/monitor/v2/solana/scan', async (req, res) => {
  const body = req.body as unknown;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {res.status(400).json({error: 'invalid_solana_input', message: 'Enter a Solana wallet address and supported cluster.'}); return;}
  const {wallet, cluster} = body as Record<string, unknown>;
  if (!validSolanaAddress(wallet) || (cluster !== 'devnet' && cluster !== 'mainnet-beta')) {res.status(400).json({error: 'invalid_solana_input', message: 'Enter a complete Solana wallet address and supported cluster.'}); return;}
  const controller = new AbortController();
  const aborted = () => controller.abort();
  const closed = () => {if (!res.writableEnded) controller.abort();};
  req.on('aborted', aborted); res.on('close', closed);
  try {
    if (req.aborted || res.destroyed) controller.abort();
    const report = await scanSolanaWallet(wallet, cluster, controller.signal);
    if (!controller.signal.aborted) res.set('Cache-Control', 'no-store').json(report);
  } finally {req.off('aborted', aborted); res.off('close', closed);}
});
export default router;
