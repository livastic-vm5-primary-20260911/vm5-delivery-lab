/* Public, non-sensitive client-editable portfolio demo configuration.
   For production: set true destination URLs and integrate an approved email service server-side. */
export const config = Object.freeze({
  brandName: 'nova studio',
  socials: Object.freeze([
    Object.freeze({ label: 'Instagram', description: 'New moments & behind the scenes', symbol: '◎', destination: '' }),
    Object.freeze({ label: 'TikTok', description: 'Short stories, big energy', symbol: '▷', destination: '' }),
    Object.freeze({ label: 'YouTube', description: 'The long-form corner', symbol: '▶', destination: '' }),
    Object.freeze({ label: 'Community', description: 'A place to stay connected', symbol: '✧', destination: '' })
  ])
});
