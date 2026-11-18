import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Printer,
  ShieldCheck,
  LogIn,
  Cloud,
  Users,
  Wifi,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { auth, googleProvider, ADMIN_EMAIL, RESTRICTED_ADMIN_EMAILS } from './config';
import firebaseConfig from '../../firebase-applet-config.json';

export const FIREBASE_AUTH_PROVIDERS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

interface FirebaseContextValue {
  user: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  isRestrictedAdmin: boolean;
  canAnnul: boolean;
  canManageSpreadsheets: boolean;
  isAnonymous: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  authLoading: true,
  isAdmin: false,
  isRestrictedAdmin: false,
  canAnnul: false,
  canManageSpreadsheets: true,
  isAnonymous: false,
  authError: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export function useFirebaseAuth() {
  return useContext(FirebaseContext);
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsAnonymousEnable, setNeedsAnonymousEnable] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const triedAnonRef = useRef(false);

  const attemptAnonymousSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInAnonymously(auth);
      setNeedsAnonymousEnable(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation'
      ) {
        setNeedsAnonymousEnable(true);
      } else if (code === 'auth/network-request-failed') {
        setAuthError(
          'Sem internet no primeiro acesso. Conecte-se uma única vez para ativar a sincronização ou entre quando o sinal voltar.'
        );
      } else {
        setAuthError('Não foi possível iniciar a sessão automática. Tente novamente ou entre com sua Conta Google.');
      }
      setAuthLoading(false);
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setNeedsAnonymousEnable(false);
        setAuthError(null);
        setAuthLoading(false);
        return;
      }

      if (!triedAnonRef.current) {
        triedAnonRef.current = true;
        attemptAnonymousSignIn();
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setNeedsAnonymousEnable(false);
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('A janela de login Google foi fechada antes de concluir.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.');
      } else if (code === 'auth/network-request-failed') {
        setAuthError('Sem conexão com a internet para fazer o login Google.');
      } else {
        setAuthError('Não foi possível entrar com a Conta Google. Tente novamente.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    try {
      triedAnonRef.current = false;
      await signOut(auth);
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const emailLower = (user?.email || '').toLowerCase();
  const isVerifiedGoogle = Boolean(user?.email && user.emailVerified);

  const isMasterAdmin = Boolean(
    isVerifiedGoogle && emailLower === ADMIN_EMAIL.toLowerCase()
  );

  const isRestrictedAdmin = Boolean(
    isVerifiedGoogle && RESTRICTED_ADMIN_EMAILS.some((e) => e.toLowerCase() === emailLower)
  );

  const isAdmin = isMasterAdmin || isRestrictedAdmin;
  const canAnnul = isMasterAdmin;
  const canManageSpreadsheets = !isRestrictedAdmin;

  const isAnonymous = Boolean(user?.isAnonymous);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B1B3D] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#0D52BD] flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <Printer className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight">MAQUIM — Lorena / SP</h1>
        <p className="text-sm text-blue-200/80 mt-2">Conectando ao banco de dados em nuvem...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#0B1B3D] text-white p-6 sm:p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0D52BD] flex items-center justify-center shadow-lg mb-4">
              <Printer className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">MAQUIM — Lorena / SP</h1>
            <p className="text-xs text-blue-200/80 mt-1 font-medium">
              Implantação 234 Impressoras & Retirada de Contrato
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {needsAnonymousEnable ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2.5 text-xs text-amber-950">
                <p className="font-bold text-sm text-amber-900">
                  Ativação pendente no Painel do Firebase (1 minuto)
                </p>
                <p className="leading-relaxed">
                  Para que os técnicos entrem direto <strong>sem precisar de Conta Google</strong>, falta apenas ativar o método de login <strong>Anônimo</strong> no Firebase Authentication:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-amber-900 font-medium">
                  <li>Abra o Console de Autenticação no botão abaixo;</li>
                  <li>Clique em <strong>Adicionar novo provedor</strong> → <strong>Anônimo</strong>;</li>
                  <li>Marque <strong>Ativar</strong> e clique em <strong>Salvar</strong>;</li>
                  <li>Volte aqui e toque em <strong>Entrar direto (Sem Conta Google)</strong>.</li>
                </ol>
                <a
                  href={FIREBASE_AUTH_PROVIDERS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Provedores no Firebase Console
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-4 h-4 text-[#0D52BD] shrink-0" />
                  <span>Banco de dados permanente no Google Firebase</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Uso simultâneo entre vários técnicos em campo</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Wifi className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Funciona offline após o primeiro acesso no aparelho</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Proteção automática contra instalação duplicada</span>
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={attemptAnonymousSignIn}
                disabled={signingIn}
                className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${signingIn ? 'animate-spin' : ''}`} />
                {signingIn ? 'Conectando...' : 'Entrar direto (Sem Conta Google)'}
              </button>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="w-full py-3 px-5 bg-[#0D52BD] hover:bg-[#0B1B3D] disabled:opacity-60 text-white font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Entrar com Conta Google (Administrador / Equipe)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authLoading,
        isAdmin,
        isRestrictedAdmin,
        canAnnul,
        canManageSpreadsheets,
        isAnonymous,
        authError,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};
