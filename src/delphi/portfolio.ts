import { collateralToNumber, competitionScope, delphi, getWalletAddress } from "./client.js";

export interface PositionSnapshot {
  marketId: `0x${string}`;
  outcomeIndex: number;
  shares: number;
  marketStatus: string;
  marketProbability: number | null;
  markedValueTst: number;
}

export interface PortfolioSnapshot {
  observedAtMs: number;
  wallet: `0x${string}`;
  nativeGas: bigint;
  collateralBalanceTst: number;
  markedPositionsTst: number;
  accountValueTst: number;
  positions: PositionSnapshot[];
  marketExposureTst: Record<string, number>;
}

const sharesToNumber = (shares: string | bigint | number): number => Number(BigInt(shares)) / 1e18;

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const wallet = await getWalletAddress();
  const [nativeGas, collateral, listed] = await Promise.all([
    delphi.getEthBalance(),
    delphi.getErc20BalanceWithDecimals(),
    delphi.listPositions({ wallet, redeemedOrLiquidated: false, limit: 500 }),
  ]);

  const positions = listed.positions ?? [];
  const marketIds = [...new Set(positions.map((position) => String(position.marketProxy).toLowerCase()))] as `0x${string}`[];
  const marketMap = new Map<string, Awaited<ReturnType<typeof delphi.getMarket>>>();

  await Promise.all(marketIds.map(async (marketId) => {
    try {
      const market = await delphi.getMarket({ id: marketId, pricesAndImpliedProbabilities: true, ...competitionScope });
      marketMap.set(marketId, market);
    } catch {
      // Preserve the position even when marking data is temporarily unavailable.
    }
  }));

  const normalized: PositionSnapshot[] = positions.map((position) => {
    const marketId = String(position.marketProxy).toLowerCase() as `0x${string}`;
    const outcomeIndex = Number(position.outcomeIdx);
    const shares = sharesToNumber(position.shares);
    const market = marketMap.get(marketId);
    const probability = market?.spotImpliedProbabilities?.[outcomeIndex];
    const marketProbability = typeof probability === "number" && Number.isFinite(probability) ? probability : null;
    return {
      marketId,
      outcomeIndex,
      shares,
      marketStatus: String(position.marketStatus ?? market?.status ?? "unknown"),
      marketProbability,
      markedValueTst: marketProbability === null ? 0 : shares * marketProbability,
    };
  });

  const marketExposureTst: Record<string, number> = {};
  for (const position of normalized) {
    marketExposureTst[position.marketId] = (marketExposureTst[position.marketId] ?? 0) + position.markedValueTst;
  }

  const markedPositionsTst = normalized.reduce((sum, position) => sum + position.markedValueTst, 0);
  const collateralBalanceTst = Number(collateral.balance) / 10 ** collateral.decimals;

  return {
    observedAtMs: Date.now(),
    wallet,
    nativeGas,
    collateralBalanceTst,
    markedPositionsTst,
    accountValueTst: collateralBalanceTst + markedPositionsTst,
    positions: normalized,
    marketExposureTst,
  };
}
