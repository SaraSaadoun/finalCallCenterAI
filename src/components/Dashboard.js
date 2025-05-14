import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getDashboardStats();
                setStats(data);
            } catch (err) {
                setError(err.message || 'Failed to fetch dashboard stats');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <p className="loading-message">Loading dashboard...</p>;
    if (error) return <p className="error-message">Error: {error}</p>;
    if (!stats) return <p>No dashboard data available.</p>;

    // Format Avg Handle Time (assuming it's in seconds from backend, converting to M:SS)
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
     };


    return (
        <div>
            <h2>Dashboard Overview</h2>
            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>إجمالي المكالمات</h3>
                    <p>{stats.totalCalls ?? 'N/A'}</p>
                </div>
                <div className="stat-card">
                    <h3>المكالمات المكتملة</h3>
                    <p>{stats.completedCalls ?? 'N/A'}</p>
                </div>
                 <div className="stat-card">
                    <h3>معدل الحل من أول مرة (FCR)</h3>
                     <p>{stats.fcrRate !== null ? `${stats.fcrRate}%` : 'N/A'}</p>
                </div>
                <div className="stat-card">
                    <h3>متوسط وقت التعامل (AHT)</h3>
                    {/* Assuming avgHandleTime is in seconds */}
                    <p>{formatTime(stats.avgHandleTime)}</p>
                </div>
                <div className="stat-card">
                    <h3>المكالمات المعلقة/المجدولة</h3>
                    <p>{stats.pendingCalls ?? 'N/A'}</p>
                </div>
                <div className="stat-card">
                    <h3>المكالمات الفاشلة</h3>
                    <p>{stats.failedCalls ?? 'N/A'}</p>
                </div>
            </div>
             {/* Placeholder for charts if needed */}
             {/* <div>Charts would go here</div> */}
        </div>
    );
}

export default Dashboard;