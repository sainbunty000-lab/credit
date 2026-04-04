"""
financial_calculator.py
-----------------------
Financial metrics calculation engine.

Computes key ratios and indicators from normalized financial data produced
by ``financial_mapper.normalize_financial_data``.
"""

from typing import Any, Dict, List, Optional


def _safe_div(numerator: float, denominator: float) -> Optional[float]:
    """Return numerator / denominator, or None when denominator is zero."""
    if denominator == 0:
        return None
    return numerator / denominator


def calculate_metrics(normalized: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate key financial metrics from a normalized financial data dict.

    Parameters
    ----------
    normalized : dict
        Output of ``financial_mapper.normalize_financial_data``.

    Returns
    -------
    dict
        Metrics dict. Values are ``None`` for any metric that cannot be
        computed due to missing / zero input data.
    """
    ca = float(normalized.get("current_assets") or 0)
    cl = float(normalized.get("current_liabilities") or 0)
    inventory = float(normalized.get("inventory") or 0)
    receivables = float(normalized.get("receivables") or 0)
    payables = float(normalized.get("payables") or 0)
    cash = float(normalized.get("cash") or 0)
    equity = float(normalized.get("equity") or 0)
    total_liabilities = float(normalized.get("total_liabilities") or 0)
    revenue = float(normalized.get("revenue") or 0)
    cogs = float(normalized.get("cogs") or 0)
    gross_profit = float(normalized.get("gross_profit") or 0)
    ebitda = float(normalized.get("ebitda") or 0)
    net_profit = float(normalized.get("net_profit") or 0)
    interest = float(normalized.get("interest") or 0)
    depreciation = float(normalized.get("depreciation") or 0)

    # Derive gross_profit if not supplied
    if gross_profit == 0.0 and revenue > 0 and cogs > 0:
        gross_profit = revenue - cogs

    # Derive EBITDA if not supplied: Net Profit + Interest + D&A
    if ebitda == 0.0 and net_profit != 0.0:
        ebitda = net_profit + interest + depreciation

    # ── Liquidity ────────────────────────────────────────────────────
    working_capital = ca - cl
    current_ratio = _safe_div(ca, cl)
    quick_ratio = _safe_div(ca - inventory, cl)
    cash_ratio = _safe_div(cash, cl)

    # ── Leverage ─────────────────────────────────────────────────────
    debt_to_equity = _safe_div(total_liabilities, equity)

    # ── Profitability ────────────────────────────────────────────────
    gross_margin = _safe_div(gross_profit * 100, revenue)
    net_margin = _safe_div(net_profit * 100, revenue)
    ebitda_margin = _safe_div(ebitda * 100, revenue) if ebitda != 0 else None
    return_on_equity = _safe_div(net_profit * 100, equity)

    # Activity ─────────────────────────────────────────────────────────
    debtor_days = _safe_div(receivables * 365, revenue)
    if cogs > 0:
        creditor_days = _safe_div(payables * 365, cogs)
    elif revenue > 0:
        creditor_days = _safe_div(payables * 365, revenue)
    else:
        creditor_days = None
    inventory_days = _safe_div(inventory * 365, cogs) if cogs > 0 else None
    inventory_turnover = _safe_div(cogs, inventory) if inventory > 0 else None

    # Working capital cycle
    if debtor_days is not None and inventory_days is not None and creditor_days is not None:
        wc_cycle = debtor_days + inventory_days - creditor_days
    else:
        wc_cycle = None

    def _r(val: Optional[float], decimals: int = 2) -> Optional[float]:
        return round(val, decimals) if val is not None else None

    return {
        "working_capital": _r(working_capital, 0),
        "current_ratio": _r(current_ratio),
        "quick_ratio": _r(quick_ratio),
        "cash_ratio": _r(cash_ratio),
        "debt_to_equity": _r(debt_to_equity),
        "gross_margin": _r(gross_margin, 1),
        "net_margin": _r(net_margin, 1),
        "ebitda_margin": _r(ebitda_margin, 1),
        "return_on_equity": _r(return_on_equity, 1),
        "debtor_days": _r(debtor_days, 0),
        "creditor_days": _r(creditor_days, 0),
        "inventory_days": _r(inventory_days, 0),
        "inventory_turnover": _r(inventory_turnover),
        "wc_cycle": _r(wc_cycle, 0),
    }


def calculate_growth_trends(years_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Given a list of per-year metric dicts (oldest first), compute
    year-over-year growth rates and detect patterns.

    Parameters
    ----------
    years_metrics : list of dict
        Each element is the output of ``calculate_metrics`` for one year.

    Returns
    -------
    dict with keys:
        ``yoy_growth``  – metric → list of YoY % changes
        ``cagr``        – metric → CAGR over the full period (%)
        ``patterns``    – metric → one of
                          ``"growing" | "declining" | "stable" | "volatile"``
    """
    if len(years_metrics) < 2:
        return {"yoy_growth": {}, "cagr": {}, "patterns": {}}

    tracked = [
        "revenue", "net_profit", "current_ratio",
        "gross_margin", "net_margin", "working_capital",
    ]

    # Growth rate swing above this percentage is considered volatile
    VOLATILITY_THRESHOLD = 50

    yoy_growth: Dict[str, list] = {m: [] for m in tracked}
    cagr: Dict[str, Optional[float]] = {}
    patterns: Dict[str, str] = {}

    n = len(years_metrics)

    for metric in tracked:
        values = [ym.get(metric) for ym in years_metrics]
        valid = [(i, v) for i, v in enumerate(values) if v is not None]

        if len(valid) < 2:
            yoy_growth[metric] = []
            cagr[metric] = None
            patterns[metric] = "insufficient_data"
            continue

        # Year-over-year growth rates
        growth_rates: List[Optional[float]] = []
        for j in range(1, len(valid)):
            _, prev = valid[j - 1]
            _, curr = valid[j]
            if prev != 0:
                growth_rates.append(round((curr - prev) / abs(prev) * 100, 1))
            else:
                growth_rates.append(None)
        yoy_growth[metric] = growth_rates

        # Compound Annual Growth Rate (CAGR)
        first_val = valid[0][1]
        last_val = valid[-1][1]
        periods = valid[-1][0] - valid[0][0]
        if first_val > 0 and last_val > 0 and periods > 0:
            cagr[metric] = round(((last_val / first_val) ** (1 / periods) - 1) * 100, 1)
        else:
            cagr[metric] = None

        # Pattern detection
        valid_rates = [r for r in growth_rates if r is not None]
        if not valid_rates:
            patterns[metric] = "insufficient_data"
        else:
            positive = sum(1 for r in valid_rates if r > 0)
            negative = sum(1 for r in valid_rates if r < 0)
            max_swing = max(valid_rates) - min(valid_rates)
            if positive == len(valid_rates):
                patterns[metric] = "growing"
            elif negative == len(valid_rates):
                patterns[metric] = "declining"
            elif max_swing > VOLATILITY_THRESHOLD:
                patterns[metric] = "volatile"
            else:
                patterns[metric] = "stable"

    return {
        "yoy_growth": yoy_growth,
        "cagr": cagr,
        "patterns": patterns,
    }
