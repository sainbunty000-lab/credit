"""
financial_mapper.py
-------------------
Data normalization layer for financial statements.

Maps varied field names to a standard schema and cleans numeric values.
Supports Balance Sheets, Profit & Loss statements, and combined documents.
"""

import re
from typing import Any, Dict

# Standard schema field definitions with all known synonyms.
# Keys are the canonical (standard) field names.
# Values are lists of aliases (all lowercase, underscore-separated).
FIELD_SYNONYMS: Dict[str, list] = {
    # ── Balance Sheet ─────────────────────────────────────────────────
    "current_assets": [
        "current_assets", "total_current_assets", "ca",
        "current assets", "total current assets",
    ],
    "current_liabilities": [
        "current_liabilities", "total_current_liabilities", "cl",
        "current liabilities", "total current liabilities",
    ],
    "inventory": [
        "inventory", "inventories", "stock", "closing_stock",
        "closing stock", "raw_materials", "finished_goods",
    ],
    "receivables": [
        "receivables", "debtors", "accounts_receivable",
        "trade_receivables", "sundry_debtors", "trade debtors",
        "debtors_receivables", "bills_receivable",
    ],
    "payables": [
        "payables", "creditors", "accounts_payable",
        "trade_payables", "sundry_creditors", "trade creditors",
        "bills_payable",
    ],
    "cash": [
        "cash", "cash_bank_balance", "cash_and_bank",
        "cash_and_cash_equivalents", "cash & bank", "bank_balance",
        "bank balance", "cash and bank balances",
    ],
    "fixed_assets": [
        "fixed_assets", "net_fixed_assets", "property_plant_equipment",
        "ppe", "non_current_assets", "tangible_assets",
        "net block", "net_block",
    ],
    "equity": [
        "equity", "shareholders_equity", "net_worth", "owners_equity",
        "capital_and_reserves", "share_capital_and_reserves",
        "stockholders_equity", "net worth",
    ],
    "total_assets": [
        "total_assets", "assets_total", "total assets",
    ],
    "total_liabilities": [
        "total_liabilities", "liabilities_total", "total liabilities",
        "total_debt", "total debt",
    ],
    # ── Profit & Loss ─────────────────────────────────────────────────
    "revenue": [
        "revenue", "sales", "total_revenue", "net_sales", "turnover",
        "gross_revenue", "income_from_operations", "net revenue",
        "total sales", "gross sales",
    ],
    "cogs": [
        "cogs", "cost_of_goods_sold", "cost_of_sales",
        "direct_costs", "cost_of_revenue", "cost of goods sold",
        "cost of sales",
    ],
    "gross_profit": [
        "gross_profit", "gross_income", "gross profit",
    ],
    "expenses": [
        "expenses", "operating_expenses", "total_expenses", "opex",
        "selling_general_admin", "sga", "overheads",
        "operating expenses", "total expenses",
    ],
    "ebitda": [
        "ebitda",
        "earnings_before_interest_taxes_depreciation_amortization",
        "operating_profit",
    ],
    "net_profit": [
        "net_profit", "net_income", "profit_after_tax", "pat",
        "net_earnings", "profit_for_year", "profit after tax",
        "net income", "net profit after tax",
    ],
    "interest": [
        "interest", "interest_expense", "finance_costs",
        "finance_charges", "interest expense",
    ],
    "tax": [
        "tax", "income_tax", "tax_expense", "provision_for_tax",
        "income tax expense",
    ],
    "depreciation": [
        "depreciation", "depreciation_and_amortization", "da",
        "amortization",
    ],
    "purchases": [
        "purchases", "cost_of_purchases", "raw_material_consumed",
        "material cost",
    ],
}

# Build a reverse lookup: alias → canonical field name.
_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for _canonical, _aliases in FIELD_SYNONYMS.items():
    for _alias in _aliases:
        _ALIAS_TO_CANONICAL[_alias.lower().replace(" ", "_")] = _canonical
        _ALIAS_TO_CANONICAL[_alias.lower()] = _canonical


def _normalize_key(key: str) -> str:
    """Lowercase, strip, replace spaces/hyphens with underscores."""
    return key.lower().strip().replace(" ", "_").replace("-", "_")


def clean_numeric(value: Any) -> float:
    """Convert a value to float, stripping currency symbols and commas."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    # Remove currency symbols, commas, whitespace
    cleaned = re.sub(r"[₹$€£,\s]", "", str(value))
    # Convert bracket notation to negative: (1234) → -1234
    cleaned = re.sub(r"^\((.+)\)$", r"-\1", cleaned)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def normalize_financial_data(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map arbitrary field names in *raw* to the standard schema.

    Returns a dict with canonical field names set to their numeric values.
    Unknown fields are preserved under ``_unmapped`` so no data is lost.
    Derived fields (e.g. gross_profit) are inferred when missing.
    """
    normalized: Dict[str, Any] = {k: 0.0 for k in FIELD_SYNONYMS}
    unmapped: Dict[str, Any] = {}

    for key, value in raw.items():
        norm_key = _normalize_key(key)
        canonical = _ALIAS_TO_CANONICAL.get(norm_key) or _ALIAS_TO_CANONICAL.get(key.lower())
        if canonical:
            numeric = clean_numeric(value)
            # Keep first non-zero value to avoid overwriting with zeros
            if numeric != 0.0 or normalized.get(canonical, 0.0) == 0.0:
                normalized[canonical] = numeric
        else:
            unmapped[key] = value

    # Derive gross_profit when revenue and cogs are both available
    if normalized["gross_profit"] == 0.0 and normalized["revenue"] > 0 and normalized["cogs"] > 0:
        normalized["gross_profit"] = normalized["revenue"] - normalized["cogs"]

    if unmapped:
        normalized["_unmapped"] = unmapped

    return normalized


def detect_document_type(raw: Dict[str, Any]) -> str:
    """
    Guess whether the raw dict represents a Balance Sheet, P&L, or both.

    Returns one of: ``"balance_sheet"``, ``"profit_loss"``,
    ``"combined"``, or ``"unknown"``.
    """
    norm = normalize_financial_data(raw)
    has_bs = any(
        norm.get(f, 0) != 0
        for f in ["current_assets", "current_liabilities", "equity", "fixed_assets"]
    )
    has_pl = any(
        norm.get(f, 0) != 0
        for f in ["revenue", "net_profit", "cogs", "gross_profit"]
    )
    if has_bs and has_pl:
        return "combined"
    if has_bs:
        return "balance_sheet"
    if has_pl:
        return "profit_loss"
    return "unknown"
