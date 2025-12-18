import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import { LayoutDashboard, History as HistoryIcon, Map as MapIcon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapIcon className="w-8 h-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Détecteur de <span className="text-primary-600">Défauts Routiers</span>
            </h1>
          </div>

          <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard size={18} />
                Tableau de Bord
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon size={18} />
                Historique
              </div>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? <Dashboard /> : <History />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          &copy; 2025 IA Détection Routière. Propulsé par YOLOv8, PostGIS & MinIO.
        </div>
      </footer>
    </div>
  );
}

export default App;
