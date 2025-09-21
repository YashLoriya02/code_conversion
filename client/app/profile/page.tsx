'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProfile } from '@/lib/api';
import { Loader2, Github, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface User {
    githubId: string;
    username: string;
    displayName: string;
    email?: string;
    profileUrl?: string;
    avatarUrl?: string;
    accessToken: string;
}

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const params = useSearchParams();
    const id = params.get('id');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const sessionId = localStorage.getItem('session-id');
                const data = await getProfile(sessionId ?? id ?? '');
                setUser(data);

                localStorage.setItem('session-id', data._id);
                localStorage.setItem('session-gname', data.username);

                if (id) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('id');
                    window.history.replaceState({}, document.title, url);
                }
            } catch (err) {
                setError('Failed to load profile data. You may not be logged in.');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            localStorage.removeItem("session-id")
            localStorage.removeItem("session-gname")
            router.push('/');
        } catch (err) {
            setError('Logout failed.');
        }
    };

    return (
        <>
            {loading ? (
                <main className="min-h-screen flex items-center justify-center">
                    <div className="animate-pulse">
                        <Loader2 className="h-24 w-24 text-white animate-spin" />
                    </div>
                </main>
            ) : (
                <main className="min-h-screen flex items-center justify-center bg-gradient-radial from-indigo-900 via-indigo-700 to-purple-900">
                    <div className="backdrop-blur-xl bg-[#ffffff07] rounded-2xl p-10 px-20 max-w-2xl w-full mx-4 flex flex-col items-center text-center transition-all duration-500 ease-in-out hover:shadow-purple-500/20">
                        <h1 className="text-4xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg animate-fade-in">
                            Your Profile
                        </h1>
                        {error ? (
                            <p className="text-red-300 text-lg mb-8 animate-fade-in">{error}</p>
                        ) : user ? (
                            <>
                                <div className="mb-8 rounded-full flex items-center justify-center shadow-lg animate-bounce-in">
                                    <Image src={user.avatarUrl ?? ""} alt='avatar' width={100} height={100} className="text-white rounded-full" />
                                </div>
                                <div className="space-y-4 w-full animate-fade-in">
                                    <div className="bg-white/5 rounded-lg p-3 shadow-inner">
                                        <p className="text-gray-300 text-sm">Name</p>
                                        <p className="text-white font-semibold">{user.displayName}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 shadow-inner">
                                        <p className="text-gray-300 text-sm">Github Username</p>
                                        <p className="text-white font-semibold">{user.username}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 shadow-inner">
                                        <p className="text-gray-300 text-sm">GitHub ID</p>
                                        <p className="text-white font-semibold">{user.githubId}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 shadow-inner">
                                        <p className="text-gray-300 text-sm">Profile URL</p>
                                        <Link href={user.profileUrl ?? ""} target='blank' className="text-white font-semibold hover:text-blue-500">{user.profileUrl || 'N/A'}</Link>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="mt-8 bg-[#0D1117] text-white font-semibold py-3 px-10 rounded-[14px] flex items-center gap-2 hover:bg-[#1f2937] transition-all duration-300 ease-in-out hover:scale-105 shadow-lg"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <p className="text-gray-300 text-lg mb-8 animate-fade-in">No user data available.</p>
                        )}
                    </div>
                </main>
            )}
        </>
    );
}
