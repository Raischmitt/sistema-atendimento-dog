import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  cargo: 'ADMIN' | 'PADRAO';
}

interface AuthStore {
  token: string | null;
  usuario: UsuarioAutenticado | null;
  autenticado: boolean;
  login: (token: string, usuario: UsuarioAutenticado) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      autenticado: false,

      login: (token, usuario) => {
        // Salva nos cookies para suportar proteção de rotas no Next.js
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        }
        set({ token, usuario, autenticado: true });
      },

      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_token=; path=/; max-age=0';
        }
        set({ token: null, usuario: null, autenticado: false });
      },

      isAdmin: () => {
        const u = get().usuario;
        return u?.cargo === 'ADMIN';
      },
    }),
    {
      name: 'doghouse_auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);