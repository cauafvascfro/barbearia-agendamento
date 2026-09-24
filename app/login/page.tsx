import { login } from './actions'

type Props = { searchParams: Promise<{ erro?: string }> }
export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams
  const mensagem = erro === 'credenciais' ? 'E-mail ou senha incorretos.' : erro === 'campos' ? 'Informe e-mail e senha.' : null
  return <main className="center-shell newstyle-login"><section className="login-card stack-lg"><div className="login-brand"><div className="brand-mark brand-mark-small" aria-hidden="true"><span className="brand-crown">♛</span><strong>NS</strong></div><div><p className="eyebrow">Administração</p><h1 className="page-title">New Style</h1><p className="muted">Entre para gerenciar agenda, clientes e serviços.</p></div></div>{mensagem && <div className="notice notice-error">{mensagem}</div>}<form action={login} className="stack"><div className="field"><label htmlFor="email">E-mail</label><input className="input" id="email" name="email" type="email" autoComplete="email" required /></div><div className="field"><label htmlFor="senha">Senha</label><input className="input" id="senha" name="senha" type="password" autoComplete="current-password" required /></div><button className="btn btn-brand btn-block" type="submit">Entrar no painel</button></form></section></main>
}
