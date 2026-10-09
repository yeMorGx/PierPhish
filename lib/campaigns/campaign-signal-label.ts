export function campaignSignalLabel(value: string | null) {
  if (!value) return "Sem status";
  const signal = value.toLowerCase();
  if (
    ["submitted", "submit", "data sent", "dados enviados", "enviou dados"].some(
      (part) => signal.includes(part),
    )
  )
    return "Dados enviados";
  if (signal.includes("click") || signal.includes("link")) return "Clicou";
  if (signal.includes("report")) return "Reportou";
  if (signal.includes("open")) return "Abriu";
  if (signal.includes("deliver")) return "Entregue";
  if (signal.includes("send") || signal.includes("sent")) return "Enviado";
  if (["fail", "error", "bounce"].some((part) => signal.includes(part)))
    return "Falhou";
  return "Estado não identificado";
}
