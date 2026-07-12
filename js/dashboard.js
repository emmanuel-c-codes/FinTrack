// js/dashboard.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const welcomeMessageEl = document.getElementById('welcomeMessage');
const userAvatar = document.getElementById('userAvatar');
const avatarUpload = document.getElementById('avatarUpload');
const logoutBtn = document.getElementById('logoutBtn');

// Dashboard Data Elements
const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const recentTransactionsEl = document.getElementById('recentTransactions');
const expenseChartCanvas = document.getElementById('expenseChart');

const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY"; // Replace with your key
let currentUser = null;
let chartInstance = null;

// Currency Formatter
const formatNGN = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

// 1. Authenticate and Initialize
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const displayName = user.displayName || "User";
        
        if (welcomeMessageEl) {
            welcomeMessageEl.innerText = `Welcome back, ${displayName}!`;
        }

        if (userAvatar) {
            userAvatar.src = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        }

        // Fetch real data from Firebase
        loadDashboardData(user.uid);
        
    } else {
        window.location.href = "login.html";
    }
});

// 2. Fetch Dashboard Data
async function loadDashboardData(userId) {
    try {
        const transactionsRef = collection(db, "transactions");
        // We query by userId to avoid needing a complex index right now
        const q = query(transactionsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        let transactions = [];
        let totalIncome = 0;
        let totalExpenses = 0;
        let categoryTotals = {};

        // Parse data
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ id: doc.id, ...data });

            if (data.type === 'income') {
                totalIncome += data.amount;
            } else if (data.type === 'expense') {
                totalExpenses += data.amount;
                
                // Group expenses for the chart
                const cat = data.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + data.amount;
            }
        });

        // Calculate Net Worth
        const balance = totalIncome - totalExpenses;

        // Update the big numbers on the UI
        totalBalanceEl.innerText = formatNGN(balance);
        totalIncomeEl.innerText = formatNGN(totalIncome);
        totalExpensesEl.innerText = formatNGN(totalExpenses);

        // Sort transactions by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Render Recent Transactions (Top 5)
        renderRecentTransactions(transactions.slice(0, 5));

        // Render the Chart
        renderChart(categoryTotals);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        recentTransactionsEl.innerHTML = `<p class="text-red-500 text-sm text-center mt-4">Failed to sync data.</p>`;
    }
}

// 3. Render Recent Transactions List
function renderRecentTransactions(recentTxns) {
    recentTransactionsEl.innerHTML = ''; // Clear loading spinner

    if (recentTxns.length === 0) {
        recentTransactionsEl.innerHTML = `<div class="flex items-center justify-center h-full text-zinc-400 text-sm">No recent transactions.</div>`;
        return;
    }

    recentTxns.forEach(txn => {
        const isExpense = txn.type === 'expense';
        const icon = isExpense ? 'fa-arrow-down text-red-500' : 'fa-arrow-up text-emerald-500';
        const bg = isExpense ? 'bg-red-50' : 'bg-emerald-50';
        const sign = isExpense ? '-' : '+';

        const txnHTML = `
            <div class="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition cursor-pointer border border-transparent hover:border-zinc-100">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 ${bg} rounded-xl flex items-center justify-center">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div>
                        <p class="font-bold text-zinc-900 text-sm">${txn.description}</p>
                        <p class="text-xs text-zinc-400 font-medium">${txn.date} • ${txn.category || 'Income'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-extrabold text-sm ${isExpense ? 'text-zinc-900' : 'text-emerald-600'}">${sign}${formatNGN(txn.amount)}</p>
                </div>
            </div>
        `;
        recentTransactionsEl.innerHTML += txnHTML;
    });
}

// 4. Render Expense Doughnut Chart
function renderChart(categoryTotals) {
    // Reveal the canvas
    expenseChartCanvas.classList.remove('hidden');
    // Hide the placeholder text
    expenseChartCanvas.nextElementSibling.style.display = 'none';

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (chartInstance) {
        chartInstance.destroy(); // Clear old chart
    }

    if (data.length === 0) {
        expenseChartCanvas.classList.add('hidden');
        expenseChartCanvas.nextElementSibling.innerText = "Not enough data for chart";
        expenseChartCanvas.nextElementSibling.style.display = 'block';
        return;
    }

    chartInstance = new Chart(expenseChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#10b981', // Brand green
                    '#f59e0b', // Amber
                    '#3b82f6', // Blue
                    '#ef4444', // Red
                    '#8b5cf6', // Purple
                    '#64748b'  // Slate
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Makes the doughnut ring thinner
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: "'Plus Jakarta Sans', sans-serif",
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}

// 5. Handle Profile Picture Upload
if (avatarUpload) {
    avatarUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUser) return;

        userAvatar.style.opacity = '0.5';
        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                const imageUrl = data.data.url;
                await updateProfile(currentUser, { photoURL: imageUrl });
                userAvatar.src = imageUrl;
            } else {
                throw new Error("Upload failed.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to upload picture.");
        } finally {
            userAvatar.style.opacity = '1';
        }
    });
}

// 6. Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}