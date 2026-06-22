export const metadata = {
  title: 'Psychiatric Handover',
  applicationName: 'Psychiatric Handover',
  manifest: '/psy-manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Psych Handover',
    statusBarStyle: 'default'
  },

  icons: {
    apple: [
      {
        url: '/psy-icon-180.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],

    icon: [
      {
        url: '/psy-icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        url: '/psy-icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}

export default function PsyLayout({ children }) {
  return children
}