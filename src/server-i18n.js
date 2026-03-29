// Server-side i18n for bot messages, invites, and invoice texts
// Add translations for your game in each language

const strings = {
  en: {
    welcome_caption: 'Welcome to My Game!\n\nPlay solo, compete in daily challenges, or race your friends!',
    play_btn: 'Play',
    support_empty: 'Write your message after the command:\n/support your message',
    support_confirm: 'Thanks, your message has been sent!',
    invoice_title: 'Supporter Pack',
    invoice_desc: 'Cosmetic visual effects. Purely cosmetic — no gameplay advantage. A way to support the developer.',
  },
  ru: {
    welcome_caption: 'Добро пожаловать!\n\nИграй один, соревнуйся в ежедневных испытаниях или устрой гонку с друзьями!',
    play_btn: 'Играть',
    support_empty: 'Напишите сообщение после команды:\n/support ваше сообщение',
    support_confirm: 'Спасибо, ваше сообщение отправлено!',
    invoice_title: 'Набор поддержки',
    invoice_desc: 'Косметические визуальные эффекты. Только косметика — никаких игровых преимуществ. Способ поддержать разработчика.',
  },
  // Add more languages: uk, be, ka, es, pt, de, hi, ar, id, fa, tr, uz
}

export function serverT(lang, key) {
  const l = (lang || 'en').slice(0, 2).toLowerCase()
  return strings[l]?.[key] || strings.en[key] || key
}
