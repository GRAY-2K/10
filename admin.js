const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is admin
function checkAdminAuth() {
    auth.onAuthStateChanged(async (user) => {
        const adminContainer = document.getElementById("admin-container");
        const authContainer = document.getElementById("auth-container");
        const logoutButton = document.getElementById("logout-button");

        if (user) {
            const adminStatus = await isAdmin(user.email);
            if (adminStatus) {
                // Admin is signed in
                adminContainer.style.display = "block";
                authContainer.style.display = "none";
                logoutButton.style.display = "block";
                loadPendingUsers();
            } else {
                // Not admin
                showStatus("Access denied. Admin only.", "error");
                auth.signOut();
            }
        } else {
            // Signed out
            adminContainer.style.display = "none";
            authContainer.style.display = "block";
            logoutButton.style.display = "none";
        }
    });
}

// Admin check function
async function isAdmin(email) {
    try {
        console.log("=== Admin Check Debug ===");
        const user = auth.currentUser;
        console.log("1. Current User:", user ? "exists" : "null");
        console.log("2. User UID:", user?.uid);
        
        // First check if we can access the admins collection
        console.log("3. Attempting to access admins collection...");
        const adminDoc = await db.collection('admins').doc('config').get();
        console.log("4. Admin Doc Access:", adminDoc ? "success" : "failed");
        console.log("5. Admin Doc Exists:", adminDoc.exists);
        
        if (!adminDoc.exists) {
            console.log("6. Error: Admin doc doesn't exist");
            return false;
        }
        
        const adminData = adminDoc.data();
        console.log("7. Admin Data:", adminData);
        console.log("8. Admin Users Array:", adminData.adminUsers);
        
        const isAdminUser = user && adminData.adminUsers.includes(user.uid);
        console.log("9. Is Admin Result:", isAdminUser);
        
        return isAdminUser;
    } catch (error) {
        console.error("10. Error in admin check:", error);
        console.error("Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Load pending users
function loadPendingUsers() {
    const pendingUsersList = document.getElementById("pending-users-list");
    
    console.log('Loading pending users...');
    
    db.collection('pendingUsers')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Pending users snapshot:', snapshot.size);
            pendingUsersList.innerHTML = '';
            
            if (snapshot.empty) {
                pendingUsersList.innerHTML = '<p>No pending users</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const user = doc.data();
                console.log('Pending user:', user);
                const userDiv = document.createElement('div');
                userDiv.className = 'pending-user';
                userDiv.innerHTML = `
                    <p>Email: ${user.email}</p>
                    <p>Requested: ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
                    <button onclick="approveUser('${doc.id}', '${user.email}')">Approve</button>
                    <button onclick="rejectUser('${doc.id}')" class="reject">Reject</button>
                `;
                pendingUsersList.appendChild(userDiv);
            });
        }, (error) => {
            console.error('Error loading pending users:', error);
            pendingUsersList.innerHTML = '<p>Error loading pending users</p>';
        });
}

// Approve user
async function approveUser(userId, userEmail) {
    try {
        // Get user data before deleting
        const userDoc = await db.collection('pendingUsers').doc(userId).get();
        const userData = userDoc.data();
        
        // Delete from pending users
        await db.collection('pendingUsers').doc(userId).delete();
        
        // Add to approved users collection (optional)
        await db.collection('approvedUsers').doc(userId).set({
            email: userEmail,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ...userData
        });
        
        showStatus("User approved successfully!", "success");
    } catch (error) {
        console.error("Error approving user:", error);
        showStatus("Error approving user", "error");
    }
}

// Reject user
async function rejectUser(userId) {
    try {
        await db.collection('pendingUsers').doc(userId).delete();
        showStatus("User rejected successfully!", "success");
    } catch (error) {
        console.error("Error rejecting user:", error);
        showStatus("Error rejecting user", "error");
    }
}

// Admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // isAdmin check will be handled by onAuthStateChanged
    } catch (error) {
        console.error("Login error:", error);
        showStatus("Invalid email or password", "error");
    }
}

// Logout
function logout() {
    auth.signOut()
        .then(() => {
            showStatus("Logged out successfully", "success");
        })
        .catch((error) => {
            console.error("Error logging out:", error);
            showStatus("Logout failed: " + error.message, "error");
        });
}

// Show status messages
function showStatus(message, type) {
    const status = document.getElementById("status");
    if (status) {
        status.textContent = message;
        status.className = type;
        status.style.display = "block";
        
        if (type === "success") {
            setTimeout(() => {
                status.style.display = "none";
            }, 5000);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
}); 
