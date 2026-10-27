export function participantInteractions(status: string | null | undefined) {
  const normalized = (status ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  const submitted =
    /submitted|submit|dados enviados|enviou dados|data sent/.test(normalized);
  return {
    clicked: submitted || /click|clicou|clicado/.test(normalized),
    submitted,
  };
}
