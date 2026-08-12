# PayPilot — Autonomous USDC Payment Agent for Base

**PayPilot** is an autonomous payment agent for **Base** (Base Sepolia testnet) that enables AI agents to pay for digital services and APIs using USDC micropayments via the official **x402 V2 Protocol**, strictly governed by user-defined spending limits.

Built for the **Base Builder Grant** (Track: *Agents / Agentic Commerce*).

---

## ⚡ Core Concept & Workflow

```
User → Connect Base Wallet → Set Daily / Per-Payment Limits
        ↓
User submits task to AI Agent (e.g. "Fetch market summary data")
        ↓
Agent calls paid endpoint: GET /api/paid/market-summary ($0.01 USDC)
        ↓
Server responds: HTTP 402 Payment Required + PAYMENT-REQUIRED Header (x402 V2)
        ↓
PayPilot PolicyEngine validates server terms against spending limits
        ↓
Agent signs x402 payment payload → PAYMENT-SIGNATURE Header
        ↓
Server / Facilitator verifies & settles payment on Base Sepolia (eip155:84532)
        ↓
Server returns: HTTP 200 OK + PAYMENT-RESPONSE Header + Market Data Payload
```

---

## 🔒 Security & Testnet Safety Principles

- **TESTNET ONLY**: Configured exclusively for **Base Sepolia** (`eip155:84532`).
- **Chain Safety Guard**: Application-level network safety checks immediately fail closed if configured on non-Sepolia networks.
- **USDC Asset**: Official Circle USDC on Base Sepolia (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).
- **Key Isolation**: User private keys never leave the browser. Server API keys (`OPENAI_API_KEY`, `AGENT_PRIVATE_KEY`) remain strictly server-side in `.env.local`.
- **No Fake Data**: DAU, WAU, and testnet USDC volume counters are computed exclusively from verified testnet transactions. Unconfigured recipients display **"Not configured"** safely.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```env
# Base Sepolia Network & Token
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_CHAIN_ID="84532"
NEXT_PUBLIC_USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# Payment Recipient Configuration (Required for receiving testnet USDC payments)
PAYPILOT_PAYMENT_RECIPIENT="0xYourBaseSepoliaWalletAddressHere"

# AI Provider Configuration
OPENAI_API_KEY="sk-proj-your-openai-api-key"
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run automated test suite (7 unit tests covering x402 402 challenges & safety)
npm test

# Run Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing the Paid Service (Phase 3)

1. **HTTP 402 Challenge Test**:
   ```bash
   curl -i http://localhost:3000/api/paid/market-summary
   ```
   *Response*: `HTTP/1.1 402 Payment Required` + `PAYMENT-REQUIRED: <base64>` header.

2. **Dashboard Interactive Tester**:
   - Navigate to the SaaS Dashboard.
   - Click **"Test 402 Challenge"** in the x402 Paid API Card to inspect the decoded `PAYMENT-REQUIRED` payload.

---

## 📄 Grant Evidence Page

Navigate to the **Grant Evidence** tab in the top navigation bar to view verifiable product facts:
- Track: Agents / Agentic Commerce
- Base Sepolia USDC Contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Live Onboarded Users, DAU, WAU, and Verified Testnet Volume counters with source attestations.

# paypilot
