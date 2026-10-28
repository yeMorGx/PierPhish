"use client";

import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  I18nProvider,
  Label,
  ListBox,
  NumberField,
  Popover,
  Select,
  FieldError,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type DashboardPeriod = "all" | "day" | "week" | "month" | "year";

const periodOptions: { id: DashboardPeriod; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "year", label: "Ano" },
];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(2024, index, 1),
  ),
}));

const currentPeriodLabels: Record<Exclude<DashboardPeriod, "all">, string> = {
  day: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  year: "Este ano",
};

function localDate(date: CalendarDate) {
  return date.toDate(getLocalTimeZone());
}

export function getDashboardDateRange(
  period: DashboardPeriod,
  reference: CalendarDate | null,
) {
  if (period === "all" || !reference) return null;

  let start = reference;
  if (period === "week") {
    const weekday = (localDate(reference).getDay() + 6) % 7;
    start = reference.subtract({ days: weekday });
  } else if (period === "month") {
    start = reference.set({ day: 1 });
  } else if (period === "year") {
    start = reference.set({ month: 1, day: 1 });
  }

  const duration =
    period === "day"
      ? { days: 1 }
      : period === "week"
        ? { weeks: 1 }
        : period === "month"
          ? { months: 1 }
          : { years: 1 };
  return { start: localDate(start), end: localDate(start.add(duration)) };
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

export function formatDashboardPeriodLabel(
  period: DashboardPeriod,
  reference: CalendarDate | null,
) {
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

const rangeLabel = formatDashboardPeriodLabel;

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
  const isCurrentPeriod =
    getDashboardDateRange(period, reference)?.start.getTime() ===
    getDashboardDateRange(period, currentDate)?.start.getTime();

  return (
    <I18nProvider locale="pt-BR">
      <Popover>
        <Popover.Trigger<"button">
          render={(props) => <button {...props} type="button" />}
          className="dashboard-date-trigger"
          aria-label={`Filtrar campanhas por período: ${rangeLabel(period, reference)}`}
          title={rangeLabel(period, reference)}
        >
          <CalendarDays size={14} aria-hidden="true" />
          <span>
            {period === "all"
              ? "Todo o período"
              : rangeLabel(period, reference)}
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Content
          className="dashboard-date-panel"
          placement="bottom end"
          offset={8}
        >
          <Popover.Dialog
            className="dashboard-date-filter"
            data-period={period}
          >
            <div className="dashboard-date-filter-top">
              <div>
                <Popover.Heading>Período das campanhas</Popover.Heading>
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
              <div
                className="dashboard-date-current"
                aria-live="polite"
                aria-atomic="true"
              >
                <strong>{rangeLabel(period, reference)}</strong>
                <span>
                  {new Intl.NumberFormat("pt-BR").format(campaignCount)}{" "}
                  campanha
                  {campaignCount === 1 ? "" : "s"} no período
                </span>
              </div>
              {period !== "all" && reference && (
                <div className="dashboard-date-controls">
                  <div
                    className="dashboard-date-navigation"
                    role="group"
                    aria-label="Navegar entre períodos"
                  >
                    <Button
                      aria-label="Período anterior"
                      className="dashboard-date-nav"
                      variant="secondary"
                      onPress={() =>
                        onReferenceChange(moveReference(reference, period, -1))
                      }
                      type="button"
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label="Próximo período"
                      className="dashboard-date-nav"
                      variant="secondary"
                      isDisabled={!canAdvance}
                      onPress={() =>
                        onReferenceChange(moveReference(reference, period, 1))
                      }
                      type="button"
                    >
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                  {(period === "day" || period === "week") && (
                    <DatePicker
                      key={period}
                      className="dashboard-date-picker"
                      isRequired
                      shouldForceLeadingZeros
                      value={reference}
                      maxValue={currentDate}
                      onChange={(value) => {
                        if (value && value.compare(currentDate) <= 0)
                          onReferenceChange(
                            new CalendarDate(
                              value.year,
                              value.month,
                              value.day,
                            ),
                          );
                      }}
                    >
                      <Label>
                        {period === "week"
                          ? "Dia da semana desejada"
                          : "Escolher dia"}
                      </Label>
                      <DateField.Group>
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                        <DateField.Suffix>
                          <DatePicker.Trigger aria-label="Abrir calendário">
                            <DatePicker.TriggerIndicator />
                          </DatePicker.Trigger>
                        </DateField.Suffix>
                      </DateField.Group>
                      <FieldError className="dashboard-date-error">
                        Informe uma data válida até hoje.
                      </FieldError>
                      <DatePicker.Popover
                        className="dashboard-date-popover"
                        placement="bottom end"
                      >
                        <Calendar
                          aria-label="Escolher data de referência"
                          maxValue={currentDate}
                          firstDayOfWeek="mon"
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
                  )}
                  {period === "month" && (
                    <Select
                      aria-label="Escolher mês"
                      className="dashboard-date-month"
                      variant="secondary"
                      value={String(reference.month)}
                      disabledKeys={
                        reference.year === currentDate.year
                          ? monthOptions
                              .filter(
                                (month) => Number(month.id) > currentDate.month,
                              )
                              .map((month) => month.id)
                          : []
                      }
                      onChange={(value) => {
                        if (typeof value === "string")
                          onReferenceChange(
                            new CalendarDate(reference.year, Number(value), 1),
                          );
                      }}
                    >
                      <Label>Mês</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="dashboard-date-month-popover">
                        <ListBox aria-label="Meses">
                          {monthOptions.map((month) => (
                            <ListBox.Item
                              id={month.id}
                              key={month.id}
                              textValue={month.label}
                            >
                              <Label>{month.label}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  {(period === "month" || period === "year") && (
                    <NumberField
                      className="dashboard-date-year"
                      variant="secondary"
                      value={reference.year}
                      minValue={1}
                      maxValue={currentDate.year}
                      step={1}
                      formatOptions={{ useGrouping: false }}
                      onChange={(year) => {
                        if (
                          !Number.isInteger(year) ||
                          year < 1 ||
                          year > currentDate.year
                        )
                          return;
                        const month =
                          period === "year"
                            ? 1
                            : year === currentDate.year
                              ? Math.min(reference.month, currentDate.month)
                              : reference.month;
                        onReferenceChange(new CalendarDate(year, month, 1));
                      }}
                    >
                      <Label>Ano</Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton aria-label="Ano anterior" />
                        <NumberField.Input />
                        <NumberField.IncrementButton aria-label="Próximo ano" />
                      </NumberField.Group>
                      <FieldError className="dashboard-date-error">
                        Informe um ano válido até {currentDate.year}.
                      </FieldError>
                    </NumberField>
                  )}
                  <Button
                    className="dashboard-date-today"
                    variant="secondary"
                    isDisabled={isCurrentPeriod}
                    onPress={() => onReferenceChange(today(getLocalTimeZone()))}
                    type="button"
                  >
                    {currentPeriodLabels[period]}
                  </Button>
                </div>
              )}
            </div>
            <p className="dashboard-date-filter-note">
              {period === "week" && "Semanas de segunda a domingo. "}
              As métricas mostram o total acumulado das campanhas selecionadas
              até a última sincronização.
            </p>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </I18nProvider>
  );
}
