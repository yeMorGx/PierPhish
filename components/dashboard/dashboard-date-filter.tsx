"use client";

import {
  Calendar,
  DateField,
  DatePicker,
  I18nProvider,
  Label,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";

export type DashboardPeriod = "all" | "day" | "week" | "month" | "year";

const periodOptions: { id: DashboardPeriod; label: string }[] = [
  { id: "all", label: "Todo o período" },
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "year", label: "Ano" },
];

function localDate(date: CalendarDate) {
  return new Date(date.year, date.month - 1, date.day);
}

export function getDashboardDateRange(
  period: DashboardPeriod,
  reference: CalendarDate | null,
) {
  if (period === "all" || !reference) return null;

  let start = localDate(reference);
  if (period === "week") {
    const weekday = (start.getDay() + 6) % 7;
    start = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() - weekday,
    );
  } else if (period === "month") {
    start = new Date(start.getFullYear(), start.getMonth(), 1);
  } else if (period === "year") {
    start = new Date(start.getFullYear(), 0, 1);
  }

  const end = new Date(start);
  if (period === "day") end.setDate(end.getDate() + 1);
  if (period === "week") end.setDate(end.getDate() + 7);
  if (period === "month") end.setMonth(end.getMonth() + 1);
  if (period === "year") end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}

function moveReference(
  reference: CalendarDate,
  period: DashboardPeriod,
  step: number,
) {
  const start =
    getDashboardDateRange(period, reference)?.start ?? localDate(reference);
  const firstDay = new CalendarDate(
    start.getFullYear(),
    start.getMonth() + 1,
    start.getDate(),
  );
  if (period === "day") return firstDay.add({ days: step });
  if (period === "week") return firstDay.add({ weeks: step });
  if (period === "month") return firstDay.add({ months: step });
  return firstDay.add({ years: step });
}

function rangeLabel(period: DashboardPeriod, reference: CalendarDate | null) {
  const range = getDashboardDateRange(period, reference);
  if (!range) return "Todas as datas";
  const longDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (period === "day") return longDate.format(range.start);
  if (period === "month")
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(range.start);
  if (period === "year") return String(range.start.getFullYear());
  return `${longDate.format(range.start)} – ${longDate.format(new Date(range.end.getTime() - 1))}`;
}

type DashboardDateFilterProps = {
  period: DashboardPeriod;
  reference: CalendarDate | null;
  onPeriodChange: (period: DashboardPeriod) => void;
  onReferenceChange: (date: CalendarDate) => void;
  campaignCount: number;
};

export function DashboardDateFilter({
  period,
  reference,
  onPeriodChange,
  onReferenceChange,
  campaignCount,
}: DashboardDateFilterProps) {
  const currentDate = today(getLocalTimeZone());
  const nextReference =
    reference && period !== "all" ? moveReference(reference, period, 1) : null;
  const canAdvance = nextReference
    ? (getDashboardDateRange(period, nextReference)?.start.getTime() ??
        Infinity) <= Date.now()
    : false;

  return (
    <section
      className="dashboard-date-filter"
      aria-label="Filtrar campanhas pela data de início"
    >
      <div className="dashboard-date-filter-top">
        <div>
          <h2>Período de início</h2>
          <p>Filtra campanhas pela data em que começaram.</p>
        </div>
        <ToggleButtonGroup
          aria-label="Selecionar período"
          className="dashboard-date-periods"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([period])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0] as DashboardPeriod | undefined;
            if (!selected) return;
            if (selected !== "all" && !reference)
              onReferenceChange(today(getLocalTimeZone()));
            onPeriodChange(selected);
          }}
        >
          {periodOptions.map((option) => (
            <ToggleButton
              className="dashboard-date-period"
              id={option.id}
              key={option.id}
            >
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>

      <div className="dashboard-date-filter-bottom">
        <div className="dashboard-date-current" aria-live="polite">
          <strong>{rangeLabel(period, reference)}</strong>
          <span>
            {campaignCount} campanha{campaignCount === 1 ? "" : "s"} no recorte
          </span>
        </div>
        {period !== "all" && reference && (
          <div className="dashboard-date-controls">
            <button
              aria-label="Período anterior"
              className="dashboard-date-nav"
              onClick={() =>
                onReferenceChange(moveReference(reference, period, -1))
              }
              type="button"
            >
              ←
            </button>
            <button
              aria-label="Próximo período"
              className="dashboard-date-nav"
              disabled={!canAdvance}
              onClick={() =>
                onReferenceChange(moveReference(reference, period, 1))
              }
              type="button"
            >
              →
            </button>
            <I18nProvider locale="pt-BR">
              <DatePicker
                className="dashboard-date-picker"
                value={reference}
                maxValue={currentDate}
                onChange={(value) => {
                  if (value)
                    onReferenceChange(
                      new CalendarDate(value.year, value.month, value.day),
                    );
                }}
              >
                <Label>Data de referência</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover className="dashboard-date-popover">
                  <Calendar
                    aria-label="Escolher data de referência"
                    maxValue={currentDate}
                  >
                    <Calendar.Header>
                      <Calendar.Heading />
                      <Calendar.NavButton slot="previous" />
                      <Calendar.NavButton slot="next" />
                    </Calendar.Header>
                    <Calendar.Grid>
                      <Calendar.GridHeader>
                        {(day) => (
                          <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                        )}
                      </Calendar.GridHeader>
                      <Calendar.GridBody>
                        {(date) => <Calendar.Cell date={date} />}
                      </Calendar.GridBody>
                    </Calendar.Grid>
                  </Calendar>
                </DatePicker.Popover>
              </DatePicker>
            </I18nProvider>
            <button
              className="dashboard-date-today"
              onClick={() => onReferenceChange(today(getLocalTimeZone()))}
              type="button"
            >
              Período atual
            </button>
          </div>
        )}
      </div>
      <p className="dashboard-date-filter-note">
        As métricas mostram o total acumulado das campanhas selecionadas até a
        última sincronização.
      </p>
    </section>
  );
}
