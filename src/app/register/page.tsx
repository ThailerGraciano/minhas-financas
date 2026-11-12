'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import { BrandLogo } from '@/components/brand-logo';
import { InteractiveBackground } from '@/components/InteractiveBackground';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await registerUser({ name, email, password });

      if (!result.success) {
        setError(result.error || 'Erro ao criar a conta.');
      } else {
        router.push('/login');
      }
    } catch {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0B10] relative overflow-hidden px-4">
      <InteractiveBackground />

      <div className="relative w-full max-w-md z-10">
        <div className="absolute -inset-2 bg-[#820AD1]/25 blur-3xl opacity-60 rounded-[3rem] pointer-events-none" />

        <Card className="relative overflow-hidden w-full border-[#BA42FF]/20 bg-[#08040F]/80 backdrop-blur-2xl shadow-[0_0_50px_-12px_rgba(130,10,209,0.45)] rounded-2xl">
          <div className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-[#BA42FF]/25 via-[#820AD1]/10 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-tr from-[#5E0BE0]/25 via-[#820AD1]/10 to-transparent blur-2xl" />

          <CardHeader className="space-y-3 text-center pb-6 relative z-10">
            <div className="mx-auto pt-2">
              <BrandLogo variant="stacked" iconSize={76} />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white pt-1">Criar uma conta</CardTitle>
            <CardDescription className="text-gray-400">Comece a controlar suas finanças hoje</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md border border-red-400/20">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full font-semibold transition-all"
              isLoading={isLoading} disabled={isLoading}
            >
              
              {isLoading ? 'Criando conta...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center border-t border-white/5 pt-6 pb-2 relative z-10">
          <p className="text-sm text-gray-400">
            Já possui uma conta?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Faça login
            </Link>
          </p>
        </CardFooter>
        </Card>
      </div>
    </div>
  );
}
