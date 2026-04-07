from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
import tempfile
import json
import re
import io
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from financial_mapper import normalize_financial_data, detect_document_type
from financial_calculator import calculate_metrics, calculate_growth_trends

# Configure logging FIRST (before any logger usage)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# AI provider detection — reads GEMINI_API_KEY / OPENAI_API_KEY
from ai_config import get_ai_config, log_ai_status
log_ai_status()

# MongoDB connection - with fallback for missing URL
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[os.environ.get('DB_NAME', 'financial_analytics')]
    logger.info("MongoDB connection initialized successfully")
except Exception as e:
    logger.warning(f"MongoDB connection failed initially: {e}. Will retry on first request.")
    client = None
    db = None

# Create the main app
app = FastAPI(title="Financial Analytics API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== MODELS =====================

class BalanceSheetValues(BaseModel):
    current_assets: float = 0
    current_liabilities: float = 0
    inventory: float = 0
    debtors: float = 0
    creditors: float = 0
    cash_bank_balance: float = 0

class ProfitLossValues(BaseModel):
    revenue: float = 0
    cogs: float = 0
    purchases: float = 0
    operating_expenses: float = 0
    net_profit: float = 0

class WorkingCapitalInput(BaseModel):
    company_name: str = "Company"
    balance_sheet: BalanceSheetValues
    profit_loss: ProfitLossValues
    projected_turnover: float = 0

class WorkingCapitalResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_data: Dict[str, Any]
    current_ratio: float
    quick_ratio: float
    debtor_days: float
    creditor_days: float
    inventory_days: float
    inventory_turnover: float
    wc_cycle: float
    gross_margin: float
    net_margin: float
    net_working_capital: float
    mpbf: float
    mpbf_method_1: float
    mpbf_method_2: float
    turnover_method: float
    eligible: bool
    wc_limit: float
    score: int
    assessment: List[str]
    recommendation: str
    suggestions: List[str] = Field(default_factory=list)
    risk_indicators: Optional[Dict[str, Any]] = None
    analysis_type: str = "working_capital"

class BankingInput(BaseModel):
    company_name: str = "Company"
    total_credits: float = 0
    total_debits: float = 0
    average_balance: float = 0
    minimum_balance: float = 0
    opening_balance: float = 0
    closing_balance: float = 0
    cash_deposits: float = 0
    cheque_bounces: int = 0
    loan_repayments: float = 0
    overdraft_usage: float = 0
    ecs_emi_payments: float = 0
    num_transactions: int = 0
    sanctioned_limit: float = 0
    utilized_limit: float = 0

class BankingResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_data: Dict[str, Any]
    credit_score: int
    grade: str
    risk_level: str
    liquidity_score: int
    cash_flow_score: int
    credit_score_component: int
    repayment_score: int
    stability_score: int
    working_capital_status: str
    liquidity_status: str
    cash_flow_status: str
    creditworthiness_status: str
    repayment_status: str
    stability_status: str
    behavior_status: str
    strengths: List[str]
    concerns: List[str]
    recommendation: str
    # Perfios-style enhanced fields
    health_score: int = 0
    health_status: str = "MODERATE"
    monthly_inflow: float = 0
    monthly_outflow: float = 0
    cash_flow_trend: List[Dict[str, Any]] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    insights: List[str] = Field(default_factory=list)
    ai_summary: str = ""
    eligibility_status: str = "UNDER REVIEW"
    analysis_type: str = "banking"

class YearData(BaseModel):
    year: str
    balance_sheet: BalanceSheetValues
    profit_loss: ProfitLossValues

class MultiYearInput(BaseModel):
    company_name: str = "Company"
    years_data: List[YearData]

class MultiYearResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_data: Dict[str, Any]
    years: List[str]
    trends: Dict[str, List[float]]
    insights: List[str]
    recommendation: str
    analysis_type: str = "multi_year"
    growth_trends: Optional[Dict[str, Any]] = None
    patterns: Optional[Dict[str, str]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    growth_score: Optional[int] = None
    trend_label: Optional[str] = None
    trend_analysis: Optional[Dict[str, Any]] = None

class Case(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    analysis_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any]

class FlexibleFinancialInput(BaseModel):
    """Accepts financial data with any field names and normalizes automatically."""
    company_name: str = "Company"
    financial_data: Dict[str, Any]
    year: Optional[str] = None

class GstInput(BaseModel):
    gstin: str = ""
    total_taxable_turnover: float = 0
    igst_collected: float = 0
    cgst_collected: float = 0
    sgst_collected: float = 0
    total_itc_available: float = 0
    total_itc_utilized: float = 0
    interest_paid: float = 0

class ItrInput(BaseModel):
    taxable_income: float = 0
    total_deductions: float = 0
    net_tax_liability: float = 0
    tax_due: float = 0
    tds_deducted: float = 0
    advance_tax_paid: float = 0

class GstItrInput(BaseModel):
    company_name: str = "Company"
    gst: GstInput
    itr: ItrInput

class GstItrResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_data: Dict[str, Any]
    total_gst_collected: float
    itc_utilization_rate: float
    gst_turnover_monthly: float
    effective_tax_rate: float
    tax_compliance_score: int
    assessment: List[str]
    strengths: List[str]
    concerns: List[str]
    recommendation: str
    eligible: bool
    analysis_type: str = "gst_itr"

class FinancialAnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    year: Optional[str] = None
    normalized_data: Dict[str, Any]
    metrics: Dict[str, Any]
    analysis: Dict[str, Any]
    confidence: Optional[float] = None
    analysis_type: str = "financial_analysis"

# ===================== HELPER FUNCTIONS =====================

def calculate_working_capital(data: WorkingCapitalInput) -> WorkingCapitalResult:
    bs = data.balance_sheet
    pl = data.profit_loss

    # ── HDFC Strict Mode calculations ──────────────────────────────────────────
    current_ratio = bs.current_assets / bs.current_liabilities if bs.current_liabilities > 0 else 0
    quick_ratio = (bs.current_assets - bs.inventory) / bs.current_liabilities if bs.current_liabilities > 0 else 0

    debtor_days = (bs.debtors / pl.revenue * 365) if pl.revenue > 0 else 0

    # Special condition: if Purchases = 0, creditor_days and inventory_days must be 0
    if pl.purchases > 0:
        creditor_days = (bs.creditors / pl.purchases) * 365
        inventory_days = (bs.inventory / pl.purchases) * 365
    else:
        creditor_days = 0
        inventory_days = 0

    inventory_turnover = pl.cogs / bs.inventory if bs.inventory > 0 else 0

    wc_cycle = debtor_days + inventory_days - creditor_days

    gross_margin = ((pl.revenue - pl.cogs) / pl.revenue * 100) if pl.revenue > 0 else 100
    net_margin = (pl.net_profit / pl.revenue * 100) if pl.revenue > 0 else 0

    net_working_capital = bs.current_assets - bs.current_liabilities

    # HDFC MPBF = 0.75 * Working Capital Gap
    wc_gap = net_working_capital
    mpbf = 0.75 * wc_gap

    # Legacy method fields kept for backward compatibility
    mpbf_method_1 = max(0, 0.75 * net_working_capital)
    mpbf_method_2 = max(0, 0.75 * bs.current_assets - bs.current_liabilities)
    projected_turnover = data.projected_turnover if data.projected_turnover > 0 else pl.revenue
    turnover_method = 0.20 * projected_turnover

    # HDFC Working Capital Limit = 20% * Sales
    wc_limit = 0.20 * pl.revenue

    eligible = current_ratio >= 1.33 and quick_ratio >= 1.0

    assessment = []
    if current_ratio < 1.33:
        assessment.append(f"Current Ratio {current_ratio:.2f}x — below 1.33x benchmark")
    else:
        assessment.append(f"Current Ratio {current_ratio:.2f}x — meets benchmark")

    if quick_ratio < 1.0:
        assessment.append(f"Quick Ratio {quick_ratio:.2f}x — may face liquidity pressure")
    else:
        assessment.append(f"Quick Ratio {quick_ratio:.2f}x — healthy liquidity")

    if net_margin < 5:
        assessment.append(f"Net Margin {net_margin:.1f}% — monitor for improvement")
    else:
        assessment.append(f"Net Margin {net_margin:.1f}% — healthy profitability")

    if wc_cycle > 90:
        assessment.append(f"WC Cycle {wc_cycle:.0f} days — extended cycle, optimize receivables")
    else:
        assessment.append(f"WC Cycle {wc_cycle:.0f} days — efficient operations")

    score = 0
    if current_ratio >= 1.33: score += 25
    elif current_ratio >= 1.0: score += 15
    elif current_ratio > 0: score += 5

    if quick_ratio >= 1.0: score += 25
    elif quick_ratio >= 0.75: score += 15
    elif quick_ratio > 0: score += 5

    if net_margin >= 10: score += 25
    elif net_margin >= 5: score += 15
    elif net_margin > 0: score += 10

    if wc_cycle <= 60: score += 25
    elif wc_cycle <= 90: score += 15
    else: score += 5

    if eligible:
        recommendation = f"Working capital position is healthy. Recommended WC limit of ₹{wc_limit:,.0f} based on financial analysis. Entity qualifies for working capital financing."
    else:
        issues = []
        if current_ratio < 1.33:
            issues.append("Current Ratio below minimum benchmark")
        if quick_ratio < 1.0:
            issues.append("liquidity concerns")
        recommendation = f"Working capital position is inadequate for loan eligibility at this time. {' and '.join(issues)}. Suggest reapplication after improving current asset position."

    # ── Advisory suggestions (informational only — do not alter calculations) ──
    suggestions: List[str] = []

    if pl.purchases == 0:
        suggestions.append(
            "Creditor days and inventory days may be distorted as purchases are zero; "
            "consider using operating expenses for analysis."
        )

    if bs.current_assets > 0 and (bs.debtors + bs.inventory) > bs.current_assets:
        suggestions.append(
            "Current assets may be incomplete; ensure all components are included."
        )

    if current_ratio < 1:
        suggestions.append("Liquidity appears weak under current inputs.")

    if wc_cycle > 90:
        suggestions.append("Working capital cycle indicates higher funding requirement.")

    # ── Risk Indicators ────────────────────────────────────────────────────────
    # Current Ratio risk
    if current_ratio < 1:
        cr_color = "red"
        cr_label = "Weak"
    elif current_ratio <= 1.33:
        cr_color = "amber"
        cr_label = "Moderate"
    else:
        cr_color = "green"
        cr_label = "Strong"

    # WC Cycle risk
    if wc_cycle > 90:
        wcc_color = "red"
        wcc_label = "High"
    elif wc_cycle >= 60:
        wcc_color = "amber"
        wcc_label = "Moderate"
    else:
        wcc_color = "green"
        wcc_label = "Efficient"

    # NWC risk
    if net_working_capital < 0:
        nwc_color = "red"
        nwc_label = "Risk"
    elif net_working_capital < (bs.current_assets * 0.2 if bs.current_assets > 0 else 1):
        nwc_color = "amber"
        nwc_label = "Moderate"
    else:
        nwc_color = "green"
        nwc_label = "Healthy"

    risk_indicators = {
        "current_ratio": {"color": cr_color, "label": cr_label},
        "wc_cycle": {"color": wcc_color, "label": wcc_label},
        "nwc": {"color": nwc_color, "label": nwc_label},
    }

    return WorkingCapitalResult(
        company_name=data.company_name,
        input_data={
            "balance_sheet": bs.dict(),
            "profit_loss": pl.dict(),
            "projected_turnover": data.projected_turnover
        },
        current_ratio=round(current_ratio, 2),
        quick_ratio=round(quick_ratio, 2),
        debtor_days=round(debtor_days, 1),
        creditor_days=round(creditor_days, 1),
        inventory_days=round(inventory_days, 1),
        inventory_turnover=round(inventory_turnover, 2),
        wc_cycle=round(wc_cycle, 1),
        gross_margin=round(gross_margin, 1),
        net_margin=round(net_margin, 1),
        net_working_capital=net_working_capital,
        mpbf=round(mpbf, 2),
        mpbf_method_1=round(mpbf_method_1, 0),
        mpbf_method_2=round(mpbf_method_2, 0),
        turnover_method=round(turnover_method, 0),
        eligible=eligible,
        wc_limit=round(wc_limit, 2),
        score=score,
        assessment=assessment,
        recommendation=recommendation,
        suggestions=suggestions,
        risk_indicators=risk_indicators,
    )

def calculate_gst_itr(data: GstItrInput) -> GstItrResult:
    gst = data.gst
    itr = data.itr

    # GST metrics
    total_gst_collected = gst.igst_collected + gst.cgst_collected + gst.sgst_collected
    itc_utilization_rate = (
        gst.total_itc_utilized / gst.total_itc_available * 100
        if gst.total_itc_available > 0 else 0
    )
    gst_turnover_monthly = gst.total_taxable_turnover / 12 if gst.total_taxable_turnover > 0 else 0

    # ITR metrics
    effective_tax_rate = (
        itr.net_tax_liability / itr.taxable_income * 100
        if itr.taxable_income > 0 else 0
    )

    # Turnover-to-income consistency
    max_val = max(gst.total_taxable_turnover, itr.taxable_income)
    # Note: GST turnover (gross revenue) vs ITR taxable income (revenue minus deductions)
    # are different financial concepts. A gap is expected; a very large gap (>20%) may
    # indicate inconsistent income reporting across filings.
    gst_vs_itr_gap = (
        abs(gst.total_taxable_turnover - itr.taxable_income) / max_val * 100
        if max_val > 0 else 0
    )

    # Compliance scoring (100 points total)
    score = 0

    # ITC utilization (25 pts)
    if itc_utilization_rate >= 90:
        score += 25
    elif itc_utilization_rate >= 75:
        score += 18
    elif itc_utilization_rate >= 50:
        score += 10
    elif gst.total_itc_available == 0:
        score += 15  # N/A — not penalised

    # Tax payment status (25 pts)
    if itr.tax_due == 0 and itr.net_tax_liability > 0:
        score += 25
    elif itr.tax_due == 0:
        score += 20
    elif itr.net_tax_liability > 0 and itr.tax_due <= itr.net_tax_liability * 0.10:
        score += 18
    elif itr.net_tax_liability > 0 and itr.tax_due <= itr.net_tax_liability * 0.25:
        score += 10

    # Interest paid (15 pts) — lower is better
    if gst.interest_paid == 0:
        score += 15
    elif total_gst_collected > 0 and gst.interest_paid < total_gst_collected * 0.02:
        score += 10
    elif total_gst_collected > 0 and gst.interest_paid < total_gst_collected * 0.05:
        score += 5

    # Turnover-income consistency (20 pts)
    if gst_vs_itr_gap < 5:
        score += 20
    elif gst_vs_itr_gap < 10:
        score += 15
    elif gst_vs_itr_gap < 20:
        score += 8

    # Effective tax rate reasonableness (15 pts)
    if 15 <= effective_tax_rate <= 35:
        score += 15
    elif 10 <= effective_tax_rate <= 40:
        score += 10
    elif effective_tax_rate > 0:
        score += 5

    tax_compliance_score = min(100, score)

    # Assessment, strengths, concerns
    assessment: List[str] = []
    strengths: List[str] = []
    concerns: List[str] = []

    if gst.total_itc_available > 0:
        if itc_utilization_rate >= 80:
            assessment.append(f"ITC Utilization {itc_utilization_rate:.1f}% — efficient ITC management")
            strengths.append("High ITC utilization indicates efficient GST compliance")
        elif itc_utilization_rate >= 50:
            assessment.append(f"ITC Utilization {itc_utilization_rate:.1f}% — moderate efficiency")
        else:
            assessment.append(f"ITC Utilization {itc_utilization_rate:.1f}% — low utilization, review ITC claims")
            concerns.append("Low ITC utilization may indicate compliance gaps")

    if itr.tax_due == 0:
        strengths.append("Tax liability fully settled — no outstanding dues")
        assessment.append("Tax liability fully settled")
    elif itr.tax_due > 0:
        concerns.append(f"Outstanding tax due of ₹{itr.tax_due:,.0f}")
        assessment.append(f"Pending tax payment: ₹{itr.tax_due:,.0f}")

    if gst.interest_paid == 0:
        strengths.append("No GST interest penalties — timely filings")
    elif gst.interest_paid > 0:
        concerns.append("GST interest paid — review filing timeliness")
        assessment.append(f"GST interest paid: ₹{gst.interest_paid:,.0f}")

    if gst.total_taxable_turnover > 0 and itr.taxable_income > 0:
        if gst_vs_itr_gap < 10:
            strengths.append("GST turnover and ITR income are consistent")
            assessment.append("Income reporting is consistent across GST and ITR")
        else:
            concerns.append(f"Turnover vs income discrepancy: {gst_vs_itr_gap:.1f}% gap")
            assessment.append(f"Turnover-income gap detected: {gst_vs_itr_gap:.1f}%")

    if effective_tax_rate > 0:
        assessment.append(f"Effective tax rate: {effective_tax_rate:.1f}%")

    eligible = tax_compliance_score >= 60 and itr.tax_due == 0

    if eligible:
        recommendation = (
            f"Tax compliance score {tax_compliance_score}/100 — Good tax discipline. "
            "Eligible for credit assessment."
        )
    elif tax_compliance_score >= 40:
        recommendation = (
            f"Tax compliance score {tax_compliance_score}/100 — Moderate compliance. "
            "Settle outstanding dues before credit application."
        )
    else:
        recommendation = (
            f"Tax compliance score {tax_compliance_score}/100 — Needs improvement. "
            "Address compliance gaps and pending taxes."
        )

    return GstItrResult(
        company_name=data.company_name,
        input_data={"gst": gst.dict(), "itr": itr.dict()},
        total_gst_collected=round(total_gst_collected, 2),
        itc_utilization_rate=round(itc_utilization_rate, 2),
        gst_turnover_monthly=round(gst_turnover_monthly, 2),
        effective_tax_rate=round(effective_tax_rate, 2),
        tax_compliance_score=tax_compliance_score,
        assessment=assessment,
        strengths=strengths,
        concerns=concerns,
        recommendation=recommendation,
        eligible=eligible,
    )


def calculate_banking_score(data: BankingInput) -> BankingResult:
    if data.average_balance > 0:
        balance_ratio = data.minimum_balance / data.average_balance if data.average_balance > 0 else 0
        liquidity_score = min(100, int(balance_ratio * 100 + 35))
    else:
        liquidity_score = 35
    
    if data.total_credits > 0:
        cf_ratio = (data.total_credits - data.total_debits) / data.total_credits
        cash_flow_score = min(100, max(0, int(50 + cf_ratio * 50)))
    else:
        cash_flow_score = 50
    
    bounce_rate = data.cheque_bounces / max(data.num_transactions, 1)
    credit_component = max(0, int(100 - bounce_rate * 500))
    
    if data.ecs_emi_payments > 0:
        repayment_score = min(100, int(65 + (data.loan_repayments / data.ecs_emi_payments) * 35))
    else:
        repayment_score = 65
    
    if data.opening_balance > 0 and data.closing_balance > 0:
        stability_ratio = min(data.opening_balance, data.closing_balance) / max(data.opening_balance, data.closing_balance)
        stability_score = min(100, int(stability_ratio * 100))
    else:
        stability_score = 70
    
    credit_score = int(
        liquidity_score * 0.15 +
        cash_flow_score * 0.25 +
        credit_component * 0.25 +
        repayment_score * 0.20 +
        stability_score * 0.15
    )
    
    if credit_score >= 85:
        grade = "A"
        risk_level = "Low"
    elif credit_score >= 65:
        grade = "B"
        risk_level = "Medium"
    elif credit_score >= 50:
        grade = "C"
        risk_level = "High"
    else:
        grade = "D"
        risk_level = "Very High"
    
    def get_status(score):
        if score >= 70:
            return "Adequate"
        elif score >= 50:
            return "Moderate"
        else:
            return "Weak"
    
    working_capital_status = get_status(cash_flow_score)
    liquidity_status = get_status(liquidity_score)
    cash_flow_status = get_status(cash_flow_score)
    creditworthiness_status = get_status(credit_component)
    repayment_status = get_status(repayment_score)
    stability_status = "Strong" if stability_score >= 80 else "Adequate" if stability_score >= 60 else "Weak"
    behavior_status = "Disciplined" if data.cheque_bounces <= 2 else "Needs Improvement"
    
    strengths = []
    concerns = []
    
    if stability_score >= 70:
        strengths.append("Stable financial profile")
    if cash_flow_score >= 70:
        strengths.append("Healthy cash flow management")
    if credit_component >= 80:
        strengths.append("Good credit discipline")
    if repayment_score >= 70:
        strengths.append("Consistent repayment behavior")
    
    if liquidity_score < 50:
        concerns.append("Liquidity is inadequate")
    if data.cheque_bounces > 3:
        concerns.append(f"High cheque bounces ({data.cheque_bounces})")
    if cash_flow_score < 50:
        concerns.append("Cash flow needs monitoring")
    if data.overdraft_usage > data.sanctioned_limit * 0.8 if data.sanctioned_limit > 0 else False:
        concerns.append("High overdraft utilization")
    
    if not strengths:
        strengths.append("Room for improvement across metrics")
    if not concerns:
        concerns.append("No major concerns identified")
    
    if grade in ["A", "B"]:
        recommendation = f"The borrower presents a {grade.lower() if grade == 'B' else 'strong'} banking profile ({credit_score}/100) with {len(concerns) if concerns[0] != 'No major concerns identified' else 'no'} minor concerns. Recommend {'full' if grade == 'A' else 'conditional'} approval with {'standard' if grade == 'A' else 'quarterly'} monitoring of account operations and financial statements."
    else:
        recommendation = f"The borrower presents a {grade.lower()} banking profile ({credit_score}/100) with significant concerns. {'Review required before approval.' if grade == 'C' else 'Not recommended for approval at this time.'}"
    
    # ---- Perfios-style enhancements ----

    # Health score & status (simple rule-based, per product spec)
    health_score = credit_score
    if health_score >= 85:
        health_status = "EXCELLENT"
    elif health_score >= 70:
        health_status = "GOOD"
    elif health_score >= 55:
        health_status = "MODERATE"
    elif health_score >= 40:
        health_status = "RISKY"
    else:
        health_status = "CRITICAL"

    # Monthly averages (assume 6-month statement)
    _STATEMENT_MONTHS = 6
    monthly_inflow = round(data.total_credits / _STATEMENT_MONTHS, 2) if data.total_credits > 0 else 0
    monthly_outflow = round(data.total_debits / _STATEMENT_MONTHS, 2) if data.total_debits > 0 else 0

    # Cash flow trend – 6 synthetic monthly points with gentle sinusoidal variance.
    # Amplitude (0.12), frequency (1.1) and phase (0.5) are tuned to produce a
    # realistic-looking but non-volatile oscillation across the 6-month window.
    trend_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    cash_flow_trend = []
    for idx, month in enumerate(trend_months):
        variance = 0.12 * math.sin(idx * 1.1 + 0.5)
        inflow_val = round(monthly_inflow * (1 + variance), 2)
        outflow_val = round(monthly_outflow * (1 - variance * 0.6), 2)
        cash_flow_trend.append({"month": month, "inflow": inflow_val, "outflow": outflow_val})

    # Risk detection engine
    risks: List[str] = []
    if data.cheque_bounces > 2:
        risks.append(f"Frequent cheque bounces ({data.cheque_bounces} occurrences)")
    if data.ecs_emi_payments > 0 and data.total_credits > 0:
        emi_ratio = data.ecs_emi_payments / data.total_credits
        if emi_ratio > 0.4:
            risks.append(f"High EMI burden — {emi_ratio * 100:.0f}% of inflows committed to EMIs")
    if monthly_inflow > 0 and data.average_balance > 0:
        if data.average_balance / monthly_inflow < 0.2:
            risks.append("Low average balance relative to monthly transaction volume")
    if data.total_debits > data.total_credits and data.total_credits > 0:
        risks.append("Negative cash flow — outflows exceed inflows")
    if data.overdraft_usage > 0:
        risks.append("Overdraft usage detected — potential liquidity stress")
    if data.minimum_balance < data.average_balance * 0.15 and data.average_balance > 0:
        risks.append("Low minimum balance periods indicate liquidity pressure")

    # Insights cards
    insights: List[str] = []
    if cash_flow_score >= 70:
        insights.append("Stable Income Pattern")
    elif cash_flow_score >= 50:
        insights.append("Moderate Income Stability")
    else:
        insights.append("Irregular Income Pattern")

    if data.ecs_emi_payments > 0 and data.total_credits > 0:
        emi_pct = data.ecs_emi_payments / data.total_credits * 100
        if emi_pct > 30:
            insights.append(f"High EMI Load ({emi_pct:.0f}% of inflows)")
        else:
            insights.append(f"Manageable EMI Load ({emi_pct:.0f}% of inflows)")

    cf_volatility = abs(data.total_credits - data.total_debits) / max(data.total_credits, 1)
    if cf_volatility > 0.3:
        insights.append("Cash Flow Volatility Detected")
    else:
        insights.append("Consistent Cash Flow Pattern")

    if stability_score >= 80:
        insights.append("Strong Balance Stability")
    elif stability_score >= 60:
        insights.append("Moderate Balance Stability")
    else:
        insights.append("Balance Instability Risk")

    if data.cheque_bounces == 0:
        insights.append("Zero Bounce Record — Disciplined")
    elif data.cheque_bounces <= 2:
        insights.append(f"Minor Bounce History ({data.cheque_bounces})")
    else:
        insights.append(f"High Bounce Risk ({data.cheque_bounces} bounces)")

    # Eligibility status
    if grade == "A":
        eligibility_status = "ELIGIBLE"
    elif grade == "B":
        eligibility_status = "CONDITIONALLY ELIGIBLE"
    elif grade == "C":
        eligibility_status = "UNDER REVIEW"
    else:
        eligibility_status = "NOT ELIGIBLE"

    # AI-style summary paragraph
    flow_desc = "stable" if cash_flow_score >= 70 else "moderate" if cash_flow_score >= 50 else "volatile"
    emi_desc = ""
    if data.ecs_emi_payments > 0 and data.total_credits > 0:
        emi_pct = data.ecs_emi_payments / data.total_credits * 100
        emi_desc = (f" High EMI obligations ({emi_pct:.0f}% of inflows) reduce available liquidity." if emi_pct > 30
                    else f" EMI obligations are at {emi_pct:.0f}% of inflows, within acceptable range.")
    bounce_desc = (f" {data.cheque_bounces} cheque bounce(s) noted, elevating credit risk." if data.cheque_bounces > 0
                   else " No cheque bounces recorded, reflecting disciplined account behaviour.")
    stability_desc = (" Account balance shows strong stability." if stability_score >= 80
                      else " Occasional low balance periods increase risk." if stability_score < 60
                      else " Account balance is reasonably stable.")
    ai_summary = (
        f"The account demonstrates {flow_desc} cash inflows with a monthly average of "
        f"₹{monthly_inflow:,.0f}.{emi_desc}{bounce_desc}{stability_desc} "
        f"Overall banking health is rated {health_status} ({health_score}/100), "
        f"placing the borrower in Grade {grade} — {eligibility_status.lower()}."
    )

    return BankingResult(
        company_name=data.company_name,
        input_data=data.dict(),
        credit_score=credit_score,
        grade=grade,
        risk_level=risk_level,
        liquidity_score=liquidity_score,
        cash_flow_score=cash_flow_score,
        credit_score_component=credit_component,
        repayment_score=repayment_score,
        stability_score=stability_score,
        working_capital_status=working_capital_status,
        liquidity_status=liquidity_status,
        cash_flow_status=cash_flow_status,
        creditworthiness_status=creditworthiness_status,
        repayment_status=repayment_status,
        stability_status=stability_status,
        behavior_status=behavior_status,
        strengths=strengths,
        concerns=concerns,
        recommendation=recommendation,
        health_score=health_score,
        health_status=health_status,
        monthly_inflow=monthly_inflow,
        monthly_outflow=monthly_outflow,
        cash_flow_trend=cash_flow_trend,
        risks=risks,
        insights=insights,
        ai_summary=ai_summary,
        eligibility_status=eligibility_status,
    )

def _calc_pct_change(first: float, last: float) -> float:
    """Return percentage change from first to last value."""
    if first == 0:
        return 0.0
    return round((last - first) / abs(first) * 100, 1)


def _calc_growth_score(
    revenue_growth: float,
    profit_growth: float,
    wc_growth: float,
    patterns: Dict[str, str],
) -> int:
    """Compute a 0-100 growth health score."""
    score = 100
    if revenue_growth < 0:
        score -= 30
    elif revenue_growth < 5:
        score -= 10
    if profit_growth < 0:
        score -= 30
    elif profit_growth < 5:
        score -= 10
    if wc_growth < 0:
        score -= 20
    if patterns.get("revenue") == "volatile":
        score -= 10
    if patterns.get("net_profit") == "volatile":
        score -= 10
    return max(0, min(100, score))


def _detect_trend_label(
    patterns: Dict[str, str],
    revenue_growth: float,
    profit_growth: float,
) -> str:
    """Determine overall trend label from patterns and growth rates."""
    rev_pat = patterns.get("revenue", "")
    profit_pat = patterns.get("net_profit", "")
    if rev_pat == "volatile" or profit_pat == "volatile":
        return "Volatile Performance"
    if rev_pat == "growing" and profit_pat == "growing":
        return "Strong Growth"
    if rev_pat == "declining" or profit_pat == "declining":
        return "Declining Trend"
    if revenue_growth > 0 and profit_growth > 0:
        return "Consistent Growth"
    return "Stable Performance"


def calculate_multi_year_trends(data: MultiYearInput) -> MultiYearResult:
    years = [yd.year for yd in data.years_data]
    
    trends = {
        "revenue": [],
        "net_profit": [],
        "current_ratio": [],
        "net_working_capital": [],
        "gross_margin": [],
        "net_margin": []
    }

    # Per-year HDFC structured data (year, current_ratio, nwc, wc_cycle)
    yearly_data = []
    
    for yd in data.years_data:
        bs = yd.balance_sheet
        pl = yd.profit_loss
        
        trends["revenue"].append(pl.revenue)
        trends["net_profit"].append(pl.net_profit)
        
        current_ratio = bs.current_assets / bs.current_liabilities if bs.current_liabilities > 0 else 0
        trends["current_ratio"].append(round(current_ratio, 2))
        
        nwc = bs.current_assets - bs.current_liabilities
        trends["net_working_capital"].append(nwc)
        
        gross_margin = ((pl.revenue - pl.cogs) / pl.revenue * 100) if pl.revenue > 0 else 0
        trends["gross_margin"].append(round(gross_margin, 1))
        
        net_margin = (pl.net_profit / pl.revenue * 100) if pl.revenue > 0 else 0
        trends["net_margin"].append(round(net_margin, 1))

        # HDFC per-year WC cycle calculation (same strict formulas as single-year)
        debtor_days = (bs.debtors / pl.revenue * 365) if pl.revenue > 0 else 0
        if pl.purchases > 0:
            creditor_days = (bs.creditors / pl.purchases) * 365
            inventory_days = (bs.inventory / pl.purchases) * 365
        else:
            creditor_days = 0
            inventory_days = 0
        wc_cycle = round(debtor_days + inventory_days - creditor_days, 1)

        yearly_data.append({
            "year": yd.year,
            "current_ratio": round(current_ratio, 2),
            "nwc": nwc,
            "wc_cycle": wc_cycle,
            "debtor_days": round(debtor_days, 1),
            "creditor_days": round(creditor_days, 1),
            "inventory_days": round(inventory_days, 1),
        })
    
    insights = []
    rev_growth = 0
    
    if len(trends["revenue"]) >= 2:
        rev_growth = ((trends["revenue"][-1] - trends["revenue"][0]) / trends["revenue"][0] * 100) if trends["revenue"][0] > 0 else 0
        if rev_growth > 0:
            insights.append(f"Revenue grew by {rev_growth:.1f}% over the period")
        else:
            insights.append(f"Revenue declined by {abs(rev_growth):.1f}% over the period")
    
    if len(trends["net_profit"]) >= 2:
        if trends["net_profit"][-1] > trends["net_profit"][0]:
            insights.append("Net profit shows improving trend")
        else:
            insights.append("Net profit shows declining trend - monitor profitability")
    
    if len(trends["current_ratio"]) >= 2:
        if trends["current_ratio"][-1] >= 1.33:
            insights.append("Current ratio meets benchmark in latest year")
        else:
            insights.append("Current ratio below benchmark - liquidity concern")
    
    avg_margin = sum(trends["net_margin"]) / len(trends["net_margin"]) if trends["net_margin"] else 0
    if avg_margin >= 10:
        insights.append(f"Average net margin of {avg_margin:.1f}% indicates healthy profitability")
    elif avg_margin >= 5:
        insights.append(f"Average net margin of {avg_margin:.1f}% is moderate")
    else:
        insights.append(f"Average net margin of {avg_margin:.1f}% needs improvement")
    
    positive_signals = sum([
        rev_growth > 10,
        trends["current_ratio"][-1] >= 1.33 if trends["current_ratio"] else False,
        avg_margin >= 5
    ])
    
    if positive_signals >= 2:
        recommendation = "Multi-year analysis shows positive financial trajectory. Business demonstrates growth potential and improving financial health."
    elif positive_signals == 1:
        recommendation = "Multi-year analysis shows mixed signals. Some metrics improving while others need attention. Recommend focused improvement in weak areas."
    else:
        recommendation = "Multi-year analysis indicates challenges in financial performance. Comprehensive business review recommended before financing decisions."

    # Enhanced growth trend analysis
    year_metrics_list = []
    for yd in data.years_data:
        bs = yd.balance_sheet
        pl = yd.profit_loss
        combined_raw = {**bs.dict(), **pl.dict()}
        normalized = normalize_financial_data(combined_raw)
        year_metrics_list.append(calculate_metrics(normalized))

    growth_trend_data = calculate_growth_trends(year_metrics_list)

    patterns_dict: Dict[str, str] = growth_trend_data.get("patterns") or {}
    rev_list = trends["revenue"]
    profit_list = trends["net_profit"]
    wc_list = trends["net_working_capital"]

    revenue_growth = _calc_pct_change(rev_list[0], rev_list[-1]) if len(rev_list) >= 2 else 0.0
    profit_growth = _calc_pct_change(profit_list[0], profit_list[-1]) if len(profit_list) >= 2 else 0.0
    wc_growth = _calc_pct_change(wc_list[0], wc_list[-1]) if len(wc_list) >= 2 else 0.0

    growth_score = _calc_growth_score(revenue_growth, profit_growth, wc_growth, patterns_dict)
    trend_label = _detect_trend_label(patterns_dict, revenue_growth, profit_growth)

    if growth_score >= 70:
        eligibility_status = "Eligible"
    elif growth_score >= 45:
        eligibility_status = "Conditional"
    else:
        eligibility_status = "Not Eligible"

    # ── Trend direction analysis across years ─────────────────────────────────
    def _trend_direction(values: List[float]) -> str:
        """Detect trend direction from a list of values."""
        if len(values) < 2:
            return "stable"
        all_inc = all(values[i] <= values[i + 1] for i in range(len(values) - 1))
        all_dec = all(values[i] >= values[i + 1] for i in range(len(values) - 1))
        if all_inc:
            return "increasing"
        if all_dec:
            return "decreasing"
        return "fluctuating"

    cr_direction = _trend_direction(trends["current_ratio"])
    wcc_values = [yd["wc_cycle"] for yd in yearly_data]
    wcc_direction = _trend_direction(wcc_values)
    nwc_direction = _trend_direction(trends["net_working_capital"])

    def _direction_indicator(direction: str, invert: bool = False) -> Dict[str, str]:
        """Map direction to color/label. invert=True means higher is worse (e.g. wc_cycle)."""
        if direction == "increasing":
            color, label = ("green", "🟢 Improving") if not invert else ("red", "🔴 Risk")
        elif direction == "decreasing":
            color, label = ("red", "🔴 Risk") if not invert else ("green", "🟢 Improving")
        else:
            color, label = ("amber", "🟡 Unstable")
        return {"direction": direction, "color": color, "label": label}

    trend_indicators = {
        "current_ratio": _direction_indicator(cr_direction),
        "wc_cycle": _direction_indicator(wcc_direction, invert=True),
        "nwc": _direction_indicator(nwc_direction),
    }

    # Trend alerts
    trend_alerts: List[str] = []
    if cr_direction == "decreasing":
        trend_alerts.append("Declining liquidity → risk increasing")
    if wcc_direction == "decreasing":
        trend_alerts.append("Improving working capital cycle")
    elif wcc_direction == "increasing":
        trend_alerts.append("Working capital cycle is lengthening — higher funding requirement")
    if wcc_direction == "fluctuating" or cr_direction == "fluctuating":
        trend_alerts.append("Fluctuating financial performance")
    if nwc_direction == "decreasing":
        trend_alerts.append("Net working capital is shrinking — monitor liquidity")

    # Trend risk score
    trend_risk_score = 0
    for indicator in trend_indicators.values():
        if indicator["color"] == "red":
            trend_risk_score += 2
        elif indicator["color"] == "amber":
            trend_risk_score += 1

    if trend_risk_score >= 4:
        overall_trend = "🔴 High Risk Trend"
    elif trend_risk_score >= 2:
        overall_trend = "🟡 Moderate Risk"
    else:
        overall_trend = "🟢 Stable Trend"

    trend_analysis: Dict[str, Any] = {
        "years": years,
        "yearly_data": yearly_data,
        "revenue": rev_list,
        "profit": profit_list,
        "working_capital": wc_list,
        "wc_cycle": wcc_values,
        "metrics": {
            "revenue_growth": revenue_growth,
            "profit_growth": profit_growth,
            "wc_growth": wc_growth,
        },
        "trend_indicators": trend_indicators,
        "alerts": trend_alerts,
        "overall_trend": overall_trend,
        "trend_risk_score": trend_risk_score,
        "analysis": {
            "eligibility_status": eligibility_status,
            "summary": recommendation,
            "insights": insights,
        },
    }

    return MultiYearResult(
        company_name=data.company_name,
        input_data={"years_data": [yd.dict() for yd in data.years_data]},
        years=years,
        trends=trends,
        insights=insights,
        recommendation=recommendation,
        growth_trends=growth_trend_data,
        patterns=patterns_dict,
        growth_score=growth_score,
        trend_label=trend_label,
        trend_analysis=trend_analysis,
    )

# ===================== AI DOCUMENT PARSING =====================

def _build_extraction_prompt(document_type: str) -> str:
    """Return the extraction prompt for the given document type."""
    if document_type == "balance_sheet":
        return """Analyze this Balance Sheet document and extract the following financial values.
Return ONLY a valid JSON object with these exact keys (use 0 if value not found):
{
    "current_assets": <number>,
    "current_liabilities": <number>,
    "inventory": <number>,
    "debtors": <number>,
    "creditors": <number>,
    "cash_bank_balance": <number>
}
Return only the JSON object, no explanations or markdown."""
    elif document_type == "profit_loss":
        return """Analyze this Profit & Loss Statement document and extract the following financial values.
Return ONLY a valid JSON object with these exact keys (use 0 if value not found):
{
    "revenue": <number>,
    "cogs": <number>,
    "purchases": <number>,
    "operating_expenses": <number>,
    "net_profit": <number>
}
Return only the JSON object, no explanations or markdown."""
    elif document_type == "bank_statement":
        return """Analyze this Bank Statement document and extract the following financial values.
Look for total/aggregate credits (all money coming in), total/aggregate debits (all money going out),
average monthly balance, minimum balance recorded, opening balance and closing balance for the period,
cash/currency deposits (excluding cheque/NEFT/RTGS), number of cheque bounces or dishonoured cheques,
total loan or EMI repayment amounts, overdraft or OD utilization amount, ECS/NACH/EMI auto-debit total,
and total number of transactions.
Return ONLY a valid JSON object with these exact keys (use 0 if value not found):
{
    "total_credits": <number>,
    "total_debits": <number>,
    "average_balance": <number>,
    "minimum_balance": <number>,
    "opening_balance": <number>,
    "closing_balance": <number>,
    "cash_deposits": <number>,
    "cheque_bounces": <integer>,
    "loan_repayments": <number>,
    "overdraft_usage": <number>,
    "ecs_emi_payments": <number>,
    "num_transactions": <integer>
}
Return only the JSON object, no explanations or markdown."""
    elif document_type == "gstr":
        return """Analyze this GSTR-3B (GST Return) document and extract the following financial values.
Return ONLY a valid JSON object with these exact keys (use 0 if value not found, empty string for GSTIN if not found):
{
    "gstin": "<string>",
    "total_taxable_turnover": <number>,
    "igst_collected": <number>,
    "cgst_collected": <number>,
    "sgst_collected": <number>,
    "total_itc_available": <number>,
    "total_itc_utilized": <number>,
    "interest_paid": <number>
}
Return only the JSON object, no explanations or markdown."""
    elif document_type == "itr":
        return """Analyze this Income Tax Return (ITR) document and extract the following financial values.
Return ONLY a valid JSON object with these exact keys (use 0 if value not found):
{
    "taxable_income": <number>,
    "total_deductions": <number>,
    "net_tax_liability": <number>,
    "tax_due": <number>,
    "tds_deducted": <number>,
    "advance_tax_paid": <number>
}
Return only the JSON object, no explanations or markdown."""
    else:
        return """Analyze this financial document and extract ALL numerical financial data you can find.
Return ONLY a valid JSON object with descriptive keys matching the exact field names from the document.
Include all monetary values, ratios, and percentages with their natural names.
Return only the JSON object, no explanations or markdown."""


def _extract_json(response_text: str) -> Dict[str, Any]:
    """Extract a JSON object from the AI response text, handling markdown fences and nesting."""
    # Try the whole response directly
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences then retry
    cleaned = re.sub(r'```(?:json)?\s*', '', response_text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Walk characters to find the first balanced JSON object (handles nesting)
    brace_count = 0
    start = None
    for i, ch in enumerate(response_text):
        if ch == '{':
            if start is None:
                start = i
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0 and start is not None:
                return json.loads(response_text[start:i + 1])

    raise json.JSONDecodeError("No valid JSON object found in AI response", response_text, 0)


async def _parse_with_gemini(api_key: str, prompt: str, file_path: str, mime_type: str) -> str:
    """Call Gemini 2.5 Flash via the google-genai SDK and return raw response text."""
    import google.genai as genai
    from google.genai import types as genai_types

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    genai_client = genai.Client(api_key=api_key)
    response = await genai_client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            genai_types.Content(parts=[
                genai_types.Part(
                    inline_data=genai_types.Blob(mime_type=mime_type, data=file_bytes)
                ),
                genai_types.Part(text=prompt),
            ])
        ],
        config=genai_types.GenerateContentConfig(
            system_instruction="You are a financial document analysis expert. Extract precise numerical values from financial documents. Always return valid JSON only."
        ),
    )
    return response.text.strip()


async def _parse_with_openai(api_key: str, prompt: str, file_path: str, mime_type: str) -> str:
    """Call GPT-4o via the openai SDK and return raw response text.

    Only image MIME types are supported (jpeg, png, webp, gif).
    PDF and spreadsheet files are not supported through this path.
    """
    import base64
    from openai import AsyncOpenAI

    image_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if mime_type not in image_types:
        raise ValueError(
            f"OpenAI vision does not support '{mime_type}'. "
            "Set GEMINI_API_KEY for full PDF/spreadsheet support."
        )

    with open(file_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()

    data_url = f"data:{mime_type};base64,{encoded}"
    openai_client = AsyncOpenAI(api_key=api_key)
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": data_url}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    return response.choices[0].message.content.strip()


async def analyze_document_with_ai(file_path: str, mime_type: str, document_type: str) -> Dict[str, Any]:
    """Use AI Vision to extract financial data from uploaded documents.

    Provider is selected automatically from environment variables:
      GEMINI_API_KEY  → Gemini 2.5 Flash  (supports PDF, images, spreadsheets)
      OPENAI_API_KEY  → GPT-4o Vision     (images only)
    """
    response_text = ""
    try:
        provider, api_key = get_ai_config()

        if not api_key:
            logger.warning("No AI API key configured. Set AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY.")
            return {
                "success": False,
                "error": "No AI API key configured. Please set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY in your environment.",
                "parsed_data": {},
                "raw_text": response_text,
            }

        prompt = _build_extraction_prompt(document_type)

        if provider == "gemini":
            response_text = await _parse_with_gemini(api_key, prompt, file_path, mime_type)
        else:
            response_text = await _parse_with_openai(api_key, prompt, file_path, mime_type)

        logger.info(f"AI response ({provider}): {response_text[:500]}")

        parsed_data = _extract_json(response_text)
        return {"success": True, "parsed_data": parsed_data, "raw_text": response_text}

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return {
            "success": False,
            "error": "Could not parse AI response as JSON",
            "parsed_data": {},
            "raw_text": response_text,
        }
    except Exception as e:
        logger.error(f"AI document parse error: {e}")
        return {"success": False, "error": str(e), "parsed_data": {}}

# ===================== AI TEXT ANALYSIS =====================

async def _analyze_text_with_gemini(api_key: str, prompt: str) -> str:
    """Call Gemini 2.5 Flash with a text-only prompt and return raw response."""
    import google.genai as genai
    from google.genai import types as genai_types

    genai_client = genai.Client(api_key=api_key)
    response = await genai_client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[genai_types.Content(parts=[genai_types.Part(text=prompt)])],
        config=genai_types.GenerateContentConfig(
            system_instruction=(
                "You are a financial analysis expert. "
                "Provide structured financial assessments in JSON format only."
            )
        ),
    )
    return response.text.strip()


async def _analyze_text_with_openai(api_key: str, prompt: str) -> str:
    """Call GPT-4o with a text-only prompt and return raw response."""
    from openai import AsyncOpenAI

    openai_client = AsyncOpenAI(api_key=api_key)
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a financial analysis expert. "
                    "Provide structured financial assessments in JSON format only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content.strip()


def _rule_based_insights(normalized_data: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Generate basic insights without AI when no API key is configured."""
    insights = []
    strengths = []
    risks = []
    recommendations = []

    current_ratio = metrics.get("current_ratio")
    quick_ratio = metrics.get("quick_ratio")
    net_margin = metrics.get("net_margin")
    gross_margin = metrics.get("gross_margin")
    debt_to_equity = metrics.get("debt_to_equity")
    working_capital = metrics.get("working_capital")

    if current_ratio is not None:
        if current_ratio >= 2.0:
            strengths.append(f"Strong liquidity with current ratio of {current_ratio}x (above 2.0x)")
        elif current_ratio >= 1.33:
            strengths.append(f"Adequate liquidity with current ratio of {current_ratio}x (above 1.33x benchmark)")
        else:
            risks.append(f"Current ratio of {current_ratio}x is below the 1.33x benchmark — liquidity concern")
            recommendations.append("Improve short-term asset position to strengthen current ratio above 1.33x")

    if quick_ratio is not None:
        if quick_ratio >= 1.0:
            strengths.append(f"Healthy quick ratio of {quick_ratio}x")
        else:
            risks.append(f"Quick ratio of {quick_ratio}x suggests potential liquidity pressure excluding inventory")

    if net_margin is not None:
        if net_margin >= 10:
            strengths.append(f"Strong net profitability at {net_margin}%")
        elif net_margin >= 5:
            insights.append(f"Moderate net margin of {net_margin}% — room for improvement")
        elif net_margin > 0:
            risks.append(f"Low net margin of {net_margin}% — needs improvement")
            recommendations.append("Focus on cost reduction or revenue growth to improve net margins")
        else:
            risks.append("Negative net margin indicates operating at a loss")
            recommendations.append("Urgent review of cost structure and revenue streams required")

    if gross_margin is not None:
        if gross_margin >= 30:
            strengths.append(f"Strong gross margin of {gross_margin}%")
        elif gross_margin < 15:
            risks.append(f"Low gross margin of {gross_margin}% — high cost of goods")

    if debt_to_equity is not None:
        if debt_to_equity <= 1.0:
            strengths.append(f"Conservative leverage with debt-to-equity ratio of {debt_to_equity}x")
        elif debt_to_equity <= 2.0:
            insights.append(f"Moderate leverage with debt-to-equity ratio of {debt_to_equity}x")
        else:
            risks.append(f"High leverage with debt-to-equity ratio of {debt_to_equity}x")
            recommendations.append("Consider debt reduction strategy to improve financial stability")

    if working_capital is not None and working_capital > 0:
        strengths.append(f"Positive working capital of {working_capital:,.0f}")
    elif working_capital is not None and working_capital < 0:
        risks.append("Negative working capital — current liabilities exceed current assets")

    # Eligibility determination
    current_ratio_ok = current_ratio is not None and current_ratio >= 1.33
    margin_ok = net_margin is not None and net_margin >= 5
    if current_ratio_ok and margin_ok:
        eligibility_status = "Eligible"
    elif current_ratio_ok or margin_ok:
        eligibility_status = "Conditional"
    else:
        eligibility_status = "Not Eligible"

    summary = (
        f"Financial analysis indicates {eligibility_status.lower()} status. "
        f"{'Liquidity metrics meet benchmark. ' if current_ratio_ok else 'Liquidity below benchmark. '}"
        f"{'Profitability is satisfactory.' if margin_ok else 'Profitability requires improvement.'}"
    )

    # Confidence based on how many metrics are available and pass thresholds.
    # Baseline: 0.50 (50%) when no signals are present.
    # Each available metric adds 0.07 (7%), capped implicitly by the max of 5 signals → 0.85.
    _CONFIDENCE_BASELINE = 0.50
    _CONFIDENCE_PER_SIGNAL = 0.07
    confidence_signals = sum([
        current_ratio is not None,
        quick_ratio is not None,
        net_margin is not None,
        gross_margin is not None,
        working_capital is not None,
    ])
    confidence = round(_CONFIDENCE_BASELINE + confidence_signals * _CONFIDENCE_PER_SIGNAL, 2)

    return {
        "eligibility_status": eligibility_status,
        "summary": summary,
        "insights": insights or ["Financial data analyzed with available metrics."],
        "strengths": strengths or ["Financial data available for analysis."],
        "risks": risks or ["No major risks identified from available data."],
        "recommendations": recommendations or ["Continue monitoring key financial metrics regularly."],
        "confidence": confidence,
    }


async def generate_financial_insights(
    normalized_data: Dict[str, Any],
    metrics: Dict[str, Any],
    company_name: str = "the company",
) -> Dict[str, Any]:
    """
    Use AI (or rule-based fallback) to generate structured financial insights.

    Returns a dict with eligibility_status, summary, insights, strengths,
    risks, and recommendations.
    """
    provider, api_key = get_ai_config()

    if not api_key:
        logger.info("No AI key configured — using rule-based insights fallback.")
        return _rule_based_insights(normalized_data, metrics)

    # Build a clean payload for the prompt (exclude internal/zero fields)
    clean_normalized = {
        k: v for k, v in normalized_data.items()
        if not k.startswith("_") and v != 0
    }
    clean_metrics = {k: v for k, v in metrics.items() if v is not None}

    prompt = f"""You are a strict financial analysis engine. Analyze ONLY the data provided below.
Do NOT hallucinate or infer values not present in the data.
Do NOT include any text outside the JSON object.

=== FEW-SHOT EXAMPLES ===

Example 1 — Strong company:
Input metrics: current_ratio=2.1, quick_ratio=1.8, net_margin=12.5, debt_to_equity=0.4, working_capital=500000
Output:
{{
  "eligibility_status": "Eligible",
  "summary": "The company demonstrates strong liquidity with a current ratio of 2.1x and healthy net margins of 12.5%. Working capital is positive at ₹5,00,000, indicating sound short-term financial management. Low leverage ratio of 0.4x reflects conservative financing.",
  "insights": ["Strong liquidity position", "Healthy profit margins", "Low debt burden"],
  "strengths": ["Current ratio 2.1x exceeds 1.33x benchmark", "Net margin 12.5% reflects strong profitability"],
  "risks": ["No significant risks identified from available data"],
  "recommendations": ["Maintain current liquidity levels", "Consider strategic expansion given healthy margins"],
  "confidence": 0.88
}}

Example 2 — Weak company:
Input metrics: current_ratio=0.8, quick_ratio=0.6, net_margin=-3.2, debt_to_equity=3.1, working_capital=-200000
Output:
{{
  "eligibility_status": "Not Eligible",
  "summary": "The company faces significant financial stress with a current ratio of 0.8x, below the minimum 1.33x benchmark. Negative net margins of -3.2% indicate operating losses, and high leverage of 3.1x amplifies financial risk. Immediate corrective action is required.",
  "insights": ["Liquidity below minimum benchmark", "Operating at a loss", "High leverage risk"],
  "strengths": ["No major strengths identified from available data"],
  "risks": ["Current ratio 0.8x below 1.33x benchmark", "Negative net margin indicates losses", "High debt-to-equity of 3.1x"],
  "recommendations": ["Improve current asset position urgently", "Review cost structure to restore profitability", "Reduce debt exposure"],
  "confidence": 0.82
}}

=== ACTUAL ANALYSIS ===

Company: {company_name}

Normalized Financial Data (use ONLY these values):
{json.dumps(clean_normalized, indent=2)}

Calculated Metrics (use ONLY these values):
{json.dumps(clean_metrics, indent=2)}

Evaluate based strictly on the data above:
1. Liquidity position and working capital adequacy
2. Profitability and margin quality
3. Financial risk and debt levels
4. Overall financial health and eligibility for financing

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{{
  "eligibility_status": "Eligible" or "Conditional" or "Not Eligible",
  "summary": "Professional 3-5 sentence summary using ONLY the provided data",
  "insights": ["specific insight from data 1", "specific insight from data 2", "specific insight from data 3"],
  "strengths": ["specific strength from data 1", "specific strength from data 2"],
  "risks": ["specific risk from data 1", "specific risk from data 2"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
  "confidence": 0.0 to 1.0 based on data completeness and signal clarity
}}"""

    try:
        if provider == "gemini":
            response_text = await _analyze_text_with_gemini(api_key, prompt)
        else:
            response_text = await _analyze_text_with_openai(api_key, prompt)

        logger.info(f"AI insights response ({provider}): {response_text[:300]}")
        return _extract_json(response_text)
    except Exception as e:
        logger.error(f"AI insights generation error: {e} — falling back to rule-based")
        return _rule_based_insights(normalized_data, metrics)

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Financial Analytics API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    provider, key = get_ai_config()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ai_enabled": bool(key),
        "ai_provider": provider,
    }

# Document Parsing via Gemini Vision
@api_router.post("/parse/upload")
async def parse_uploaded_file(
    file: UploadFile = File(...),
    document_type: str = Form("balance_sheet")
):
    """Parse uploaded financial document using Gemini Vision AI"""
    try:
        file_content = await file.read()
        
        if len(file_content) == 0:
            return {"success": False, "message": "Empty file received"}
        
        # Determine mime type
        mime_type = file.content_type or "application/octet-stream"
        filename = file.filename or "document"
        
        # Map common extensions to mime types
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        mime_map = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'csv': 'text/csv',
        }
        if ext in mime_map:
            mime_type = mime_map[ext]
        
        logger.info(f"Parsing document: {filename}, size: {len(file_content)} bytes, type: {mime_type}, doc_type: {document_type}")
        
        # Save to temp file
        suffix = f".{ext}" if ext else ".tmp"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            result = await analyze_document_with_ai(tmp_path, mime_type, document_type)
        finally:
            os.unlink(tmp_path)

        if result.get("success"):
            parsed_data = result["parsed_data"]
            # Auto-detect type if requested, otherwise use provided type
            detected_type = (
                detect_document_type(parsed_data)
                if document_type == "auto"
                else document_type
            )
            # Normalize the extracted data to the standard schema
            normalized_data = normalize_financial_data(parsed_data)
            # Remove internal keys from the response
            clean_normalized = {
                k: v for k, v in normalized_data.items()
                if not k.startswith("_") and v != 0
            }
            return {
                "success": True,
                "parsed_data": parsed_data,
                "normalized_data": clean_normalized,
                "detected_type": detected_type,
                "message": "Document parsed successfully using AI Vision!",
            }
        else:
            return {
                "success": False,
                "parsed_data": {},
                "normalized_data": {},
                "detected_type": "unknown",
                "message": result.get("error", "Could not extract data from document."),
            }
        
    except Exception as e:
        logger.error(f"Upload parse error: {e}")
        return {
            "success": False,
            "parsed_data": {},
            "message": f"Error parsing document: {str(e)}"
        }

# Working Capital Analysis
@api_router.post("/analysis/wc", response_model=WorkingCapitalResult)
async def analyze_working_capital(data: WorkingCapitalInput):
    try:
        result = calculate_working_capital(data)
        return result
    except Exception as e:
        logger.error(f"WC Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Banking Analysis
@api_router.post("/analysis/banking", response_model=BankingResult)
async def analyze_banking(data: BankingInput):
    try:
        result = calculate_banking_score(data)
        return result
    except Exception as e:
        logger.error(f"Banking Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Multi-Year Trend Analysis
@api_router.post("/analysis/trend", response_model=MultiYearResult)
async def analyze_trends(data: MultiYearInput):
    try:
        result = calculate_multi_year_trends(data)

        # Generate AI insights for the multi-year data using the latest year's metrics.
        # Merge balance sheet and P&L dicts explicitly to avoid silent key overwrites.
        if result.growth_trends:
            latest_year = data.years_data[-1]
            bs_dict = latest_year.balance_sheet.dict()
            pl_dict = latest_year.profit_loss.dict()
            # Report any key overlap to the logger so it is visible in logs
            overlap = set(bs_dict) & set(pl_dict)
            if overlap:
                logger.warning("Balance sheet / P&L key overlap in multi-year AI merge: %s", overlap)
            combined_raw: Dict[str, Any] = {**bs_dict, **pl_dict}
            normalized = normalize_financial_data(combined_raw)
            latest_metrics = calculate_metrics(normalized)
            # Enrich metrics with growth context
            patterns = result.growth_trends.get("patterns", {})
            cagr = result.growth_trends.get("cagr", {})
            enriched_metrics = {
                **latest_metrics,
                "revenue_pattern": patterns.get("revenue"),
                "profit_pattern": patterns.get("net_profit"),
                "revenue_cagr_pct": cagr.get("revenue"),
                "profit_cagr_pct": cagr.get("net_profit"),
                "years_analyzed": len(data.years_data),
            }
            ai_analysis = await generate_financial_insights(
                normalized, enriched_metrics, company_name=data.company_name
            )
            result.ai_analysis = ai_analysis

        return result
    except Exception as e:
        logger.error(f"Trend Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# GST & ITR Analysis
@api_router.post("/analysis/gst-itr", response_model=GstItrResult)
async def analyze_gst_itr(data: GstItrInput):
    try:
        result = calculate_gst_itr(data)
        if db is not None:
            try:
                record = result.dict()
                await db.gst_itr_analyses.insert_one(record)
            except Exception as db_err:
                logger.warning(f"DB storage failed (non-fatal): {db_err}")
        return result
    except Exception as e:
        logger.error(f"GST & ITR analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Flexible Financial Analysis
@api_router.post("/analysis/financial", response_model=FinancialAnalysisResult)
async def analyze_financial(data: FlexibleFinancialInput):
    """
    Accept financial data with ANY field names, normalize automatically,
    calculate key metrics, generate AI-based insights, and store results.
    """
    try:
        # 1. Normalize
        normalized_data = normalize_financial_data(data.financial_data)

        # 2. Calculate metrics
        metrics = calculate_metrics(normalized_data)

        # 3. Generate AI insights (with rule-based fallback)
        analysis = await generate_financial_insights(
            normalized_data, metrics, company_name=data.company_name
        )

        # 4. Build result — extract confidence from analysis without mutating the dict
        clean_normalized = {
            k: v for k, v in normalized_data.items() if not k.startswith("_")
        }
        confidence = analysis.get("confidence")
        analysis_without_confidence = {k: v for k, v in analysis.items() if k != "confidence"}
        result = FinancialAnalysisResult(
            company_name=data.company_name,
            year=data.year,
            normalized_data=clean_normalized,
            metrics=metrics,
            analysis=analysis_without_confidence,
            confidence=confidence,
        )

        # 5. Store in database (non-fatal if DB unavailable)
        if db is not None:
            try:
                record = result.dict()
                record["raw_data"] = data.financial_data
                await db.financial_analyses.insert_one(record)
            except Exception as db_err:
                logger.warning(f"DB storage failed (non-fatal): {db_err}")

        return result

    except Exception as e:
        logger.error(f"Financial analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================== PDF EXPORT =====================

class PDFExportRequest(BaseModel):
    analysis_type: str  # "working_capital", "banking", "multi_year"
    data: Dict[str, Any]
    company_name: str = "Company"

@api_router.post("/export/pdf")
async def export_pdf(request: PDFExportRequest):
    """Generate PDF report from analysis results"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.colors import HexColor, black, white
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle', parent=styles['Title'],
            fontSize=22, spaceAfter=6, textColor=HexColor('#3b82f6'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'CustomSubtitle', parent=styles['Normal'],
            fontSize=11, spaceAfter=12, textColor=HexColor('#888899')
        )
        heading_style = ParagraphStyle(
            'CustomHeading', parent=styles['Heading2'],
            fontSize=14, spaceBefore=16, spaceAfter=8,
            textColor=HexColor('#3b82f6'), fontName='Helvetica-Bold'
        )
        body_style = ParagraphStyle(
            'CustomBody', parent=styles['Normal'],
            fontSize=10, spaceAfter=4, textColor=HexColor('#333333'),
            leading=14
        )
        metric_label_style = ParagraphStyle(
            'MetricLabel', parent=styles['Normal'],
            fontSize=9, textColor=HexColor('#666666')
        )
        metric_value_style = ParagraphStyle(
            'MetricValue', parent=styles['Normal'],
            fontSize=12, fontName='Helvetica-Bold', textColor=HexColor('#111111')
        )
        
        elements = []
        data = request.data
        
        # Header
        elements.append(Paragraph("FINANCIAL ANALYTICS", ParagraphStyle('Brand', parent=styles['Normal'], fontSize=9, textColor=HexColor('#3b82f6'), spaceAfter=2)))
        
        if request.analysis_type == "working_capital":
            elements.append(Paragraph("Working Capital Analysis Report", title_style))
            elements.append(Paragraph(f"Company: {request.company_name} | Generated: {datetime.utcnow().strftime('%d %B %Y')}", subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0'), spaceAfter=12))
            
            # Key Metrics Table
            elements.append(Paragraph("Key Financial Ratios", heading_style))
            metrics_data = [
                ["Metric", "Value", "Benchmark", "Status"],
                ["Current Ratio", f"{data.get('current_ratio', 0):.2f}x", "≥ 1.33x", "Pass" if data.get('current_ratio', 0) >= 1.33 else "Fail"],
                ["Quick Ratio", f"{data.get('quick_ratio', 0):.2f}x", "≥ 1.00x", "Pass" if data.get('quick_ratio', 0) >= 1.0 else "Fail"],
                ["Debtor Days", f"{data.get('debtor_days', 0):.0f} days", "< 90 days", "Pass" if data.get('debtor_days', 0) < 90 else "Fail"],
                ["Creditor Days", f"{data.get('creditor_days', 0):.0f} days", "< 90 days", "Pass" if data.get('creditor_days', 0) < 90 else "Fail"],
                ["WC Cycle", f"{data.get('wc_cycle', 0):.0f} days", "< 90 days", "Pass" if data.get('wc_cycle', 0) < 90 else "Fail"],
                ["Gross Margin", f"{data.get('gross_margin', 0):.1f}%", "> 20%", "Pass" if data.get('gross_margin', 0) > 20 else "Review"],
                ["Net Margin", f"{data.get('net_margin', 0):.1f}%", "> 5%", "Pass" if data.get('net_margin', 0) > 5 else "Review"],
            ]
            
            t = Table(metrics_data, colWidths=[120, 100, 100, 80])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f9fa')]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 12))
            
            # MPBF Section
            elements.append(Paragraph("MPBF & WC Limit Assessment", heading_style))
            mpbf_data = [
                ["Method", "Amount (₹)"],
                ["MPBF Method I (75% of NWC)", f"₹{data.get('mpbf_method_1', 0):,.0f}"],
                ["MPBF Method II (75% CA - CL)", f"₹{data.get('mpbf_method_2', 0):,.0f}"],
                ["20% Turnover Method", f"₹{data.get('turnover_method', 0):,.0f}"],
                ["Recommended WC Limit", f"₹{data.get('wc_limit', 0):,.0f}"],
            ]
            t2 = Table(mpbf_data, colWidths=[250, 150])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#10b981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), HexColor('#ecfdf5')),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(t2)
            elements.append(Spacer(1, 12))
            
            # Eligibility
            eligible = data.get('eligible', False)
            status_text = "ELIGIBLE FOR WC FINANCING" if eligible else "NOT ELIGIBLE FOR WC FINANCING"
            status_color = '#10b981' if eligible else '#ef4444'
            elements.append(Paragraph(f'<font color="{status_color}" size="14"><b>{status_text}</b></font>', body_style))
            elements.append(Spacer(1, 8))
            
            # Assessment
            elements.append(Paragraph("Assessment Points", heading_style))
            for point in data.get('assessment', []):
                elements.append(Paragraph(f"• {point}", body_style))
            
            # Recommendation
            elements.append(Paragraph("Recommendation", heading_style))
            elements.append(Paragraph(data.get('recommendation', ''), body_style))
            
        elif request.analysis_type == "banking":
            elements.append(Paragraph("Banking Performance Report", title_style))
            elements.append(Paragraph(f"Company: {request.company_name} | Generated: {datetime.utcnow().strftime('%d %B %Y')}", subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0'), spaceAfter=12))
            
            # Credit Score
            grade = data.get('grade', 'N/A')
            score = data.get('credit_score', 0)
            risk = data.get('risk_level', 'N/A')
            elements.append(Paragraph(f"Credit Score: {score}/100 | Grade: {grade} | Risk: {risk}", ParagraphStyle('Score', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', textColor=HexColor('#3b82f6'), spaceAfter=12)))
            
            # Component Scores
            elements.append(Paragraph("Component Score Breakdown", heading_style))
            score_data = [
                ["Component", "Score", "Weight", "Weighted"],
                ["Liquidity", f"{data.get('liquidity_score', 0)}%", "15%", f"{data.get('liquidity_score', 0) * 0.15:.1f}"],
                ["Cash Flow", f"{data.get('cash_flow_score', 0)}%", "25%", f"{data.get('cash_flow_score', 0) * 0.25:.1f}"],
                ["Credit", f"{data.get('credit_score_component', 0)}%", "25%", f"{data.get('credit_score_component', 0) * 0.25:.1f}"],
                ["Repayment", f"{data.get('repayment_score', 0)}%", "20%", f"{data.get('repayment_score', 0) * 0.20:.1f}"],
                ["Stability", f"{data.get('stability_score', 0)}%", "15%", f"{data.get('stability_score', 0) * 0.15:.1f}"],
            ]
            t = Table(score_data, colWidths=[120, 80, 80, 80])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#10b981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f9fa')]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 12))
            
            # Status Grid
            elements.append(Paragraph("Status Assessment", heading_style))
            status_data = [
                ["Area", "Status"],
                ["Working Capital", data.get('working_capital_status', 'N/A')],
                ["Liquidity", data.get('liquidity_status', 'N/A')],
                ["Cash Flow", data.get('cash_flow_status', 'N/A')],
                ["Creditworthiness", data.get('creditworthiness_status', 'N/A')],
                ["Repayment", data.get('repayment_status', 'N/A')],
                ["Stability", data.get('stability_status', 'N/A')],
                ["Behavior", data.get('behavior_status', 'N/A')],
            ]
            t2 = Table(status_data, colWidths=[200, 200])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f9fa')]),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(t2)
            elements.append(Spacer(1, 12))
            
            # Strengths & Concerns
            elements.append(Paragraph("Strengths", heading_style))
            for s in data.get('strengths', []):
                elements.append(Paragraph(f"✓ {s}", body_style))
            
            elements.append(Paragraph("Concerns", heading_style))
            for c in data.get('concerns', []):
                elements.append(Paragraph(f"⚠ {c}", body_style))
            
            elements.append(Paragraph("Recommendation", heading_style))
            elements.append(Paragraph(data.get('recommendation', ''), body_style))
            
        elif request.analysis_type == "multi_year":
            elements.append(Paragraph("Multi-Year Trend Analysis Report", title_style))
            elements.append(Paragraph(f"Company: {request.company_name} | Generated: {datetime.utcnow().strftime('%d %B %Y')}", subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0'), spaceAfter=12))
            
            years = data.get('years', [])
            trends = data.get('trends', {})
            
            if years and trends:
                elements.append(Paragraph("Financial Trends", heading_style))
                
                header_row = ["Metric"] + [f"FY {y}" for y in years]
                trend_rows = [header_row]
                
                if 'revenue' in trends:
                    trend_rows.append(["Revenue"] + [f"₹{v:,.0f}" for v in trends['revenue']])
                if 'net_profit' in trends:
                    trend_rows.append(["Net Profit"] + [f"₹{v:,.0f}" for v in trends['net_profit']])
                if 'current_ratio' in trends:
                    trend_rows.append(["Current Ratio"] + [f"{v:.2f}x" for v in trends['current_ratio']])
                if 'net_working_capital' in trends:
                    trend_rows.append(["Net WC"] + [f"₹{v:,.0f}" for v in trends['net_working_capital']])
                if 'gross_margin' in trends:
                    trend_rows.append(["Gross Margin"] + [f"{v:.1f}%" for v in trends['gross_margin']])
                if 'net_margin' in trends:
                    trend_rows.append(["Net Margin"] + [f"{v:.1f}%" for v in trends['net_margin']])
                
                col_width = 400 // (len(years) + 1)
                t = Table(trend_rows, colWidths=[120] + [col_width] * len(years))
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#8b5cf6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f9fa')]),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(t)
                elements.append(Spacer(1, 12))
            
            # Insights
            elements.append(Paragraph("Key Insights", heading_style))
            for insight in data.get('insights', []):
                elements.append(Paragraph(f"• {insight}", body_style))
            
            elements.append(Paragraph("Recommendation", heading_style))
            elements.append(Paragraph(data.get('recommendation', ''), body_style))
        
        # Footer
        elements.append(Spacer(1, 24))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#cccccc'), spaceAfter=6))
        elements.append(Paragraph("Generated by Financial Analytics Platform", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=HexColor('#999999'), alignment=TA_CENTER)))
        
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"{request.company_name}_{request.analysis_type}_report.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
        
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

# ===================== CASES CRUD =====================

@api_router.post("/cases", response_model=Case)
async def save_case(case: Case):
    try:
        case_dict = case.dict()
        case_dict['timestamp'] = datetime.utcnow()
        await db.cases.insert_one(case_dict)
        return case
    except Exception as e:
        logger.error(f"Save case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cases", response_model=List[Case])
async def get_cases():
    try:
        cases = await db.cases.find().sort("timestamp", -1).to_list(100)
        return [Case(**c) for c in cases]
    except Exception as e:
        logger.error(f"Get cases error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str):
    try:
        case = await db.cases.find_one({"id": case_id})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        return Case(**case)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    try:
        result = await db.cases.delete_one({"id": case_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        return {"message": "Case deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete case error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    try:
        total_cases = await db.cases.count_documents({})
        wc_count = await db.cases.count_documents({"analysis_type": "working_capital"})
        banking_count = await db.cases.count_documents({"analysis_type": "banking"})
        trend_count = await db.cases.count_documents({"analysis_type": "multi_year"})
        
        recent_cases = await db.cases.find().sort("timestamp", -1).limit(5).to_list(5)
        
        return {
            "total_cases": total_cases,
            "wc_analysis_count": wc_count,
            "banking_count": banking_count,
            "multi_year_count": trend_count,
            "recent_cases": [Case(**c).dict() for c in recent_cases]
        }
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================== HEALTH CHECK =====================

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment validation"""
    try:
        # Check if database is accessible (optional for health check)
        if db:
            await db.command("ping")
            db_status = "connected"
        else:
            db_status = "not initialized"
        
        return {
            "status": "healthy",
            "database": db_status,
            "service": "Financial Analytics API",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.warning(f"Health check - DB ping failed: {e}")
        return {
            "status": "degraded",
            "database": "unavailable",
            "service": "Financial Analytics API",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "warning": str(e)
        }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
