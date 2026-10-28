import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Conta({ emailAtual }: { emailAtual: string }) {
  const [email, setEmail] = useState("");
  const [atual, setAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [msgE, setMsgE] = useState("");
  const [msgS, setMsgS] = useState("");

  async function trocarEmail(e: React.FormEvent) {
    e.preventDefault(); setMsgE("");
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + "/admin" });
    setMsgE(error ? error.message : "Pronto! Se for pedido, confirme pelo link enviado ao novo e-mail. Até lá, continue entrando com o e-mail atual.");
  }
  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault(); setMsgS("");
    if (senha.length < 8) return setMsgS("A nova senha precisa ter pelo menos 8 caracteres.");
    if (senha !== conf) return setMsgS("As senhas não coincidem.");
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email: emailAtual, password: atual });
    if (errLogin) return setMsgS("Senha atual incorreta.");
    const { error } = await supabase.auth.updateUser({ password: senha, current_password: atual } as { password: string });
    if (error) setMsgS(error.message);
    else { setMsgS("Senha alterada com sucesso!"); setAtual(""); setSenha(""); setConf(""); }
  }

  const input = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  return (
    <div className="mt-12 max-w-2xl space-y-8 border-t pt-10">
      <div>
        <h2 className="text-3xl">Acesso ao painel</h2>
        <p className="text-sm text-muted-foreground">E-mail atual: {emailAtual}</p>
      </div>
      <form onSubmit={trocarEmail} className="space-y-3">
        <label className="block text-sm">Novo e-mail de acesso<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
        <button className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Alterar e-mail</button>
        {msgE && <p className="text-sm text-muted-foreground">{msgE}</p>}
      </form>
      <form onSubmit={trocarSenha} className="space-y-3">
        <label className="block text-sm">Senha atual<input type="password" required value={atual} onChange={(e) => setAtual(e.target.value)} className={input} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Nova senha<input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} className={input} /></label>
          <label className="block text-sm">Repita a nova senha<input type="password" required value={conf} onChange={(e) => setConf(e.target.value)} className={input} /></label>
        </div>
        <button className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Alterar senha</button>
        {msgS && <p className="text-sm text-muted-foreground">{msgS}</p>}
      </form>
    </div>
  );
}
