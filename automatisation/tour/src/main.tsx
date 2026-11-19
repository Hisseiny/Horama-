import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PrototypeProvider } from './PrototypeContext'
import './index.css'
// Last, after every sheet of the prototype (index.css carries its shell): it corrects them at equal specificity.
import './tour/tour.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrototypeProvider>
      <App />
    </PrototypeProvider>
  </React.StrictMode>,
)
