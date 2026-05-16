import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { sms } = await req.json()
  if (!sms) return NextResponse.json({ error: 'No SMS provided' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)
  const apiKey = process.env.GEMINI_API_KEY

  const prompt = `Extract transaction details from this Indian bank or UPI SMS. Return ONLY a raw JSON object with no markdown or explanation.

Keys required:
- type: "income" or "expense"
- amount: number (no commas, no currency symbol)
- description: short merchant or sender name (max 40 chars)
- date: YYYY-MM-DD format (use ${today} if not found)
- category: exactly one of: Salary, Business, Investment, Other income, Groceries, Rent, Utilities, Transport, Food, Health, Subscriptions, Entertainment, Shopping, Transfer, Other
- confidence: "high" or "low"

Rules:
- "credited" / "received" / "NEFT IN" / "UPI received" = income
- "debited" / "spent" / "paid" / "purchase" / "UPI sent" = expense
- For salary credits use Salary, for UPI person transfers use Transfer

SMS: ${sms}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 }
      })
    }
  )

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse SMS' }, { status: 422 })
  }
}