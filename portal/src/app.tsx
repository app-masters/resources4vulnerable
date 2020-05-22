import React, { useEffect } from 'react';
import moment from 'moment';
import momentBR from 'moment/locale/pt-br';
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import ReactGA from 'react-ga';

import { GlobalStyles } from './styles/globalStyles';
import { Theme } from './styles/theme';
import getStore from './redux/store';

import { Router } from './pages';
import { env } from './env';

import 'antd/dist/antd.css';

/**
 * Base React application component
 */
const App = () => {
  useEffect(() => {
    moment.updateLocale('pt-br', momentBR);
    ReactGA.initialize(env.REACT_APP_ENV_GA_TRACKING_ID as string);
    ReactGA.pageview(window.location.pathname + window.location.search);
  }, []);
  const { store, persistor } = getStore();
  return (
    <ThemeProvider theme={Theme}>
      <GlobalStyles />
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={null}>
          <Router />
        </PersistGate>
      </Provider>
    </ThemeProvider>
  );
};

export default App;
