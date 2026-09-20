import { useEffect } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  FileDown,
  GraduationCap,
  Home as HomeIcon,
  Layers,
  Video,
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
import MaterialyPage from '@/routes/Materialy'
import SettingsPage from '@/routes/Settings'

/**
 * `mobile` wyznacza zakładki dolnego paska, `short` skraca podpis, gdy pełna nazwa
 * nie mieści się w kolumnie. Reszta ekranów jest dostępna z ekranu Start.
 */
const NAV: Array<{
  to: string
  label: string
  icon: typeof HomeIcon
  mobile: boolean
  short?: string
}> = [
  { to: '/', label: 'Start', icon: HomeIcon, mobile: true },
  { to: '/review', label: 'Powtórki', icon: RefreshCw, mobile: true },
  { to: '/learn', label: 'Nauka', icon: BookOpen, mobile: true },
  { to: '/exam', label: 'Egzamin', icon: GraduationCap, mobile: true },
  { to: '/errors', label: 'Błędy', icon: TriangleAlert, mobile: true },
  { to: '/materialy', label: 'Materiały', icon: Video, mobile: true, short: 'Wideo' },
  { to: '/stats', label: 'Statystyki', icon: BarChart3, mobile: false },
  { to: '/sets', label: 'Zestawy', icon: Layers, mobile: false },
  { to: '/import', label: 'Import', icon: FileDown, mobile: false },
  { to: '/settings', label: 'Ustawienia', icon: SettingsIcon, mobile: false }
]

export default function App(): React.JSX.Element {
  const refresh = useStore((s) => s.refresh)

  useEffect(() => {
    void (async () => {
      await refresh()
      // ciche sprawdzenie przy starcie; brak sieci nie może niczego blokować
      const { settings, checkContent } = useStore.getState()
      if (settings.autoCheckContent) void checkContent(true)
    })()
  }, [refresh])

  return (
    <HashRouter>
      <div className="flex h-full flex-col md:flex-row">
        {/* Na telefonie menu boczne nie mieści się obok treści — schodzi na dół jako pasek zakładek */}
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar p-3 md:block">
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
          <div className="mx-auto max-w-4xl p-4 pb-24 md:p-6 md:pb-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/exam" element={<ExamPage />} />
              <Route path="/errors" element={<ErrorsPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/materialy" element={<MaterialyPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/sets" element={<SetsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-sidebar/95 backdrop-blur md:hidden">
          {NAV.filter((n) => n.mobile).map(({ to, label, icon: Icon, short }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-0.5 py-2 text-[10px] leading-tight transition-colors',
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="size-5" />
              {short ?? label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Toaster position="bottom-right" />
    </HashRouter>
  )
}
