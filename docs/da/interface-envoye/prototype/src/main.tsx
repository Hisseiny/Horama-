import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PrototypeProvider } from './PrototypeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrototypeProvider>
      <App />
    </PrototypeProvider>
  </React.StrictMode>,
)
