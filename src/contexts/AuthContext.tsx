import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin emails - updated to include potentially relevant emails or placeholders
const ADMIN_EMAILS = ['admin@bu.ac.th', 'medisci.tak@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Connectivity check as per Firebase integration instructions
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
          console.warn("Firestore connection issue:", error.message);
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Validation: Must be @bu.ac.th domain (Allow bypass for hardcoded admins)
        const email = currentUser.email?.toLowerCase() || '';
        const isHardcodedAdmin = ADMIN_EMAILS.includes(email);
        
        // Dynamic admin check
        let isDynamicAdmin = false;
        try {
          const adminDoc = await getDoc(doc(db, 'admins', email));
          isDynamicAdmin = adminDoc.exists();
        } catch (err) {
          console.error("Admin check failed", err);
        }

        if (!email.endsWith('@bu.ac.th') && !isHardcodedAdmin && !isDynamicAdmin) {
          alert("อนุญาตเฉพาะอีเมล @bu.ac.th เท่านั้น (Only @bu.ac.th emails allowed)");
          signOut(auth);
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(currentUser);
          setIsAdmin(isHardcodedAdmin || isDynamicAdmin);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [loginLoading, setLoginLoading] = useState(false);

  const loginWithGoogle = async () => {
    if (loginLoading) return;
    
    const provider = new GoogleAuthProvider();
    // Prompt the user to select an account to help with "pending promise" issues
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    setLoginLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Pop-up blocked! Please allow pop-ups for this site to sign in.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Popup request was cancelled (likely a double click or rapid interaction).");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to alert
      } else {
        alert(`Login failed: ${error.message}`);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginLoading, loginWithGoogle, logout, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
