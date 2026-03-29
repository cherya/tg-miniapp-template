// Telegram Bot webhook handler
import { serverT } from './server-i18n.js'

const PREMIUM_PRICE = 100

export async function handleBotWebhook(request, env) {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (secret !== env.WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  try {
    const update = await request.json()

    if (update.pre_checkout_query) {
      await handlePreCheckout(env, update.pre_checkout_query)
      return ok()
    }

    if (update.message?.successful_payment) {
      await handleSuccessfulPayment(env, update.message)
      return ok()
    }

    const message = update.message
    if (!message?.text) return ok()

    const text = message.text.trim()
    const lang = message.from?.language_code || 'en'
    if (text === '/start' || text.startsWith('/start ')) {
      await sendWelcome(env, message.chat.id, lang)
    } else if (text === '/terms') {
      await sendTerms(env, message.chat.id)
    } else if (text === '/support' || text === '/paysupport' || text.startsWith('/support ') || text.startsWith('/paysupport ')) {
      await handleSupport(env, message, lang)
    }
  } catch (e) {
    console.error('bot-handler error:', e?.message || e)
  }

  return ok()
}

function ok() {
  return new Response('ok', { status: 200 })
}

async function tgApi(env, method, body) {
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function handlePreCheckout(env, query) {
  const { id, invoice_payload, total_amount, currency } = query
  const payloadMatch = invoice_payload?.match(/^premium_(\d+)$/)
  const isValid = payloadMatch && total_amount === PREMIUM_PRICE && currency === 'XTR'

  await tgApi(env, 'answerPreCheckoutQuery', isValid
    ? { pre_checkout_query_id: id, ok: true }
    : { pre_checkout_query_id: id, ok: false, error_message: 'Invalid payment parameters' }
  )
}

async function handleSuccessfulPayment(env, message) {
  const payment = message.successful_payment
  const userId = String(message.from?.id || '')
  if (!userId || !payment) return

  const chargeId = payment.telegram_payment_charge_id
  const now = Date.now()

  await env.DB.prepare(
    'INSERT INTO users (id, premium, premium_charge_id, premium_at) VALUES (?, 1, ?, ?) ON CONFLICT(id) DO UPDATE SET premium = premium + 1, premium_charge_id = ?, premium_at = ?'
  ).bind(userId, chargeId, now, chargeId, now).run()
}

async function sendWelcome(env, chatId, lang) {
  // Customize: change photo URL and web_app URL
  await tgApi(env, 'sendPhoto', {
    chat_id: chatId,
    photo: 'https://my-game.example.com/preview.png',
    caption: serverT(lang, 'welcome_caption'),
    reply_markup: {
      inline_keyboard: [[
        { text: serverT(lang, 'play_btn'), web_app: { url: 'https://my-game.example.com' } }
      ]]
    }
  })
}

async function sendTerms(env, chatId) {
  await tgApi(env, 'sendMessage', {
    chat_id: chatId,
    text: 'This is a cosmetic-only purchase. It provides visual effects and does not affect gameplay.\n\nAll sales are final. No refunds.',
  })
}

async function handleSupport(env, message, lang) {
  const chatId = message.chat.id
  const text = message.text.trim()
  const supportText = text.replace(/^\/(pay)?support\s*/, '').trim()

  if (!supportText) {
    await tgApi(env, 'sendMessage', { chat_id: chatId, text: serverT(lang, 'support_empty') })
    return
  }

  const adminChatId = env.ADMIN_CHAT_ID
  if (!adminChatId) return

  const from = message.from || {}
  const userName = from.first_name || from.username || String(from.id || 'unknown')

  await tgApi(env, 'sendMessage', {
    chat_id: adminChatId,
    text: `Support from ${userName} (id: ${from.id}):\n\n${supportText}`,
  })

  await tgApi(env, 'sendMessage', { chat_id: chatId, text: serverT(lang, 'support_confirm') })
}
