#!/usr/bin/env python3
"""
Drive the CoinRithm trading MCP server from Gemini.

Paper trading only — virtual funds (50,000 mUSD). Not financial advice.

The google-genai SDK can call MCP servers as tools. This example launches the
stdio MCP server in packages/mcp-trading and hands its session to Gemini, which
then calls whoami / get_portfolio / place_spot_order etc. on your behalf.

Prereqs:
    pip install google-genai mcp
    # build the server first:
    #   cd packages/mcp-trading && npm install && npm run build

Env:
    GEMINI_API_KEY       your Google AI Studio key (for the model)
    COINRITHM_API_KEY    your crk_live_... CoinRithm key (for the tools)
    COINRITHM_API_URL    optional, defaults to https://api.coinrithm.com

Run:
    python gemini-mcp.py "Call whoami, then show my CoinRithm portfolio."
"""

import asyncio
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Path to the built stdio server entrypoint.
SERVER_ENTRY = (
    Path(__file__).resolve().parent.parent
    / "packages"
    / "mcp-trading"
    / "dist"
    / "index.js"
)

SYSTEM_PROMPT = (
    "You operate the user's CoinRithm PAPER-trading account (virtual funds, "
    "50,000 mUSD; cash coin USDT). This is NOT financial advice and never "
    "touches real money. Call whoami first, then ground decisions in "
    "get_portfolio / get_wallet. Quote before opening (futures_quote / pm_quote, "
    "both read-only). CONFIRM with the user before any write. Leverage <= 20x; "
    "PM stake >= 10 mUSD; never exceed available balance. coinId is a UCID, not a "
    "ticker. Futures-open and PM-open are currently server-disabled (403)."
)


async def main(user_prompt: str) -> None:
    if not os.environ.get("COINRITHM_API_KEY"):
        sys.exit("Set COINRITHM_API_KEY (your crk_live_... key).")
    if not SERVER_ENTRY.exists():
        sys.exit(
            f"Built server not found at {SERVER_ENTRY}. "
            "Run: cd packages/mcp-trading && npm install && npm run build"
        )

    client = genai.Client()  # reads GEMINI_API_KEY

    server_params = StdioServerParameters(
        command="node",
        args=[str(SERVER_ENTRY)],
        # Pass the CoinRithm key (and optional base URL) through to the MCP server.
        env={
            "COINRITHM_API_KEY": os.environ["COINRITHM_API_KEY"],
            "COINRITHM_API_URL": os.environ.get(
                "COINRITHM_API_URL", "https://api.coinrithm.com"
            ),
            "PATH": os.environ.get("PATH", ""),
        },
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0,
                    # The SDK auto-discovers the MCP server's tools from the session.
                    tools=[session],
                ),
            )
            print(response.text)


if __name__ == "__main__":
    prompt = " ".join(sys.argv[1:]) or "Call whoami, then summarize my CoinRithm portfolio."
    asyncio.run(main(prompt))
