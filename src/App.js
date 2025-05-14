import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CallList from './components/CallList';
import Settings from './components/Settings';
import NavBar from './components/NavBar';
import './App.css'; // Main app styles

function App() {
    return (
        <Router>
            <div className="App">
                <NavBar />
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/customers" element={<CustomerList />} />
                        <Route path="/calls" element={<CallList />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;