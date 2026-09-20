import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  FileDown,
  GraduationCap,
  Home as HomeIcon,
  Layers,
  RefreshCw,
  Settings as SettingsIcon,
  TriangleAlert
} from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import HomePage from '@/routes/Home'
import LearnPage from '@/routes/Learn'
import ExamPage from '@/routes/Exam'
import ErrorsPage from '@/routes/Errors'
import ReviewPage from '@/routes/Review'
import StatsPage from '@/routes/Stats'
import SetsPage from '@/routes/Sets'
import ImportPage from '@/routes/Import'
import SettingsPage from '@/routes/Settings'

const NAV = [
  { to: '/', label: 'Start', icon: HomeIcon },
  { to: '/review', label: 'Powtórki', icon: RefreshCw },
  { to: '/learn', label: 'Nauka', icon: BookOpen },
  { to: '/exam', label: 'Egzamin', icon: GraduationCap },
  { to: '/errors', label: 'Moje błędy', icon: TriangleAlert },
  { to: '/stats', label: 'Statystyki', icon: BarChart3 },
  { to: '/sets', label: 'Zestawy', icon: Layers },
  { to: '/import', label: 'Import', icon: FileDown },
  { to: '/settings', label: 'Ustawienia', icon: SettingsIcon }
]

export default function App(): React.JSX.Element {
  const refresh = useStore((s) => s.refresh)
  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <HashRouter>
      <div className="flex h-full">
        <aside className="w-56 shrink-0 border-r bg-sidebar p-3">
          <div className="px-2 pb-4 pt-2">
            <p className="text-sm font-semibold">Elektryk Quiz</p>
            <p className="text-xs text-muted-foreground">ELE.02 · ELE.05</p>
          </div>
          <nav className="space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/exam" element={<ExamPage />} />
              <Route path="/errors" element={<ErrorsPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/sets" element={<SetsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </HashRouter>
  )
}
