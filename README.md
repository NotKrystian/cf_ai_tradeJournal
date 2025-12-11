# cf_ai_tradeJournal

Trading journal for traders to improve their trading skills and educate traders on common mistakes they make.

Both the database and AI are saved remotely on cloudflare workers.

**API**

How to test:

Open https://app.k-kasperski.workers.dev to confirm the project is live.

List Trades :

https://app.k-kasperski.workers.dev/trades

Add a trade:

```

curl -X POST "https://app.k-kasperski.workers.dev/trades" \
  -H "Content-Type: application/json" \
  -d '{
    "enteredAt": "2025-12-11T13:45:00Z",
    "reasonOpen": "0DTE SPY call, power-hour momentum",
    "exitedAt": "2025-12-11T13:55:00Z",
    "reasonClose": "Hit 50% target",
    "outcome": "win",
    "percentRisked": 1,
    "percentReturn": 2.5
  }'
```

Example return:
```
{"success":true}
```

Analyze all trades:

```
curl -X POST "https://app.k-kasperski.workers.dev/analyze" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Main system is 0DTE SPY calls in power hour only."}'
```

Example return:
```
{"analysis":"Based on the trading journal, here's the analysis:\n\n**1. Key good habits observed:**\n\n* The trader has a clear system and sticks to it (0DTE SPY momentum trading).\n* They have a defined risk management strategy (targeting 50% profit).\n\n**2. Key mistakes/leaks:**\n\n* The trader is taking large positions (50% risked in Trade #2) despite the system being designed for smaller risks.\n* There is a lack of diversification, as both trades were entered simultaneously.\n\n**3. Likely psychological or process causes:**\n\n* Overconfidence: The trader may be getting complacent with their winning streak and taking on too much risk.\n* Lack of discipline: The trader may be failing to adhere to their own system's risk management guidelines.\n\n**4. Top 3 concrete changes to make:**\n\n1. Reduce position size: Limit risk to 1% or less to maintain a more conservative approach.\n2. Diversify trades: Enter trades individually, rather than simultaneously, to manage risk and increase potential for multiple wins.\n3. Stick to system: Avoid overthinking and stick to the defined system, including risk management guidelines.\n\n**5. 7-day action plan (daily checklist) to improve:**\n\n"}
```

**WEB APP**

Visit web app on https://684f16c5.trade-journal.pages.dev