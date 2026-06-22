export const metadata = {
  title: 'Observation Dashboard',
  applicationName: 'Observation Dashboard',
  manifest: '/dashboard-manifest.json',

  appleWebApp: {
    capable: true,
    title: 'Observation',
    statusBarStyle: 'default'
  },

  icons: {
    apple: [
      {
        url: '/dashboard-icon-180.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ],

    icon: [
      {
        url: '/dashboard-icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        url: '/dashboard-icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}

export default function DashboardLayout({ children }) {
  return children
}