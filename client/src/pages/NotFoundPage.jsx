import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400">
          <Film className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-heading font-extrabold text-white">404</h1>
          <h2 className="text-xl font-bold text-slate-200">Scene Not Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The page or video project you are looking for doesn't exist or has been moved to another studio.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dark-card hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-dark-border"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
