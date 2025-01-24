// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';
import { showBodyDetailsModal, hideBodyDetailsModal } from './modals.js';

const firebaseConfig = {
  apiKey: "AIzaSyAtBxeZrh4cej7ZzsKZ5uN-BqC_wxoTmdE",
  authDomain: "coreai-82c79.firebaseapp.com",
  projectId: "coreai-82c79",
  storageBucket: "coreai-82c79.firebasestorage.app",
  messagingSenderId: "97395011364",
  appId: "1:97395011364:web:1e8f6a06fce409bfd80db1",
  measurementId: "G-0J1RLMVEGC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Handle Authentication State Changes
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Check if user has body details
        const userDetailsRef = doc(db, 'body-details', user.uid);
        const userDetailsDoc = await getDoc(userDetailsRef);
        
        if (!userDetailsDoc.exists()) {
          showBodyDetailsModal();
        }

        // Update UI
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        // Update user info
        updateUserInfo(user);
      } catch (error) {
        console.error('Error checking body details:', error);
      }
    } else {
      document.getElementById('loginPage').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
    }
  });
}

function updateUserInfo(user) {
  const userNameElements = document.querySelectorAll('.user-name');
  userNameElements.forEach(el => el.textContent = user.displayName);
  
  const userAvatars = document.querySelectorAll('.user-avatar');
  userAvatars.forEach(avatar => {
    avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4f46e5&color=fff`;
  });
}

export async function saveBodyDetails(details) {
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(doc(db, 'body-details', user.uid), {
        ...details,
        updatedAt: new Date().toISOString()
      });
      hideBodyDetailsModal();
    } catch (error) {
      console.error('Error saving body details:', error);
      alert('Failed to save body details. Please try again.');
    }
  }
}

export function signInWithGoogle() {
  signInWithPopup(auth, provider)
    .catch((error) => {
      console.error('Error signing in:', error);
      document.getElementById('loginError').textContent = 'Failed to sign in. Please try again.';
    });
}

export function handleSignOut() {
  signOut(auth).catch((error) => {
    console.error('Error signing out:', error);
  });
}
