// src/components/CustomerList.js
import React, { useState, useEffect } from 'react';
import { getCustomers, scheduleCall, startTestCall } from '../services/api';
import TestCallModal from './TestCallModal'; // Import the modal

function CustomerList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scheduleData, setScheduleData] = useState({ customerId: null, date: '', time: '' });
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleMessage, setScheduleMessage] = useState({ type: '', text: '' });

    // State for Test Call Modal
    const [showTestCallModal, setShowTestCallModal] = useState(false);
    const [selectedCustomerForTest, setSelectedCustomerForTest] = useState(null);


    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getCustomers();
                setCustomers(data || []); // Ensure it's an array
            } catch (err) {
                setError(err.message || 'Failed to fetch customers');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const handleScheduleClick = (customer) => {
        setScheduleData({ customerId: customer.id, date: '', time: '' });
        setShowScheduleForm(true);
        setScheduleMessage({ type: '', text: '' }); // Clear previous messages
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!scheduleData.customerId || !scheduleData.date || !scheduleData.time) {
            setScheduleMessage({ type: 'error', text: 'Please select date and time.' });
            return;
        }
        setScheduleMessage({ type: 'loading', text: 'Scheduling...' });
        try {
            const callDetails = {
                customerId: scheduleData.customerId,
                scheduledDate: scheduleData.date,
                scheduledTime: scheduleData.time,
                retryAttempts: 3, // Default or make configurable
            };
            const result = await scheduleCall(callDetails);
            if (result.success) {
                setScheduleMessage({ type: 'success', text: `Call scheduled successfully for ${result.call.customerName}!` });
                // Optionally refresh customer list or update status locally
                setCustomers(prev => prev.map(c =>
                    c.id === scheduleData.customerId ? { ...c, callStatus: 'scheduled' } : c
                ));
                setShowScheduleForm(false); // Hide form on success
            } else {
                 throw new Error(result.message || 'Failed to schedule call');
            }
        } catch (err) {
            setScheduleMessage({ type: 'error', text: err.message || 'Failed to schedule call.' });
            console.error(err);
        }
    };

    const handleTestCallClick = (customer) => {
        setSelectedCustomerForTest(customer);
        setShowTestCallModal(true);
    };

    const closeTestCallModal = () => {
        setShowTestCallModal(false);
        setSelectedCustomerForTest(null);
        // Potentially refresh customer/call list if status changed during test
    };

    if (loading) return <p className="loading-message">Loading customers...</p>;
    if (error) return <p className="error-message">Error: {error}</p>;

    return (
        <div>
            <h2>Customer List</h2>

            {showScheduleForm && (
                <div className="schedule-form">
                    <h3>Schedule Call for Customer ID: {scheduleData.customerId}</h3>
                    <form onSubmit={handleScheduleSubmit}>
                        <label htmlFor="scheduleDate">Date:</label>
                        <input
                            type="date"
                            id="scheduleDate"
                            value={scheduleData.date}
                            onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                            required
                        />
                        <label htmlFor="scheduleTime">Time:</label>
                        <input
                            type="time"
                            id="scheduleTime"
                            value={scheduleData.time}
                            onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                            required
                        />
                        <button type="submit" disabled={scheduleMessage.type === 'loading'}>
                            {scheduleMessage.type === 'loading' ? 'Scheduling...' : 'Confirm Schedule'}
                        </button>
                        <button type="button" onClick={() => setShowScheduleForm(false)}>Cancel</button>
                    </form>
                    {scheduleMessage.text && (
                        <p className={`${scheduleMessage.type}-message`}>{scheduleMessage.text}</p>
                    )}
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>الاسم (Name)</th>
                        <th>الهاتف (Phone)</th>
                        <th>رقم التذكرة (Ticket ID)</th>
                        <th>حالة الاتصال (Call Status)</th>
                        <th>تاريخ آخر مكالمة (Last Call)</th>
                        <th>إجراءات (Procedure)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.length > 0 ? customers.map(customer => (
                        <tr key={customer.id}>
                            <td>{customer.id}</td>
                            <td>{customer.name}</td>
                            <td>{customer.phone}</td>
                            <td>{customer.ticketId}</td>
                            <td>{customer.callStatus}</td>
                            <td>{customer.lastCallDate || 'N/A'}</td>
                            <td>{customer.procedureSteps}</td>
                            <td>
                                <button
                                    onClick={() => handleScheduleClick(customer)}
                                    disabled={customer.callStatus === 'scheduled' || showScheduleForm}
                                >
                                    جدولة اتصال (Schedule)
                                </button>
                                <button onClick={() => handleTestCallClick(customer)}>
                                    اختبار اتصال (Test Call)
                                </button>
                                {/* Add more actions like 'View Details' if needed */}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="8">No customers found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {showTestCallModal && selectedCustomerForTest && (
                <TestCallModal
                    customer={selectedCustomerForTest}
                    onClose={closeTestCallModal}
                />
            )}
        </div>
    );
}

export default CustomerList;