type ClickedRecipient = {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  clickedAt: string;
};

const columns = [
  { header: "Nome", key: "firstName", width: 18 },
  { header: "Sobrenome", key: "lastName", width: 24 },
  { header: "E-mail", key: "email", width: 38 },
  { header: "Cargo", key: "position", width: 32 },
  { header: "Departamento", key: "department", width: 32 },
  { header: "Gestor", key: "manager", width: 24 },
  { header: "E-mail do Gestor", key: "managerEmail", width: 38 },
] as const;

function filePart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 56) || "campanha"
  );
}

export async function exportClickedRecipients(
  campaignName: string,
  campaignId: number,
  recipients: ClickedRecipient[],
) {
  const uniqueClicked = new Map<string, ClickedRecipient>();
  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (email && recipient.clickedAt && !uniqueClicked.has(email)) {
      uniqueClicked.set(email, recipient);
    }
  }
  if (uniqueClicked.size === 0) return 0;

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PierSec";
  const sheet = workbook.addWorksheet("Clicados únicos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [...columns];
  sheet.autoFilter = `A1:G${uniqueClicked.size + 1}`;

  const header = sheet.getRow(1);
  header.height = 25;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF171717" },
  };
  header.alignment = { vertical: "middle", horizontal: "left" };

  for (const recipient of uniqueClicked.values()) {
    const row = sheet.addRow({
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      email: recipient.email,
      position: recipient.position,
      department: "",
      manager: "",
      managerEmail: "",
    });
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.numFmt = "@";
      cell.alignment = { vertical: "middle" };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileBytes = new Uint8Array(buffer as unknown as ArrayBuffer);
  const file = new Blob([fileBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clicados-${filePart(campaignName)}-${campaignId}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return uniqueClicked.size;
}
