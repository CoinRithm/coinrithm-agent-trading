""" Contains all the data models used in inputs/outputs """

from .agent_audit_stats import AgentAuditStats
from .agent_decision_artifact import AgentDecisionArtifact
from .agent_decision_artifact_opportunity_kind import AgentDecisionArtifactOpportunityKind
from .agent_evaluation_stats import AgentEvaluationStats
from .agent_execution_assumptions import AgentExecutionAssumptions
from .agent_execution_assumptions_cost_model import AgentExecutionAssumptionsCostModel
from .agent_execution_assumptions_execution_timing import AgentExecutionAssumptionsExecutionTiming
from .agent_forecast_skill import AgentForecastSkill
from .agent_forecast_skill_basis import AgentForecastSkillBasis
from .agent_forecast_skill_cohorts_type_0 import AgentForecastSkillCohortsType0
from .agent_forecast_skill_schema import AgentForecastSkillSchema
from .agent_forecast_skill_state import AgentForecastSkillState
from .agent_ledger_retention_policy import AgentLedgerRetentionPolicy
from .agent_observation import AgentObservation
from .agent_observation_dataset import AgentObservationDataset
from .agent_observation_inputs import AgentObservationInputs
from .agent_portfolio import AgentPortfolio
from .agent_portfolio_equity import AgentPortfolioEquity
from .agent_portfolio_open_orders_item import AgentPortfolioOpenOrdersItem
from .agent_portfolio_pnl import AgentPortfolioPnl
from .agent_portfolio_progression_type_0 import AgentPortfolioProgressionType0
from .agent_run_count import AgentRunCount
from .agent_run_evidence_checklist import AgentRunEvidenceChecklist
from .agent_run_evidence_checklist_items_item import AgentRunEvidenceChecklistItemsItem
from .agent_run_evidence_checklist_items_item_status import AgentRunEvidenceChecklistItemsItemStatus
from .agent_run_evidence_checklist_overall_status import AgentRunEvidenceChecklistOverallStatus
from .agent_run_evidence_manifest import AgentRunEvidenceManifest
from .agent_run_evidence_manifest_summary import AgentRunEvidenceManifestSummary
from .agent_run_evidence_manifest_summary_related_entities_item import AgentRunEvidenceManifestSummaryRelatedEntitiesItem
from .agent_run_outcome_summary import AgentRunOutcomeSummary
from .agent_run_outcome_summary_by_venue import AgentRunOutcomeSummaryByVenue
from .agent_run_outcome_summary_by_venue_futures import AgentRunOutcomeSummaryByVenueFutures
from .agent_run_outcome_summary_by_venue_pm import AgentRunOutcomeSummaryByVenuePm
from .agent_run_outcome_summary_by_venue_spot import AgentRunOutcomeSummaryByVenueSpot
from .agent_run_outcome_summary_coverage import AgentRunOutcomeSummaryCoverage
from .agent_scorecard_response import AgentScorecardResponse
from .agent_scorecard_response_calibration_basis import AgentScorecardResponseCalibrationBasis
from .agent_trace_metadata import AgentTraceMetadata
from .agent_venue_perf import AgentVenuePerf
from .arena_agent import ArenaAgent
from .arena_agent_badges_item import ArenaAgentBadgesItem
from .arena_agent_by_venue import ArenaAgentByVenue
from .arena_agent_source import ArenaAgentSource
from .arena_decision import ArenaDecision
from .arena_decision_opportunity_kind import ArenaDecisionOpportunityKind
from .arena_decision_result import ArenaDecisionResult
from .arena_opportunity import ArenaOpportunity
from .arena_opportunity_opportunity_kind import ArenaOpportunityOpportunityKind
from .cancel_spot_order_response_200 import CancelSpotOrderResponse200
from .competition_board_row import CompetitionBoardRow
from .competition_board_row_by_venue import CompetitionBoardRowByVenue
from .competition_meta import CompetitionMeta
from .competition_meta_status import CompetitionMetaStatus
from .competition_meta_visibility import CompetitionMetaVisibility
from .decision_provenance import DecisionProvenance
from .decision_provenance_evidence_ref_type_0 import DecisionProvenanceEvidenceRefType0
from .decision_provenance_report import DecisionProvenanceReport
from .decision_provenance_report_evidence_ref import DecisionProvenanceReportEvidenceRef
from .decision_provenance_report_runtime_kind import DecisionProvenanceReportRuntimeKind
from .decision_provenance_report_skill_versions import DecisionProvenanceReportSkillVersions
from .decision_provenance_runtime_kind_type_1 import DecisionProvenanceRuntimeKindType1
from .decision_provenance_runtime_kind_type_2_type_1 import DecisionProvenanceRuntimeKindType2Type1
from .decision_provenance_runtime_kind_type_3_type_1 import DecisionProvenanceRuntimeKindType3Type1
from .decision_provenance_skill_versions_type_0 import DecisionProvenanceSkillVersionsType0
from .decision_support import DecisionSupport
from .decision_support_flags import DecisionSupportFlags
from .decision_support_liquidity_tier import DecisionSupportLiquidityTier
from .decision_support_quality_tier import DecisionSupportQualityTier
from .decision_support_spread_tier import DecisionSupportSpreadTier
from .decision_support_volume_tier import DecisionSupportVolumeTier
from .discover_prediction_markets_sort import DiscoverPredictionMarketsSort
from .discover_prediction_markets_source import DiscoverPredictionMarketsSource
from .entry_context import EntryContext
from .error import Error
from .execution_model import ExecutionModel
from .forecast_skill_metrics import ForecastSkillMetrics
from .freshness import Freshness
from .freshness_basis import FreshnessBasis
from .freshness_status_type_1 import FreshnessStatusType1
from .freshness_status_type_2_type_1 import FreshnessStatusType2Type1
from .freshness_status_type_3_type_1 import FreshnessStatusType3Type1
from .futures_close_request import FuturesCloseRequest
from .futures_open_request import FuturesOpenRequest
from .futures_open_request_side import FuturesOpenRequestSide
from .futures_position import FuturesPosition
from .futures_position_coin import FuturesPositionCoin
from .futures_position_envelope import FuturesPositionEnvelope
from .futures_position_side import FuturesPositionSide
from .futures_position_status import FuturesPositionStatus
from .futures_quote_request import FuturesQuoteRequest
from .futures_quote_request_side import FuturesQuoteRequestSide
from .futures_quote_response import FuturesQuoteResponse
from .futures_quote_response_coin import FuturesQuoteResponseCoin
from .get_agent_news_response_200 import GetAgentNewsResponse200
from .get_agent_news_response_200_items_item import GetAgentNewsResponse200ItemsItem
from .get_arena_agent_response_200 import GetArenaAgentResponse200
from .get_arena_decisions_format import GetArenaDecisionsFormat
from .get_arena_decisions_response_200 import GetArenaDecisionsResponse200
from .get_arena_decisions_response_200_pagination import GetArenaDecisionsResponse200Pagination
from .get_arena_leaderboard_response_200 import GetArenaLeaderboardResponse200
from .get_arena_leaderboard_response_200_source import GetArenaLeaderboardResponse200Source
from .get_arena_leaderboard_response_200_window import GetArenaLeaderboardResponse200Window
from .get_arena_leaderboard_window import GetArenaLeaderboardWindow
from .get_candles_range import GetCandlesRange
from .get_candles_response_200 import GetCandlesResponse200
from .get_candles_response_200_candles_item import GetCandlesResponse200CandlesItem
from .get_candles_response_200_coin import GetCandlesResponse200Coin
from .get_candles_response_200_range import GetCandlesResponse200Range
from .get_competition_board_response_200 import GetCompetitionBoardResponse200
from .get_equity_curve_granularity import GetEquityCurveGranularity
from .get_equity_curve_response_200 import GetEquityCurveResponse200
from .get_equity_curve_response_200_granularity import GetEquityCurveResponse200Granularity
from .get_equity_curve_response_200_points_item import GetEquityCurveResponse200PointsItem
from .get_equity_curve_response_200_points_item_venue import GetEquityCurveResponse200PointsItemVenue
from .get_equity_curve_response_200_window import GetEquityCurveResponse200Window
from .get_futures_positions_response_200 import GetFuturesPositionsResponse200
from .get_market_context_response_200 import GetMarketContextResponse200
from .get_market_context_response_200_coin import GetMarketContextResponse200Coin
from .get_market_context_response_200_fear_greed_type_0 import GetMarketContextResponse200FearGreedType0
from .get_market_context_response_200_price_type_0 import GetMarketContextResponse200PriceType0
from .get_market_context_response_200_related_markets_item import GetMarketContextResponse200RelatedMarketsItem
from .get_market_context_response_200_sentiment import GetMarketContextResponse200Sentiment
from .get_market_context_response_200_similar_coins_item import GetMarketContextResponse200SimilarCoinsItem
from .get_my_trades_response_200 import GetMyTradesResponse200
from .get_my_trades_response_200_trades_item import GetMyTradesResponse200TradesItem
from .get_my_trades_response_200_trades_item_detail import GetMyTradesResponse200TradesItemDetail
from .get_my_trades_response_200_trades_item_venue import GetMyTradesResponse200TradesItemVenue
from .get_my_trades_venue import GetMyTradesVenue
from .get_performance_response_200 import GetPerformanceResponse200
from .get_performance_response_200_by_venue import GetPerformanceResponse200ByVenue
from .list_competitions_response_200 import ListCompetitionsResponse200
from .list_open_orders_response_200 import ListOpenOrdersResponse200
from .open_futures_position_response_422 import OpenFuturesPositionResponse422
from .open_order import OpenOrder
from .open_order_order_type import OpenOrderOrderType
from .open_order_side import OpenOrderSide
from .open_pm_position_response_422 import OpenPmPositionResponse422
from .opportunity_cohort_context import OpportunityCohortContext
from .opportunity_cohort_context_kind import OpportunityCohortContextKind
from .place_spot_order_response_400 import PlaceSpotOrderResponse400
from .place_spot_order_response_404 import PlaceSpotOrderResponse404
from .pm_discovery_market import PmDiscoveryMarket
from .pm_discovery_market_source import PmDiscoveryMarketSource
from .pm_discovery_outcome import PmDiscoveryOutcome
from .pm_discovery_quote_hint import PmDiscoveryQuoteHint
from .pm_discovery_quote_hint_source import PmDiscoveryQuoteHintSource
from .pm_discovery_response import PmDiscoveryResponse
from .pm_discovery_response_meta import PmDiscoveryResponseMeta
from .pm_discovery_response_meta_source import PmDiscoveryResponseMetaSource
from .pm_discovery_response_meta_source_health_item import PmDiscoveryResponseMetaSourceHealthItem
from .pm_discovery_response_meta_source_health_item_status import PmDiscoveryResponseMetaSourceHealthItemStatus
from .pm_discovery_response_meta_sources_item import PmDiscoveryResponseMetaSourcesItem
from .pm_discovery_response_pagination import PmDiscoveryResponsePagination
from .pm_open_request import PmOpenRequest
from .pm_open_request_side import PmOpenRequestSide
from .pm_opportunity_request import PmOpportunityRequest
from .pm_opportunity_request_cohort import PmOpportunityRequestCohort
from .pm_opportunity_request_kind import PmOpportunityRequestKind
from .pm_opportunity_response import PmOpportunityResponse
from .pm_opportunity_response_opportunity_kind import PmOpportunityResponseOpportunityKind
from .pm_opportunity_response_result import PmOpportunityResponseResult
from .pm_quality import PmQuality
from .pm_quote_request import PmQuoteRequest
from .pm_quote_request_side import PmQuoteRequestSide
from .pm_quote_response import PmQuoteResponse
from .pm_quote_response_eligibility import PmQuoteResponseEligibility
from .pm_quote_response_event import PmQuoteResponseEvent
from .pm_quote_response_frozen_entry_snapshot import PmQuoteResponseFrozenEntrySnapshot
from .pm_quote_response_side import PmQuoteResponseSide
from .public_pm_event import PublicPmEvent
from .public_pm_event_cross_platform_item import PublicPmEventCrossPlatformItem
from .public_pm_event_decision_support_type_0 import PublicPmEventDecisionSupportType0
from .public_pm_event_detail_response import PublicPmEventDetailResponse
from .public_pm_event_detail_response_cross_source_matches_item import PublicPmEventDetailResponseCrossSourceMatchesItem
from .public_pm_event_detail_response_related_news_item import PublicPmEventDetailResponseRelatedNewsItem
from .public_pm_event_detail_response_resolution_type_0 import PublicPmEventDetailResponseResolutionType0
from .public_pm_event_detail_response_snapshots_item import PublicPmEventDetailResponseSnapshotsItem
from .public_pm_event_detail_response_volume_history_item import PublicPmEventDetailResponseVolumeHistoryItem
from .public_pm_event_freshness import PublicPmEventFreshness
from .public_pm_event_quality_type_0 import PublicPmEventQualityType0
from .public_pm_event_reference_probability_type_0 import PublicPmEventReferenceProbabilityType0
from .public_pm_events_response import PublicPmEventsResponse
from .public_pm_events_response_meta import PublicPmEventsResponseMeta
from .public_pm_events_response_pagination import PublicPmEventsResponsePagination
from .public_pm_outcome import PublicPmOutcome
from .public_pm_overview_response import PublicPmOverviewResponse
from .public_pm_overview_response_by_category_item import PublicPmOverviewResponseByCategoryItem
from .public_pm_overview_response_by_source_item import PublicPmOverviewResponseBySourceItem
from .public_pm_overview_response_categories_item_type_1 import PublicPmOverviewResponseCategoriesItemType1
from .public_pm_overview_response_highlights import PublicPmOverviewResponseHighlights
from .public_pm_overview_response_stats import PublicPmOverviewResponseStats
from .public_pm_source import PublicPmSource
from .public_pm_source_slug import PublicPmSourceSlug
from .public_pm_sources_health_response import PublicPmSourcesHealthResponse
from .public_pm_sources_health_response_degraded_item import PublicPmSourcesHealthResponseDegradedItem
from .public_pm_sources_health_response_enrichment import PublicPmSourcesHealthResponseEnrichment
from .public_pm_sources_health_response_sources_item import PublicPmSourcesHealthResponseSourcesItem
from .public_pm_sources_health_response_sources_item_catalog import PublicPmSourcesHealthResponseSourcesItemCatalog
from .public_pm_sources_health_response_summary import PublicPmSourcesHealthResponseSummary
from .public_pm_sources_health_response_thresholds import PublicPmSourcesHealthResponseThresholds
from .public_pm_whale_trade import PublicPmWhaleTrade
from .public_pm_whale_trade_availability import PublicPmWhaleTradeAvailability
from .public_pm_whales_response import PublicPmWhalesResponse
from .public_pm_whales_response_coverage_item import PublicPmWhalesResponseCoverageItem
from .public_pm_whales_response_stats_24h import PublicPmWhalesResponseStats24H
from .resolve_symbol_response_200 import ResolveSymbolResponse200
from .resolve_symbol_response_200_alternatives_item import ResolveSymbolResponse200AlternativesItem
from .resolve_symbol_response_200_match_type_0 import ResolveSymbolResponse200MatchType0
from .scorecard import Scorecard
from .scorecard_metrics import ScorecardMetrics
from .scorecard_returns_basis import ScorecardReturnsBasis
from .scorecard_run_cohort import ScorecardRunCohort
from .scorecard_run_cohort_universe import ScorecardRunCohortUniverse
from .scorecard_run_contributions_summary import ScorecardRunContributionsSummary
from .scorecard_run_contributions_summary_exclusion_reasons import ScorecardRunContributionsSummaryExclusionReasons
from .scorecard_run_detail import ScorecardRunDetail
from .scorecard_run_list_entry import ScorecardRunListEntry
from .scorecard_run_list_page import ScorecardRunListPage
from .scorecard_run_pointer import ScorecardRunPointer
from .scorecard_schema import ScorecardSchema
from .search_public_prediction_market_events_sort import SearchPublicPredictionMarketEventsSort
from .set_futures_sl_tp_body import SetFuturesSlTpBody
from .set_futures_sl_tp_response_422 import SetFuturesSlTpResponse422
from .spot_order_request import SpotOrderRequest
from .spot_order_request_order_type import SpotOrderRequestOrderType
from .spot_order_request_side import SpotOrderRequestSide
from .spot_order_response import SpotOrderResponse
from .spot_order_response_summary import SpotOrderResponseSummary
from .spot_quote_request import SpotQuoteRequest
from .spot_quote_request_side import SpotQuoteRequestSide
from .spot_quote_response import SpotQuoteResponse
from .spot_quote_response_available import SpotQuoteResponseAvailable
from .spot_quote_response_coin import SpotQuoteResponseCoin
from .spot_quote_response_side import SpotQuoteResponseSide
from .wallet import Wallet
from .wallet_coin_type_0 import WalletCoinType0
from .wallet_usdt import WalletUsdt
from .whoami_response_200 import WhoamiResponse200
from .whoami_response_200_scopes_item import WhoamiResponse200ScopesItem

__all__ = (
    "AgentAuditStats",
    "AgentDecisionArtifact",
    "AgentDecisionArtifactOpportunityKind",
    "AgentEvaluationStats",
    "AgentExecutionAssumptions",
    "AgentExecutionAssumptionsCostModel",
    "AgentExecutionAssumptionsExecutionTiming",
    "AgentForecastSkill",
    "AgentForecastSkillBasis",
    "AgentForecastSkillCohortsType0",
    "AgentForecastSkillSchema",
    "AgentForecastSkillState",
    "AgentLedgerRetentionPolicy",
    "AgentObservation",
    "AgentObservationDataset",
    "AgentObservationInputs",
    "AgentPortfolio",
    "AgentPortfolioEquity",
    "AgentPortfolioOpenOrdersItem",
    "AgentPortfolioPnl",
    "AgentPortfolioProgressionType0",
    "AgentRunCount",
    "AgentRunEvidenceChecklist",
    "AgentRunEvidenceChecklistItemsItem",
    "AgentRunEvidenceChecklistItemsItemStatus",
    "AgentRunEvidenceChecklistOverallStatus",
    "AgentRunEvidenceManifest",
    "AgentRunEvidenceManifestSummary",
    "AgentRunEvidenceManifestSummaryRelatedEntitiesItem",
    "AgentRunOutcomeSummary",
    "AgentRunOutcomeSummaryByVenue",
    "AgentRunOutcomeSummaryByVenueFutures",
    "AgentRunOutcomeSummaryByVenuePm",
    "AgentRunOutcomeSummaryByVenueSpot",
    "AgentRunOutcomeSummaryCoverage",
    "AgentScorecardResponse",
    "AgentScorecardResponseCalibrationBasis",
    "AgentTraceMetadata",
    "AgentVenuePerf",
    "ArenaAgent",
    "ArenaAgentBadgesItem",
    "ArenaAgentByVenue",
    "ArenaAgentSource",
    "ArenaDecision",
    "ArenaDecisionOpportunityKind",
    "ArenaDecisionResult",
    "ArenaOpportunity",
    "ArenaOpportunityOpportunityKind",
    "CancelSpotOrderResponse200",
    "CompetitionBoardRow",
    "CompetitionBoardRowByVenue",
    "CompetitionMeta",
    "CompetitionMetaStatus",
    "CompetitionMetaVisibility",
    "DecisionProvenance",
    "DecisionProvenanceEvidenceRefType0",
    "DecisionProvenanceReport",
    "DecisionProvenanceReportEvidenceRef",
    "DecisionProvenanceReportRuntimeKind",
    "DecisionProvenanceReportSkillVersions",
    "DecisionProvenanceRuntimeKindType1",
    "DecisionProvenanceRuntimeKindType2Type1",
    "DecisionProvenanceRuntimeKindType3Type1",
    "DecisionProvenanceSkillVersionsType0",
    "DecisionSupport",
    "DecisionSupportFlags",
    "DecisionSupportLiquidityTier",
    "DecisionSupportQualityTier",
    "DecisionSupportSpreadTier",
    "DecisionSupportVolumeTier",
    "DiscoverPredictionMarketsSort",
    "DiscoverPredictionMarketsSource",
    "EntryContext",
    "Error",
    "ExecutionModel",
    "ForecastSkillMetrics",
    "Freshness",
    "FreshnessBasis",
    "FreshnessStatusType1",
    "FreshnessStatusType2Type1",
    "FreshnessStatusType3Type1",
    "FuturesCloseRequest",
    "FuturesOpenRequest",
    "FuturesOpenRequestSide",
    "FuturesPosition",
    "FuturesPositionCoin",
    "FuturesPositionEnvelope",
    "FuturesPositionSide",
    "FuturesPositionStatus",
    "FuturesQuoteRequest",
    "FuturesQuoteRequestSide",
    "FuturesQuoteResponse",
    "FuturesQuoteResponseCoin",
    "GetAgentNewsResponse200",
    "GetAgentNewsResponse200ItemsItem",
    "GetArenaAgentResponse200",
    "GetArenaDecisionsFormat",
    "GetArenaDecisionsResponse200",
    "GetArenaDecisionsResponse200Pagination",
    "GetArenaLeaderboardResponse200",
    "GetArenaLeaderboardResponse200Source",
    "GetArenaLeaderboardResponse200Window",
    "GetArenaLeaderboardWindow",
    "GetCandlesRange",
    "GetCandlesResponse200",
    "GetCandlesResponse200CandlesItem",
    "GetCandlesResponse200Coin",
    "GetCandlesResponse200Range",
    "GetCompetitionBoardResponse200",
    "GetEquityCurveGranularity",
    "GetEquityCurveResponse200",
    "GetEquityCurveResponse200Granularity",
    "GetEquityCurveResponse200PointsItem",
    "GetEquityCurveResponse200PointsItemVenue",
    "GetEquityCurveResponse200Window",
    "GetFuturesPositionsResponse200",
    "GetMarketContextResponse200",
    "GetMarketContextResponse200Coin",
    "GetMarketContextResponse200FearGreedType0",
    "GetMarketContextResponse200PriceType0",
    "GetMarketContextResponse200RelatedMarketsItem",
    "GetMarketContextResponse200Sentiment",
    "GetMarketContextResponse200SimilarCoinsItem",
    "GetMyTradesResponse200",
    "GetMyTradesResponse200TradesItem",
    "GetMyTradesResponse200TradesItemDetail",
    "GetMyTradesResponse200TradesItemVenue",
    "GetMyTradesVenue",
    "GetPerformanceResponse200",
    "GetPerformanceResponse200ByVenue",
    "ListCompetitionsResponse200",
    "ListOpenOrdersResponse200",
    "OpenFuturesPositionResponse422",
    "OpenOrder",
    "OpenOrderOrderType",
    "OpenOrderSide",
    "OpenPmPositionResponse422",
    "OpportunityCohortContext",
    "OpportunityCohortContextKind",
    "PlaceSpotOrderResponse400",
    "PlaceSpotOrderResponse404",
    "PmDiscoveryMarket",
    "PmDiscoveryMarketSource",
    "PmDiscoveryOutcome",
    "PmDiscoveryQuoteHint",
    "PmDiscoveryQuoteHintSource",
    "PmDiscoveryResponse",
    "PmDiscoveryResponseMeta",
    "PmDiscoveryResponseMetaSource",
    "PmDiscoveryResponseMetaSourceHealthItem",
    "PmDiscoveryResponseMetaSourceHealthItemStatus",
    "PmDiscoveryResponseMetaSourcesItem",
    "PmDiscoveryResponsePagination",
    "PmOpenRequest",
    "PmOpenRequestSide",
    "PmOpportunityRequest",
    "PmOpportunityRequestCohort",
    "PmOpportunityRequestKind",
    "PmOpportunityResponse",
    "PmOpportunityResponseOpportunityKind",
    "PmOpportunityResponseResult",
    "PmQuality",
    "PmQuoteRequest",
    "PmQuoteRequestSide",
    "PmQuoteResponse",
    "PmQuoteResponseEligibility",
    "PmQuoteResponseEvent",
    "PmQuoteResponseFrozenEntrySnapshot",
    "PmQuoteResponseSide",
    "PublicPmEvent",
    "PublicPmEventCrossPlatformItem",
    "PublicPmEventDecisionSupportType0",
    "PublicPmEventDetailResponse",
    "PublicPmEventDetailResponseCrossSourceMatchesItem",
    "PublicPmEventDetailResponseRelatedNewsItem",
    "PublicPmEventDetailResponseResolutionType0",
    "PublicPmEventDetailResponseSnapshotsItem",
    "PublicPmEventDetailResponseVolumeHistoryItem",
    "PublicPmEventFreshness",
    "PublicPmEventQualityType0",
    "PublicPmEventReferenceProbabilityType0",
    "PublicPmEventsResponse",
    "PublicPmEventsResponseMeta",
    "PublicPmEventsResponsePagination",
    "PublicPmOutcome",
    "PublicPmOverviewResponse",
    "PublicPmOverviewResponseByCategoryItem",
    "PublicPmOverviewResponseBySourceItem",
    "PublicPmOverviewResponseCategoriesItemType1",
    "PublicPmOverviewResponseHighlights",
    "PublicPmOverviewResponseStats",
    "PublicPmSource",
    "PublicPmSourcesHealthResponse",
    "PublicPmSourcesHealthResponseDegradedItem",
    "PublicPmSourcesHealthResponseEnrichment",
    "PublicPmSourcesHealthResponseSourcesItem",
    "PublicPmSourcesHealthResponseSourcesItemCatalog",
    "PublicPmSourcesHealthResponseSummary",
    "PublicPmSourcesHealthResponseThresholds",
    "PublicPmSourceSlug",
    "PublicPmWhalesResponse",
    "PublicPmWhalesResponseCoverageItem",
    "PublicPmWhalesResponseStats24H",
    "PublicPmWhaleTrade",
    "PublicPmWhaleTradeAvailability",
    "ResolveSymbolResponse200",
    "ResolveSymbolResponse200AlternativesItem",
    "ResolveSymbolResponse200MatchType0",
    "Scorecard",
    "ScorecardMetrics",
    "ScorecardReturnsBasis",
    "ScorecardRunCohort",
    "ScorecardRunCohortUniverse",
    "ScorecardRunContributionsSummary",
    "ScorecardRunContributionsSummaryExclusionReasons",
    "ScorecardRunDetail",
    "ScorecardRunListEntry",
    "ScorecardRunListPage",
    "ScorecardRunPointer",
    "ScorecardSchema",
    "SearchPublicPredictionMarketEventsSort",
    "SetFuturesSlTpBody",
    "SetFuturesSlTpResponse422",
    "SpotOrderRequest",
    "SpotOrderRequestOrderType",
    "SpotOrderRequestSide",
    "SpotOrderResponse",
    "SpotOrderResponseSummary",
    "SpotQuoteRequest",
    "SpotQuoteRequestSide",
    "SpotQuoteResponse",
    "SpotQuoteResponseAvailable",
    "SpotQuoteResponseCoin",
    "SpotQuoteResponseSide",
    "Wallet",
    "WalletCoinType0",
    "WalletUsdt",
    "WhoamiResponse200",
    "WhoamiResponse200ScopesItem",
)
