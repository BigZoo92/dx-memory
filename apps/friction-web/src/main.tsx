import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles.css'
import { App } from './App'

const configuredBasePath = import.meta.env.VITE_BASE_PATH ?? '/'
const basename = configuredBasePath === '/' ? undefined : configuredBasePath.replace(/\/+$/, '')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
