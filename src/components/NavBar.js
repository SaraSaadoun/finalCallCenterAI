import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css'; // We'll create this CSS file

function NavBar() {
    return (
        <nav className="navbar">
            <div className="navbar-brand">Call Center AI</div>
            <ul className="navbar-links">
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/customers">Customers</Link></li>
                <li><Link to="/calls">Calls</Link></li>
                <li><Link to="/settings">Settings</Link></li>
            </ul>
        </nav>
    );
}

export default NavBar;
