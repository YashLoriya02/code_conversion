'use client';

import { Loader2, LucideGithub } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (localStorage.getItem("session-id")) {
            router.push('/github-repo-explorer')
        }
    }, [])

    const handleLogin = () => {
        setLoading(true)
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/github`;
    };

    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="backdrop-blur-xl bg-[#ffffff06] rounded-xl p-14 max-w-4xl mx-auto flex flex-col items-center">
                <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
                    Welcome
                </h1>
                <p className="text-lg text-gray-200 mb-8 text-center px-2">
                    Sign in with GitHub to unlock powerful features,<br /> create repositories instantly, and experience next-level coding workflow!
                </p>
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className={`${loading ? "text-[#ffffff82] cursor-not-allowed" : "text-white cursor-pointer"} bg-[#0d1117aa] font-semibold py-4 px-14 rounded-[14px] flex items-center gap-3`}
                >
                    {
                        loading
                            ? <Loader2 className="h-6 w-6 animate-spin" />
                            : <LucideGithub className="w-6 h-6" />
                    }
                    Login With Github
                </button>
            </div>
        </main>
    );
}
