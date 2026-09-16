"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InteractiveBackground } from "@/components/InteractiveBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0B10] relative overflow-hidden text-white font-sans">
      <InteractiveBackground />

      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-xs font-medium text-gray-300">Sistemas Operacionais</span>
        </div>

        <div className="flex items-center bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <span className="text-xs font-medium text-gray-300">PT-BR</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center z-10 px-4">
        <div className="relative w-full max-w-md">
          {/* Ambient Glow */}
          <div className="absolute -inset-2 bg-primary/20 blur-3xl opacity-60 rounded-[3rem] pointer-events-none" />

          <Card className="relative w-full border-white/10 bg-[#0B0B10]/60 backdrop-blur-xl shadow-2xl rounded-2xl">
            <Tabs defaultValue="entrar" className="w-full">
              <CardHeader className="space-y-4 text-center pb-6">
                <div className="mx-auto pt-2">
                  <h1 className="text-4xl font-extrabold tracking-tighter bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent drop-shadow-sm">
                    B / MF
                  </h1>
                </div>
                <CardDescription className="text-gray-400">Gerencie suas finanças com inteligência</CardDescription>

                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-lg mt-4">
                  <TabsTrigger
                    value="entrar"
                    className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 transition-all"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="criar"
                    onClick={() => router.push("/register")}
                    className="rounded-md data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 transition-all"
                  >
                    Criar conta
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="entrar" className="mt-0">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">
                        E-mail
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">
                        Senha
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="remember"
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary accent-primary cursor-pointer transition-colors"
                        />
                        <Label htmlFor="remember" className="text-sm font-normal text-gray-400 cursor-pointer">
                          Lembrar de mim por 30 dias
                        </Label>
                      </div>
                      <Link
                        href="#"
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>

                    {error && (
                      <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md border border-red-400/20">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full font-semibold transition-all bg-primary text-primary-foreground shadow-lg shadow-primary/25 h-11 mt-2 hover:brightness-110 hover:bg-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar na conta"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full p-6 z-20 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">&copy; 2026 BudgetBuddy. Todos os direitos reservados.</p>
        <div className="flex gap-6">
          <Link href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
            Termos de Serviço
          </Link>
          <Link href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
            Privacidade
          </Link>
          <Link href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
            Segurança
          </Link>
        </div>
      </footer>
    </div>
  );
}
