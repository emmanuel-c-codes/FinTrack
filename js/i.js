// js/dashboard.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { uploadImageToImgBB } from './imgbb.js';

const welcomeMessageEl = document.getElementById('welcomeMessage');
const sidebarUserName = document.getElementById('sidebarUserName');
const userAvatar = document.getElementById('userAvatar');
const avatarUpload = document.getElementById('avatarUpload');
const logoutBtn = document.getElementById('logoutBtn');

const totalBalanceEl = document.getElementById('totalBalance');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const recentTransactionsEl = document.getElementById('recentTransactions');
const expenseChartCanvas = document.getElementById('expenseChart');
const chartPlaceholder = document.getElementById('chartPlaceholder');

let currentUser = null;
let chartInstance = null;

const formatNGN = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-zinc-900' : (type === 'error' ? 'bg-red-600' : 'bg-brand-600');
    const icon = type === 'success' ? '<i class="fas fa-check-circle text-brand-400 text-xl"></i>' : 
                 (type === 'error' ? '<i class="fas fa-exclamation-circle text-white text-xl"></i>' : '<i class="fas fa-spinner fa-spin text-white text-xl"></i>');
    
    toast.className = `fixed bottom-10 right-10 ${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all translate-y-20 opacity-0 z-[100] font-medium border border-zinc-700/50`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-20', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300); 
    }, type === 'info' ? 1500 : 3000);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const displayName = user.displayName || "User";
        
        if (welcomeMessageEl) {
            welcomeMessageEl.innerHTML = `Welcome, <span class="font-extrabold text-brand-600">${displayName}</span>`;
        }
        if (sidebarUserName) sidebarUserName.innerText = displayName;

        if (userAvatar) {
            userAvatar.src = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        }

        loadDashboardData(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

async function loadDashboardData(userId) {
    try {
        const transactionsRef = collection(db, "transactions");
        const q = query(transactionsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        let transactions = [];
        let totalIncome = 0;
        let totalExpenses = 0;
        let categoryTotals = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ id: doc.id, ...data });

            if (data.type === 'income') {
                totalIncome += data.amount;
            } else if (data.type === 'expense') {
                totalExpenses += data.amount;
                const cat = data.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + data.amount;
            }
        });

        const balance = totalIncome - totalExpenses;

        totalBalanceEl.innerText = formatNGN(balance);
        totalIncomeEl.innerText = formatNGN(totalIncome);
        totalExpensesEl.innerText = formatNGN(totalExpenses);

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderRecentTransactions(transactions.slice(0, 5));

        renderChart(categoryTotals);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        recentTransactionsEl.innerHTML = `<p class="text-red-500 text-sm text-center mt-4">Failed to sync data.</p>`;
    }
}

function renderRecentTransactions(recentTxns) {
    recentTransactionsEl.innerHTML = ''; 

    if (recentTxns.length === 0) {
        recentTransactionsEl.innerHTML = `<div class="flex items-center justify-center h-full text-zinc-400 text-sm font-medium">No recent activity.</div>`;
        return;
    }

    recentTxns.forEach(txn => {
        const isExpense = txn.type === 'expense';
        const icon = isExpense ? 'fa-arrow-down text-red-500' : 'fa-arrow-up text-emerald-500';
        const bg = isExpense ? 'bg-zinc-100' : 'bg-emerald-50';
        const sign = isExpense ? '-' : '+';
        const amountColor = isExpense ? 'text-zinc-900' : 'text-emerald-600';

        const txnHTML = `
            <div class="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-xl transition cursor-default">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="overflow-hidden">
                        <p class="font-bold text-zinc-900 text-sm truncate">${txn.description}</p>
                        <p class="text-xs text-zinc-500 font-medium truncate">${txn.date}</p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-2">
                    <p class="font-bold text-sm ${amountColor}">${sign}${formatNGN(txn.amount)}</p>
                </div>
            </div>
        `;
        recentTransactionsEl.innerHTML += txnHTML;
    });
}

function renderChart(categoryTotals) {
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (chartInstance) chartInstance.destroy(); 

    if (data.length === 0) {
        expenseChartCanvas.classList.add('hidden');
        if (chartPlaceholder) chartPlaceholder.classList.remove('hidden');
        return;
    }

    expenseChartCanvas.classList.remove('hidden');
    if (chartPlaceholder) chartPlaceholder.classList.add('hidden');

    chartInstance = new Chart(expenseChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#64748b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', 
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' }
                    }
                }
            }
        }
    });
}

if (avatarUpload) {
    avatarUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUser) return;

        userAvatar.style.opacity = '0.5';
        showToast("Uploading image...", "info");

        try {
            const imageUrl = await uploadImageToImgBB(file);
            await updateProfile(currentUser, { photoURL: imageUrl });
            userAvatar.src = imageUrl;
            showToast("Profile picture updated!", "success");
        } catch (error) {
            console.error("Upload error:", error);
            showToast("Failed to upload picture.", "error");
        } finally {
            userAvatar.style.opacity = '1';
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}