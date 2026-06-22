export const metadata = {
  title: 'Observation Form',
  applicationName: 'Observation Form',
  manifest: '/form-manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Observation Form',
    statusBarStyle: 'default'
  },

  icons: {
    apple: [
      {
        url: '/form-icon-180.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],

    icon: [
      {
        url: '/form-icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        url: '/form-icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}

export default function FormHomeLayout({ children }) {
  return children
}