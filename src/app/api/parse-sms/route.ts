import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { sms } = await req.json()
  if (!sms) return NextResponse.json({ error: 'No SMS provided' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Extract transaction details from this Indian bank or UPI SMS. Return ONLY a raw JSON object with no markdown or explanation.

Keys required:
- type: "income" or "expense"
- amount: number (no commas, no currency symbol)
- desc: short merchant or sender name (max 40 chars)
- date: YYYY-MM-DD format (use ${today} if not found)
- category: exactly one of: 💼 Salary, 🏪 Business, 📈 Investment, 🎁 Other income, 🛒 Groceries, 🏠 Rent, ⚡ Utilities, 🚗 Transport, 🍽 Food, 🏥 Health, 📱 Subscriptions, 🎉 Entertainment, 📦 Shopping, 💸 Transfer, ❓ Other
- confidence: "high" or "low"

Rules:
- "credited" / "received" / "NEFT IN" / "UPI received" = income
- "debited" / "spent" / "paid" / "purchase" / "UPI sent" = expense
- For salary credits use 💼 Salary, for UPI person transfers use 💸 Transfer

SMS: ${sms}`
      }]
    })
  })

  const data = await response.json()
  const text = (data.content || []).map((b: { text?: string }) => b.text || '').join('')

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse SMS' }, { status: 422 })
  }
}
