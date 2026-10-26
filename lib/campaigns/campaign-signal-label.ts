import { isDeliveryFailure } from "./delivery-statistics";

export function campaignSignalLabel(value: string | null) {
  if (!value) return "Sem status";
  const signal = value.toLowerCase();
  if (isDeliveryFailure(value)) return "Falhou";
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
  return "Estado não identificado";
}
