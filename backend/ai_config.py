import os
import logging

logger = logging.getLogger(__name__)


def get_ai_config():
    """
    Detect the available AI provider from environment variables.

    Priority order:
        1. AI_INTEGRATIONS_GEMINI_API_KEY (Railway - PRIMARY)
        2. GEMINI_API_KEY                 (fallback)
        3. OPENAI_API_KEY                 (optional fallback)

    Returns:
        (provider_name, api_key)
    """

    # ✅ STRICT & CLEAR priority (no confusion)
    gemini_key = os.getenv("AI_INTEGRATIONS_GEMINI_API_KEY", "").strip()

    if not gemini_key:
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    # ✅ Provider selection
    if gemini_key:
        return "gemini", gemini_key

    if openai_key:
        return "openai", openai_key

    return None, None


def log_ai_status():
    """
    Print and log the detected AI provider.
    Call this once at app startup.
    """
    provider, key = get_ai_config()

    print("🔍 AI DEBUG ------------------------")
    print(f"Provider: {provider}")
    print(f"Key Loaded: {bool(key)}")
    print("-----------------------------------")

    if not key:
        logger.warning("⚠️ No AI API key configured!")
    else:
        logger.info("AI Provider: %s | Key Loaded: %s", provider, bool(key))
