import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/firebaseConfig';

const AuthContext = createContext(null);

const DEMO_USERS = {
  'gestor@bar.com': {
    uid: 'gestor_01_uid',
    nome: 'Marina Gestora',
    email: 'gestor@bar.com',
    role: 'gestor',
    status: 'ativo',
    data_criacao: '2026-11-10T19:00:00Z',
  },
  'carlos@bar.com': {
    uid: 'abc123xyz',
    nome: 'Carlos Bartender',
    email: 'carlos@bar.com',
    role: 'bartender',
    status: 'ativo',
    data_criacao: '2026-11-10T19:30:00Z',
  },
};

const STORAGE_KEY = 'cmv_bar_auth_user_v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Verifica sessão salva localmente primeiro (suporte híbrido Firebase + Demo)
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const profileData = userSnap.data();
            const fullUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...profileData,
            };
            setUser(fullUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUser));
          } else {
            // Fallback caso o documento ainda não exista na coleção users
            const fallbackRole =
              firebaseUser.email?.includes('gestor') ? 'gestor' : 'bartender';
            const fullUser = {
              uid: firebaseUser.uid,
              nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              email: firebaseUser.email,
              role: fallbackRole,
              status: 'ativo',
              data_criacao: new Date().toISOString(),
            };
            setUser(fullUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUser));
          }
        } catch (err) {
          console.error('Erro ao buscar perfil do usuário no Firestore:', err);
        }
      } else if (!localStorage.getItem(STORAGE_KEY)) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login(email, password) {
    setAuthError('');
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Se o Firebase estiver configurado com chaves reais, tenta autenticar no Firebase Auth
    if (isFirebaseConfigured) {
      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const userDocRef = doc(db, 'users', credential.user.uid);
        const userSnap = await getDoc(userDocRef);

        let fullUser;
        if (userSnap.exists()) {
          fullUser = {
            uid: credential.user.uid,
            email: credential.user.email,
            ...userSnap.data(),
          };
        } else {
          fullUser = {
            uid: credential.user.uid,
            nome: credential.user.displayName || normalizedEmail.split('@')[0],
            email: credential.user.email,
            role: normalizedEmail.includes('gestor') ? 'gestor' : 'bartender',
            status: 'ativo',
            data_criacao: new Date().toISOString(),
          };
        }

        if (fullUser.status !== 'ativo') {
          await firebaseSignOut(auth);
          throw new Error('Usuário inativo. Contate o administrador.');
        }

        setUser(fullUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUser));
        return fullUser;
      } catch (err) {
        // Se for uma das contas de demonstração, permite fallback para facilitar homologação
        if (DEMO_USERS[normalizedEmail] && password.length >= 4) {
          const demoUser = DEMO_USERS[normalizedEmail];
          setUser(demoUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
          return demoUser;
        }
        const msg =
          err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'E-mail ou senha inválidos.'
            : err.message || 'Falha ao autenticar.';
        setAuthError(msg);
        throw new Error(msg);
      }
    }

    // 2. Modo Local / Homologação quando o .env ainda não foi preenchido
    if (DEMO_USERS[normalizedEmail] && password.length >= 4) {
      const demoUser = DEMO_USERS[normalizedEmail];
      setUser(demoUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    const errorMsg =
      'Credenciais não encontradas. Use gestor@bar.com ou carlos@bar.com (qualquer senha de 4+ dígitos).';
    setAuthError(errorMsg);
    throw new Error(errorMsg);
  }

  function loginQuickProfile(role) {
    setAuthError('');
    const targetUser =
      role === 'gestor' ? DEMO_USERS['gestor@bar.com'] : DEMO_USERS['carlos@bar.com'];
    setUser(targetUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targetUser));
    return targetUser;
  }

  async function logout() {
    setAuthError('');
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    if (isFirebaseConfigured) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.error('Erro ao desconectar do Firebase:', e);
      }
    }
  }

  const value = {
    user,
    loading,
    authError,
    isGestor: user?.role === 'gestor',
    isBartender: user?.role === 'bartender',
    login,
    loginQuickProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}

