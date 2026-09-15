'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs uppercase tracking-widest text-neutral-400">
      Authenticating...
    </div>
  );
}
