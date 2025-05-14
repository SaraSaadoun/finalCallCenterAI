// src/components/CallList.js
import React, { useState, useEffect } from 'react';
import { getCalls } from '../services/api';

function CallList() {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCalls = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getCalls();
                // Sort calls, maybe newest first based on scheduled time or end time
                 const sortedCalls = (data || []).sort((a, b) => {
                    const dateA = new Date(a.scheduledDateTime || a.endTime || a.startTime || 0);
                    const dateB = new Date(b.scheduledDateTime || b.endTime || b.startTime || 0);
                    return dateB - dateA; // Descending order
                });
                setCalls(sortedCalls);
            } catch (err) {
                setError(err.message || 'Failed to fetch calls');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCalls();
    }, []);

     const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            return new Date(isoString).toLocaleString('ar-EG'); // Use Arabic locale for Egypt
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const formatDuration = (minutes) => {
        if (minutes === null || minutes === undefined) return 'N/A';
         const mins = Math.floor(minutes);
         const secs = Math.round((minutes - mins) * 60);
         return `${mins} د ${secs} ث`; // M min S sec
    }

    if (loading) return <p className="loading-message">Loading calls...</p>;
    if (error) return <p className="error-message">Error: {error}</p>;

    return (
        <div>
            <h2>Call History & Scheduled Calls</h2>
            <table>
                <thead>
                    <tr>
                        <th>Call ID / Type</th>
                        <th>Customer Name</th>
                        <th>Customer Phone</th>
                        <th>Ticket ID</th>
                        <th>الحالة (Status)</th>
                        <th>الوقت المجدول / البدء (Scheduled/Start Time)</th>
                        <th>وقت الانتهاء (End Time)</th>
                        <th>المدة (Duration)</th>
                        <th>نتيجة الحل (Resolution)</th>
                        <th>محاولات (Retries)</th>
                    </tr>
                </thead>
                <tbody>
                    {calls.length > 0 ? calls.map(call => (
                        <tr key={call.id}>
                            <td>{call.id.startsWith('TEST') ? `Test: ${call.id}` : call.id}</td>
                            <td>{call.customerName || 'N/A'}</td>
                            <td>{call.customerPhone || 'N/A'}</td>
                            <td>{call.ticketId || 'N/A'}</td>
                            <td>{call.status || 'N/A'}</td>
                            <td>{formatDateTime(call.scheduledDateTime || call.startTime)}</td>
                            <td>{formatDateTime(call.endTime)}</td>
                             <td>{formatDuration(call.duration)}</td>
                             <td>{call.resolutionType || 'N/A'}</td>
                            <td>{call.retryAttempts !== undefined ? call.retryAttempts : 'N/A'}</td>
                            {/* Add actions like 'View Transcript' if available */}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="10">No calls found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default CallList;