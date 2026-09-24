'use client'

import { useEffect, useState } from 'react'

type Servico = { id:string; nome:string; duracao_minutos:number }
type Cliente = { id:string; nome:string; telefone:string }
type Horario = { inicio:string; fim:string; hora:string }

export function AgendamentoManualForm({ data, servicos, clientes, action }:{ data:string; servicos:Servico[]; clientes:Cliente[]; action:(formData:FormData)=>void|Promise<void> }) {
  const [servicoId,setServicoId]=useState('')
  const [clienteId,setClienteId]=useState('')
  const [horarios,setHorarios]=useState<Horario[]>([])
  const [hora,setHora]=useState('')
  const [carregando,setCarregando]=useState(false)
  const [erro,setErro]=useState('')

  useEffect(()=>{
    setHora(''); setHorarios([]); setErro('')
    if(!servicoId) return
    let ativo=true
    ;(async()=>{
      setCarregando(true)
      try {
        const r=await fetch(`/api/disponibilidade?${new URLSearchParams({servico:servicoId,data})}`,{cache:'no-store'})
        const j=await r.json()
        if(!ativo)return
        if(!r.ok){setErro(j.erro||'Não foi possível consultar os horários.');return}
        setHorarios(j.horarios||[])
      } catch { if(ativo)setErro('Não foi possível consultar os horários.') }
      finally { if(ativo)setCarregando(false) }
    })()
    return()=>{ativo=false}
  },[servicoId,data])

  return <form action={action} className="card stack">
    <h2>Novo agendamento</h2>
    <input type="hidden" name="data" value={data}/>
    <div className="field">
      <label>Cliente cadastrado <span className="muted small">(opcional)</span></label>
      <select className="select" name="cliente_id" value={clienteId} onChange={e=>setClienteId(e.target.value)}>
        <option value="">Novo cliente / preencher abaixo</option>
        {clientes.map(c=><option key={c.id} value={c.id}>{c.nome} — {c.telefone}</option>)}
      </select>
    </div>
    {!clienteId&&<>
      <div className="field"><label>Nome do novo cliente</label><input className="input" name="nome" required maxLength={120}/></div>
      <div className="field"><label>Telefone do novo cliente</label><input className="input" name="telefone" required inputMode="tel" placeholder="(75) 99999-9999"/></div>
    </>}
    <div className="field">
      <label>Serviço</label>
      <select className="select" name="servico_id" required value={servicoId} onChange={e=>setServicoId(e.target.value)}>
        <option value="" disabled>Selecione</option>
        {servicos.map(s=><option key={s.id} value={s.id}>{s.nome} — {s.duracao_minutos} min</option>)}
      </select>
    </div>
    {servicoId&&<div className="field">
      <label>Horário disponível</label>
      {carregando?<p className="muted small">Consultando horários...</p>:horarios.length?<div className="manual-times">{horarios.map(h=><label className={`manual-time ${hora===h.hora?'selected':''}`} key={h.inicio}><input type="radio" name="hora" value={h.hora} checked={hora===h.hora} onChange={()=>setHora(h.hora)}/><span>{h.hora}</span></label>)}</div>:<p className="muted small">Não há horários disponíveis para este serviço nesta data.</p>}
    </div>}
    {erro&&<div className="notice notice-error">{erro}</div>}
    <div className="field"><label>Observações</label><textarea className="textarea" name="observacoes" maxLength={500}/></div>
    <button className="btn btn-primary" disabled={!servicoId||!hora}>Agendar</button>
  </form>
}
