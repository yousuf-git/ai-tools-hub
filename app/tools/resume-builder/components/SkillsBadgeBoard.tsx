"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Check, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SkillCategory } from "@/lib/resume/types";

// Item ids embed their category so (category, skill) pairs stay globally unique
// during a drag. Assumes category names are unique (the norm for a resume).
const SEP = "::@::";
const itemId = (category: string, item: string) => `${category}${SEP}${item}`;

interface Props {
  categories: SkillCategory[];
  onChange: (next: SkillCategory[]) => void;
  /** `select` = toggle skills on/off + reorder (wizard). `edit` = add/remove skills + categories (profile). */
  mode: "select" | "edit";
  isSelected?: (category: string, item: string) => boolean;
  onToggle?: (category: string, item: string) => void;
}

/**
 * Drag-and-drop skills organiser rendered as badges. Reorder a skill within its
 * category, drop it onto another category, or drag the grip to reorder whole
 * categories. In `edit` mode badges can be added/removed and categories managed.
 */
export default function SkillsBadgeBoard({ categories, onChange, mode, isSelected, onToggle }: Props) {
  const [cats, setCats] = useState<SkillCategory[]>(categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setCats(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isCategory = (id: string) => cats.some((c) => c.category === id);
  const containerOf = (id: string): string | undefined => {
    if (isCategory(id)) return id;
    return cats.find((c) => c.items.some((it) => itemId(c.category, it) === id))?.category;
  };

  const commit = (next: SkillCategory[]) => {
    setCats(next);
    onChange(next.map((c) => ({ category: c.category, items: [...c.items] })));
  };

  function onDragStart(e: DragStartEvent) {
    dragging.current = true;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const active = String(e.active.id);
    if (isCategory(active) || !e.over) return;
    const from = containerOf(active);
    const to = containerOf(String(e.over.id));
    if (!from || !to || from === to) return;

    setCats((prev) => {
      const fromCat = prev.find((c) => c.category === from);
      const toCat = prev.find((c) => c.category === to);
      if (!fromCat || !toCat) return prev;
      const skill = fromCat.items.find((it) => itemId(from, it) === active);
      if (!skill || toCat.items.includes(skill)) return prev;

      const overId = String(e.over!.id);
      const overIndex = toCat.items.findIndex((it) => itemId(to, it) === overId);
      const insertAt = overIndex >= 0 ? overIndex : toCat.items.length;
      return prev.map((c) => {
        if (c.category === from) return { ...c, items: c.items.filter((it) => it !== skill) };
        if (c.category === to) {
          const items = [...c.items];
          items.splice(insertAt, 0, skill);
          return { ...c, items };
        }
        return c;
      });
    });
  }

  function onDragEnd(e: DragEndEvent) {
    dragging.current = false;
    setActiveId(null);
    const active = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return commit(cats);

    if (isCategory(active)) {
      const overCat = containerOf(overId);
      const from = cats.findIndex((c) => c.category === active);
      const to = cats.findIndex((c) => c.category === overCat);
      return commit(from >= 0 && to >= 0 && from !== to ? arrayMove(cats, from, to) : cats);
    }

    const cat = containerOf(active);
    const target = cats.find((c) => c.category === cat);
    if (target) {
      const from = target.items.findIndex((it) => itemId(cat!, it) === active);
      const to = target.items.findIndex((it) => itemId(cat!, it) === overId);
      if (from >= 0 && to >= 0 && from !== to) {
        return commit(cats.map((c) => (c.category === cat ? { ...c, items: arrayMove(c.items, from, to) } : c)));
      }
    }
    commit(cats);
  }

  // ---- mutations ----
  const deleteCategory = (category: string) => commit(cats.filter((c) => c.category !== category));
  // The name doubles as the drag id, so a rename must keep names unique and non-empty.
  const renameCategory = (from: string, to: string) => {
    const v = to.trim();
    if (!v || v === from || cats.some((c) => c.category === v)) return;
    commit(cats.map((c) => (c.category === from ? { ...c, category: v } : c)));
  };
  const deleteSkill = (category: string, item: string) =>
    commit(cats.map((c) => (c.category === category ? { ...c, items: c.items.filter((i) => i !== item) } : c)));
  const addSkill = (category: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    commit(cats.map((c) => (c.category === category ? (c.items.includes(v) ? c : { ...c, items: [...c.items, v] }) : c)));
  };
  const addCategory = (name: string) => {
    const v = name.trim();
    if (!v || cats.some((c) => c.category === v)) return;
    commit([...cats, { category: v, items: [] }]);
  };

  const activeLabel = activeId && !isCategory(activeId) ? activeId.split(SEP)[1] : activeId;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={cats.map((c) => c.category)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {cats.map((c) => (
            <SortableCategory
              key={c.category}
              category={c}
              mode={mode}
              onDelete={() => deleteCategory(c.category)}
              onRename={(to) => renameCategory(c.category, to)}
            >
              <SortableContext items={c.items.map((it) => itemId(c.category, it))} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.items.length === 0 && mode === "select" && (
                    <span className="text-xs text-muted-foreground italic py-0.5">drop skills here</span>
                  )}
                  {c.items.map((it) => (
                    <SortableSkill
                      key={itemId(c.category, it)}
                      id={itemId(c.category, it)}
                      label={it}
                      mode={mode}
                      selected={isSelected ? isSelected(c.category, it) : true}
                      onToggle={onToggle ? () => onToggle(c.category, it) : undefined}
                      onDelete={() => deleteSkill(c.category, it)}
                    />
                  ))}
                  {mode === "edit" && <AddSkillInput onAdd={(v) => addSkill(c.category, v)} />}
                </div>
              </SortableContext>
            </SortableCategory>
          ))}
        </div>
      </SortableContext>

      {mode === "edit" && <AddCategoryInput onAdd={addCategory} />}

      <DragOverlay>
        {activeId ? (
          isCategory(activeId) ? (
            <div className="rounded-md border bg-background px-2 py-1 text-xs font-medium shadow-lg">{activeLabel}</div>
          ) : (
            <span className="rounded-full border border-primary bg-primary px-2 py-0.5 text-xs text-primary-foreground shadow-lg">
              {activeLabel}
            </span>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCategory({
  category,
  mode,
  onDelete,
  onRename,
  children,
}: {
  category: SkillCategory;
  mode: "select" | "edit";
  onDelete: () => void;
  onRename: (to: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.category });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-md border bg-background p-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="mb-1.5 flex items-center gap-1">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`Reorder ${category.category || "category"}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <CategoryNameInput name={category.category} onRename={onRename} />
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${category.category || "category"}`}
          className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

// Buffers the name while typing. A rename changes the category's drag id and React
// key, so committing per keystroke would remount the row and steal focus mid-word.
// A committed rename remounts this input (new key), reseeding `value` from the prop.
function CategoryNameInput({ name, onRename }: { name: string; onRename: (to: string) => void }) {
  const [value, setValue] = useState(name);
  return (
    <Input
      value={value}
      placeholder="Category"
      aria-label={`Rename ${name || "category"}`}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") setValue(name);
      }}
      onBlur={() => {
        onRename(value);
        setValue(name);
      }}
      className="h-6 w-40 text-xs font-medium"
    />
  );
}

function SortableSkill({
  id,
  label,
  mode,
  selected,
  onToggle,
  onDelete,
}: {
  id: string;
  label: string;
  mode: "select" | "edit";
  selected: boolean;
  onToggle?: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const on = mode === "select" ? selected : true;
  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={mode === "select" ? onToggle : undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs touch-none transition-colors ${
        mode === "select" ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        isDragging
          ? "opacity-40 border-primary"
          : on
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-transparent text-muted-foreground hover:border-primary/60"
      }`}
      {...attributes}
      {...listeners}
    >
      {mode === "select" && on && <Check className="h-3 w-3" />}
      {label}
      {mode === "edit" && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          // Stop the drag sensor claiming this pointer so the tap deletes.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-muted-foreground/70 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function AddSkillInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [value, setValue] = useState("");
  const commit = () => {
    onAdd(value);
    setValue("");
  };
  return (
    <span className="inline-flex items-center">
      <Input
        value={value}
        placeholder="+ skill"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        className="h-6 w-24 rounded-full px-2 text-xs"
      />
    </span>
  );
}

function AddCategoryInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [value, setValue] = useState("");
  const commit = () => {
    onAdd(value);
    setValue("");
  };
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <Input
        value={value}
        placeholder="New category"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-7 w-44 text-xs"
      />
      <button
        type="button"
        onClick={commit}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" /> Add category
      </button>
    </div>
  );
}
