"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useUiStore, type DashboardWidgetId } from "@/lib/ui-store";

const labels: Record<DashboardWidgetId, { label: string; hint: string }> = {
  hero: { label: "Abertura consolidada", hint: "Indicador principal" },
  metrics: { label: "Métricas rápidas", hint: "Campanhas e pessoas" },
  chart: { label: "Abertura por campanha", hint: "Comparativo visual" },
  risk: { label: "Risco humano", hint: "Sinais de exposição" },
  campaigns: { label: "Visão de campanhas", hint: "Atalhos para detalhes" },
};

function SortableWidget({ id }: { id: DashboardWidgetId }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className="settings-widget-order-item"
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <button
        className="settings-widget-order-handle"
        type="button"
        aria-label={`Mover ${labels[id].label}`}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={16} strokeWidth={1.7} />
      </button>
      <span>
        <strong>{labels[id].label}</strong>
        <small>{labels[id].hint}</small>
      </span>
    </div>
  );
}

export function DashboardWidgetOrderEditor() {
  const order = useUiStore((state) => state.dashboardWidgetOrder);
  const setOrder = useUiStore((state) => state.setDashboardWidgetOrder);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as DashboardWidgetId);
    const newIndex = order.indexOf(over.id as DashboardWidgetId);
    setOrder(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <section className="settings-widget-order-card">
      <div>
        <span className="settings-panel-label">ORDEM DOS MÓDULOS</span>
        <h3>Organize a leitura visual</h3>
        <p>Essa ordem é usada no dashboard visual deste navegador.</p>
      </div>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="settings-widget-order-list">
            {order.map((id) => (
              <SortableWidget id={id} key={id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
