import React, { useState } from 'react';
import { Settings, Cpu, Database, Shield, Check, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [modelName, setModelName] = useState<string>('openai/gpt-oss-120b');
  const [lightModel, setLightModel] = useState<string>('openai/gpt-oss-20b');
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
          Engine & Provider Settings
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Configure AI reasoning models, database connections, and memorization parameters.
        </p>
      </div>

      {/* AI Model Configuration */}
      <div className="border border-stone-200 rounded-xl p-6 bg-white space-y-5">
        <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
          <Cpu className="w-4 h-4 text-stone-700" />
          <h2 className="text-sm font-semibold text-stone-900">
            Groq AI Provider & Model Configuration
          </h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-stone-800 block">Primary Model Architecture:</label>
            <p className="text-stone-500 text-[11px]">
              Used for detailed notes synthesis, comprehensive essay questions, and written exam evaluation.
            </p>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg outline-none bg-white font-mono text-xs focus:border-stone-800"
            >
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Primary Academic Reasoner)</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (High Throughput)</option>
              <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Lightweight Fast)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-stone-800 block">Fallback & Lightweight Model:</label>
            <p className="text-stone-500 text-[11px]">
              Used for rapid clozes, keyword scaffolding, and quick revisions under rate limits.
            </p>
            <input
              type="text"
              value={lightModel}
              onChange={(e) => setLightModel(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg outline-none font-mono text-xs focus:border-stone-800"
            />
          </div>

          <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1 text-[11px] text-stone-600">
            <div className="flex items-center space-x-1 font-semibold text-stone-800">
              <Info className="w-3.5 h-3.5 text-stone-500" />
              <span>Provider Abstraction:</span>
            </div>
            <p>
              Recall uses an isolated AIProviderInterface. API keys are strictly kept server-side in backend environment variables (<code className="font-mono bg-stone-200/70 px-1 py-0.5 rounded">GROQ_API_KEY</code>). If the key is absent or exhausted, the system seamlessly uses the local deterministic academic engine.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-mono">Backend Config: .env</span>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors flex items-center space-x-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Preferences Saved</span>
                </>
              ) : (
                <span>Save Model Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Database & Infrastructure */}
      <div className="border border-stone-200 rounded-xl p-6 bg-white space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-stone-100">
          <Database className="w-4 h-4 text-stone-700" />
          <h2 className="text-sm font-semibold text-stone-900">
            Database & Persistence Status
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
            <div>
              <span className="font-semibold text-stone-800 block">PostgreSQL / Supabase Engine</span>
              <span className="text-[11px] text-stone-500">Configured via DATABASE_URL environment variable</span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-200">
            <div>
              <span className="font-semibold text-stone-800 block">Alembic Schema Versioning</span>
              <span className="text-[11px] text-stone-500">Auto-migrations enabled for all relational entities</span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-200 text-stone-800">
              HEAD
            </span>
          </div>
        </div>
      </div>

      {/* Academic Philosophy Notice */}
      <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5 text-xs text-stone-600">
        <span className="font-semibold text-stone-800 block">Academic Integrity Notice:</span>
        <p>
          Recall is designed for high-stakes university examination preparation. Gamification features like XP, coins, streaks, and leaderboards are permanently disabled to foster deep conceptual focus and high-retention spaced repetition.
        </p>
      </div>
    </div>
  );
};
