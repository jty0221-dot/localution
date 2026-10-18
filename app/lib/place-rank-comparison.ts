import type { PlaceRankResult } from './place-rank'
import { compareRankScorePair, type RankScoreComparison, type RankScoreObservation } from './rank-score-comparison'

export type RecordedRankContext = {
  keyword: string
  date: string
  conditions?: RankScoreObservation['conditions']
}

/** Validate a pair from one recorded result. Never derive a score from rank or reviews. */
export function compareRecordedPlaceCandidates(
  result: PlaceRankResult,
  context: RecordedRankContext,
  firstPlaceId: string,
  secondPlaceId: string,
): RankScoreComparison {
  const observation = (placeId: string): RankScoreObservation => {
    const item = result.competitors.find(candidate => candidate.placeId === placeId)
    const observed = !result.errors.length && result.method === 'map_api' && result.status !== 'unavailable' && !!result.checkedAt && !!item
    return {
      placeId: item?.placeId ?? null,
      label: item?.name ?? '',
      provider: 'naver-map-public-response',
      metric: 'unverified-public-score',
      origin: 'provider-unknown',
      scoreDirection: 'higher-is-better',
      keyword: context.keyword,
      date: context.date,
      rankStatus: observed ? 'measured' : 'missing',
      rank: observed ? item!.rank : null,
      // The existing collector intentionally has no verified score mapping.
      // Even a caller-filled naverScore must not become an upstream score here.
      score: null,
      conditions: context.conditions,
    }
  }
  return compareRankScorePair(observation(firstPlaceId), observation(secondPlaceId))
}
