import { AppProviders } from './app/Providers';
import { AppRouter } from './app/Router';
import './i18n';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
