import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth';
import { VehicleProvider } from './lib/vehicleStore';
import { useRoute, type Route } from './lib/router';
import { Layout } from './components/Layout';
import { Empty, LinkButton, Page } from './components/ui';
import { SignInPage } from './pages/SignInPage';
import { HomePage, VehiclePage } from './pages/HomePage';
import { ProblemsPage, RecallsPage } from './pages/ResearchPages';
import { CodeDetailPage, CodesPage } from './pages/CodesPages';
import { FixDetailPage, FixEditPage, FixNewPage, FixesPage } from './pages/FixesPages';
import { ArticlePage, ProcedureEditPage, ProcedureNewPage, ProcedurePage, RepairPage } from './pages/RepairPages';
import { SpecsPage } from './pages/SpecsPage';
import { EstimatePage, LaborJobPage, LaborPage } from './pages/LaborPages';
import { FilesPage } from './pages/FilesPage';
import { NotesPage } from './pages/NotesPage';
import { SearchPage } from './pages/SearchPage';
import { AboutPage } from './pages/AboutPage';
import { FaultDetailPage, FaultsPage } from './pages/FaultsPages';
import { EngineLayoutPage, LocationDetailPage, LocationsPage } from './pages/LocationsPages';

/** The route table. Paths live in the URL hash: #/codes/P0300. */
function screen(route: Route): ReactNode {
  const [a, b, c, d] = route.parts;
  switch (a) {
    case undefined:
      return <HomePage />;
    case 'vehicle':
      return <VehiclePage />;
    case 'recalls':
      return <RecallsPage />;
    case 'problems':
      return <ProblemsPage />;
    case 'codes':
      return b ? <CodeDetailPage key={b} code={b} /> : <CodesPage />;
    case 'fixes':
      if (!b) return <FixesPage key={route.query.toString()} route={route} />;
      if (b === 'new') return <FixNewPage route={route} />;
      return c === 'edit' ? <FixEditPage key={b} id={b} /> : <FixDetailPage key={b} id={b} />;
    case 'repair':
      if (!b) return <RepairPage />;
      if (b === 'a' && c) return <ArticlePage key={c} slug={c} />;
      if (b === 'p' && c === 'new') return <ProcedureNewPage />;
      if (b === 'p' && c) return d === 'edit' ? <ProcedureEditPage key={c} id={c} /> : <ProcedurePage key={c} id={c} />;
      break;
    case 'specs':
      return <SpecsPage />;
    case 'labor':
      if (!b) return <LaborPage />;
      return b === 'estimate' ? <EstimatePage /> : <LaborJobPage key={b} code={b} />;
    case 'files':
      return <FilesPage key={route.query.toString()} route={route} />;
    case 'faults':
      return b ? <FaultDetailPage key={b} id={b} /> : <FaultsPage />;
    case 'locations':
      if (!b) return <LocationsPage />;
      return b === 'engine' ? <EngineLayoutPage /> : <LocationDetailPage key={b} id={b} />;
    case 'notes':
      return <NotesPage />;
    case 'search':
      return <SearchPage key={route.query.toString()} route={route} />;
    case 'about':
      return <AboutPage />;
  }
  return (
    <Page title="Page not found">
      <Empty title="That page does not exist." action={<LinkButton to="/" variant="primary">Go to the vehicle</LinkButton>} />
    </Page>
  );
}

function SignedIn() {
  const route = useRoute();
  return (
    <VehicleProvider>
      <Layout route={route}>{screen(route)}</Layout>
    </VehicleProvider>
  );
}

function Gate() {
  const { state } = useAuth();
  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink" role="status" aria-label="Loading">
        <LoaderCircle className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }
  if (state.status === 'signed_out') return <SignInPage notice={state.notice} />;
  return <SignedIn />;
}

export function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
