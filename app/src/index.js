/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

function json(body, status = 200, extraHeaders = {}) {
	return new Response(JSON.stringify(body), {
	  status,
	  headers: {
		"content-type": "application/json",
		"access-control-allow-origin": "*",
		"access-control-allow-methods": "GET,POST,OPTIONS",
		"access-control-allow-headers": "Content-Type,Authorization",
		...extraHeaders,
	  },
	});
  }
  
  export default {
	async fetch(request, env) {
	  const url = new URL(request.url);
	  const { pathname } = url;
  
	  // CORS preflight
	  if (request.method === "OPTIONS") {
		return json({}, 204);
	  }
  
	  try {
		// Root sanity endpoint
		if (pathname === "/" && request.method === "GET") {
		  return json({ status: "ok", message: "Trade journal API" });
		}
  
		if (pathname === "/trades" && request.method === "POST") {
		  return await createTrade(request, env);
		}
  
		if (pathname === "/trades" && request.method === "GET") {
		  return await listTrades(env);
		}
  
		if (pathname === "/analyze" && request.method === "POST") {
		  return await analyzeTrades(request, env);
		}
  
		return json({ error: "Not found" }, 404);
	  } catch (err) {
		console.error(err);
		return json({ error: "Internal server error" }, 500);
	  }
	},
  };
  
  /**
   * POST /trades
   * Body JSON:
   * {
   *   "enteredAt": "2025-12-11T14:32:00Z",
   *   "reasonOpen": "Breakout of range + volume",
   *   "exitedAt": "2025-12-11T14:45:00Z",
   *   "reasonClose": "Hit target / trail stop",
   *   "outcome": "win" | "loss" | "breakeven",
   *   "percentRisked": 1.0,
   *   "percentReturn": 2.5
   * }
   */
  async function createTrade(request, env) {
	let data;
	try {
	  data = await request.json();
	} catch {
	  return json({ error: "Invalid JSON" }, 400);
	}
  
	const {
	  enteredAt,
	  reasonOpen,
	  exitedAt = null,
	  reasonClose = null,
	  outcome = null,
	  percentRisked = null,
	  percentReturn = null,
	} = data || {};
  
	if (!enteredAt || !reasonOpen) {
	  return json(
		{ error: "enteredAt and reasonOpen are required fields" },
		400,
	  );
	}
  
	await env.trades_db
	  .prepare(
		`INSERT INTO trades 
		(entered_at, reason_open, exited_at, reason_close, outcome, percent_risked, percent_return)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	  )
	  .bind(
		enteredAt,
		reasonOpen,
		exitedAt,
		reasonClose,
		outcome,
		percentRisked,
		percentReturn,
	  )
	  .run();
  
	return json({ success: true }, 201);
  }
  
  /**
   * GET /trades
   * Returns latest trades (limit 200)
   */
  async function listTrades(env) {
	const { results } = await env.trades_db
	  .prepare(
		`SELECT
		   id,
		   entered_at      AS enteredAt,
		   reason_open     AS reasonOpen,
		   exited_at       AS exitedAt,
		   reason_close    AS reasonClose,
		   outcome,
		   percent_risked  AS percentRisked,
		   percent_return  AS percentReturn,
		   created_at      AS createdAt
		 FROM trades
		 ORDER BY entered_at DESC
		 LIMIT 200`
	  )
	  .all();
  
	return json({ trades: results });
  }
  
  /**
   * POST /analyze
   * Optional body:
   * { "notes": "extra context / what I'm working on" }
   */
  async function analyzeTrades(request, env) {
	let body = {};
	try {
	  body = await request.json();
	} catch {
	  // allow empty body
	}
  
	const notes = body?.notes ?? "";
  
	const { results: trades } = await env.trades_db
	  .prepare(
		`SELECT
		   id,
		   entered_at      AS enteredAt,
		   reason_open     AS reasonOpen,
		   exited_at       AS exitedAt,
		   reason_close    AS reasonClose,
		   outcome,
		   percent_risked  AS percentRisked,
		   percent_return  AS percentReturn
		 FROM trades
		 ORDER BY entered_at ASC`
	  )
	  .all();
  
	if (!trades || trades.length === 0) {
	  return json({
		analysis: "No trades found yet. Record some trades before analyzing.",
	  });
	}
  
	const prompt = buildAnalysisPrompt(trades, notes);
  
	// Cloudflare Workers AI (same style as your joke example)
	const result = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
	  messages: [
		{
		  role: "system",
		  content:
			"You are an expert trading performance coach and psychologist. Be concise, practical, and action-oriented.",
		},
		{
		  role: "user",
		  content: prompt,
		},
	  ],
	});
  
	// Workers AI responses usually look like: { response: "..." }
	const text =
	  (result && (result.response || result.result || result.output)) ??
	  JSON.stringify(result);
  
	return json({ analysis: text });
  }
  
  /**
   * Build compact but information-dense prompt.
   */
  function buildAnalysisPrompt(trades, extraNotes) {
	const lines = trades.map((t) => {
	  const outcome = t.outcome ?? "unknown";
	  const pr = t.percentRisked ?? "n/a";
	  const ret = t.percentReturn ?? "n/a";
  
	  return [
		`Trade #${t.id}`,
		`  Entered: ${t.enteredAt}`,
		t.exitedAt ? `  Exited: ${t.exitedAt}` : null,
		`  Reason (open): ${t.reasonOpen}`,
		t.reasonClose ? `  Reason (close): ${t.reasonClose}` : null,
		`  Outcome: ${outcome}`,
		`  % risked: ${pr}`,
		`  % return: ${ret}`,
	  ]
		.filter(Boolean)
		.join("\n");
	});
  
	const base = [
	  "You are analyzing a trading journal.",
	  "Focus on patterns in reasoning at entry and exit, risk usage, and outcome.",
	  "",
	  "Output:",
	  "1) Key good habits observed",
	  "2) Key mistakes / leaks",
	  "3) Likely psychological or process causes",
	  "4) Top 3 concrete changes to make",
	  "5) A 7-day action plan (daily checklist) to improve.",
	  "",
	  "=== TRADES ===",
	  lines.join("\n\n"),
	];
  
	if (extraNotes && extraNotes.trim().length > 0) {
	  base.push("\n=== EXTRA CONTEXT FROM TRADER ===");
	  base.push(extraNotes.trim());
	}
  
	return base.join("\n");
  }