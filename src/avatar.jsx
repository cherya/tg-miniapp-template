export function Avatar({ src, size = 'sm', premium = 0 }) {
  if (!src) return null
  const count = typeof premium === 'boolean' ? (premium ? 1 : 0) : (premium || 0)
  return (
    <span class={`avatar avatar-${size}${count > 0 ? ' avatar-premium' : ''}`}>
      <span class="avatar-img" style={{ backgroundImage: `url(${src})` }} />
      {count > 0 && <span class="avatar-crown">👑</span>}
    </span>
  )
}
