import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'


if (typeof window !== 'undefined') {
    window.global ||= window;
}


createRoot(document.getElementById('root')).render(<App />)
