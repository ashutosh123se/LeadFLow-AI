import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'LeadFlow — Enterprise CRM Platform',
  description: 'Professional speed-to-lead CRM for global B2B sales teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#111827',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px -2px rgb(17 24 39 / 0.08)',
            },
          }}
        />
      </body>
    </html>
  );
}
