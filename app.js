// Initialize Firebase Auth
const auth = firebase.auth();

// Check Authentication Status
function checkAuth() {
  auth.onAuthStateChanged((user) => {
    const authContainer = document.getElementById("auth-container");
    const logoutButton = document.getElementById("logout-button");
    const appContent = document.getElementById("app-content");
    const uploadContainer = document.querySelector(".upload-container");

    if (!authContainer || !logoutButton || !appContent) {
      console.error("Required DOM elements not found");
      return;
    }

    if (user) {
      // User is signed in
      authContainer.style.display = "none";
      logoutButton.style.display = "block";
      appContent.style.display = "block";
      if (uploadContainer) uploadContainer.style.display = "flex";
      showStatus(`Welcome ${user.email}!`, "success");
    } else {
      // User is signed out
      authContainer.style.display = "block";
      logoutButton.style.display = "none";
      appContent.style.display = "none";
      if (uploadContainer) uploadContainer.style.display = "none";
    }
  });
}

// Login Function
function login(email, password) {
  if (!email || !password) {
    showStatus("Please provide both email and password", "error");
    return;
  }

  showStatus("Logging in...", "info");
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showStatus("Successfully logged in!", "success");
      document.getElementById('password-input').value = ''; // Clear password for security
    })
    .catch((error) => {
      console.error("Error logging in:", error);
      showStatus("Invalid email or password", "error");
      document.getElementById('password-input').value = ''; // Clear password on error
    });
}

// Password Reset Function
function resetPassword(email) {
  if (!email) {
    showStatus("Please enter your email first", "error");
    return;
  }

  const actionCodeSettings = {
    url: 'https://10-bb4.pages.dev'
  };

  auth.sendPasswordResetEmail(email, actionCodeSettings)
    .then(() => {
      showStatus("Password reset email sent!", "success");
    })
    .catch((error) => {
      showStatus("Failed to send reset email", "error");
    });
}

// Logout Function
function logout() {
  auth.signOut().then(() => {
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    showStatus("Logged out successfully", "success");
  }).catch((error) => {
    showStatus("Logout failed", "error");
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize auth check
  checkAuth();

  // Form submit handler
  const form = document.getElementById('auth-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('email-input').value.trim();
      const password = document.getElementById('password-input').value;
      login(email, password);
    });
  }

  // Logout button handler
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  // Reset password button handler
  const resetButton = document.getElementById('reset-password-button');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      const email = document.getElementById('email-input').value.trim();
      resetPassword(email);
    });
  }

  // File input handler
  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) {
        showStatus("Please select a file", "error");
        return;
      }
      processExcelFile(file);
    });
  }
});

// Status Message Function
function showStatus(message, type) {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = message;
    status.className = type;
    status.style.display = "block";
    
    if (type === "success") {
      setTimeout(() => {
        status.style.display = "none";
      }, 3000);
    }
  }
}

[... Rest of your existing Excel processing code stays exactly the same ...]
    from the let workbookData = null declaration 
    to the end of the file, including all the 
    functions for processing Excel files, searching, 
    and displaying results ...]
