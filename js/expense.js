// js/expense.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { uploadImageToImgBB } from './imgbb.js';

// DOM Elements mapping to your UI
const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

// Formatter for Naira
const formatNGN = (amount) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

// 1. Authenticate User
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        if (userAvatar) {
            const displayName = user.displayName || "User";
            userAvatar.src = user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff&bold=true`;
        }

        loadExpenses();
    } else {
        window.location.href = "login.html";
    }
});

// 2. Fetch and Render Expenses
async function loadExpenses() {
    try {
        const transactionsRef = collection(db, "transactions");
        const q = query(
            transactionsRef, 
            where("userId", "==", currentUser.uid),
            where("type", "==", "expense"),
            orderBy("date", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        expenseTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            expenseTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-zinc-400">No expenses recorded yet.</td>
                </tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.className = "hover:bg-zinc-50/50 transition-colors";
            
            // Generate Badge styling
            let badgeClass = "bg-zinc-100 text-zinc-700";
            if(data.category === "Food & Dining") badgeClass = "bg-orange-100 text-orange-700";
            if(data.category === "Transportation") badgeClass = "bg-blue-100 text-blue-700";
            if(data.category === "Utilities") badgeClass = "bg-purple-100 text-purple-700";

            const receiptHTML = data.receiptUrl 
                ? `<a href="${data.receiptUrl}" target="_blank" class="text-brand-500 hover:text-brand-700 ml-2"><i class="fas fa-image"></i></a>` 
                : '';

            tr.innerHTML = `
                <td class="p-4 text-zinc-500 font-medium whitespace-nowrap">${data.date}</td>
                <td class="p-4 font-semibold text-zinc-800">${data.description} ${receiptHTML}</td>
                <td class="p-4">
                    <span class="${badgeClass} text-xs font-bold px-3 py-1 rounded-full">${data.category}</span>
                </td>
                <td class="p-4 text-right font-extrabold text-zinc-900">${formatNGN(data.amount)}</td>
                <td class="p-4 text-center">
                    <button class="delete-btn text-zinc-400 hover:text-red-500 transition-colors p-2" data-id="${doc.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            expenseTableBody.appendChild(tr);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

    } catch (error) {
        console.error("Error loading expenses:", error);
        expenseTableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-medium">Failed to load data.</td></tr>`;
    }
}

// 3. Handle Form Submission
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalBtnText = saveExpenseBtn.innerHTML;
    saveExpenseBtn.innerHTML = 'Saving...';
    saveExpenseBtn.disabled = true;

    try {
        const amount = parseFloat(document.getElementById('expAmount').value);
        const date = document.getElementById('expDate').value;
        const desc = document.getElementById('expDesc').value;
        const category = document.getElementById('expCategory').value;
        const receiptFile = document.getElementById('expReceipt').files[0];

        // Call the imported ImgBB function
        const receiptUrl = await uploadImageToImgBB(receiptFile);

        await addDoc(collection(db, "transactions"), {
            userId: currentUser.uid,
            type: "expense",
            description: desc,
            amount: amount,
            category: category,
            date: date,
            receiptUrl: receiptUrl,
            createdAt: serverTimestamp()
        });

        expenseForm.reset();
        document.getElementById('expDate').valueAsDate = new Date();
        
        // Close modal automatically if toggleExpenseModal is globally available
        if (typeof window.toggleExpenseModal === 'function') {
            window.toggleExpenseModal();
        }
        
        loadExpenses();

    } catch (error) {
        console.error("Error adding expense:", error);
        alert(error.message);
    } finally {
        saveExpenseBtn.innerHTML = originalBtnText;
        saveExpenseBtn.disabled = false;
    }
});

// 4. Handle Deleting
async function handleDelete(e) {
    const btn = e.currentTarget;
    const docId = btn.getAttribute('data-id');

    if (confirm("Delete this expense permanently?")) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await deleteDoc(doc(db, "transactions", docId));
            loadExpenses();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete expense.");
            btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        }
    }
}

// 5. Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}