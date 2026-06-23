import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login', // Pode apontar para sua página de login customizada depois
  },
  providers: [], // O Credentials será adicionado em auth.ts para evitar conflitos no middleware Edge
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      return true; // Lógica de proteção de rotas pode ser feita aqui
    },
  },
} satisfies NextAuthConfig;
