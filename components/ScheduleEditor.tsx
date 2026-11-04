"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  RotateCcw,
  Clock,
  Check,
  X,
  Edit2,
  Sparkles,
} from "lucide-react";
import type { Block, BlockKind } from "@/lib/schedule";
import { DEFAULT_BLOCKS, repack } from "@/lib/schedule";
import { fmtClock, fmtHM } from "@/lib/time";
import { useApp } from "@/lib/store";

export interface ScheduleEditorProps {
  blocks?: Block[];
  onSave?: (blocks: Block[]) => void;
  onClose?: () => void;
  className?: string;
}

const EMOJI_PRESETS = [
  "📚", "🌿", "📖", "🍱", "✍️", "🍿", "🌙", "☕", "🏃‍♀️", "🧘‍♀️", "🎨", "💻",
];

const KIND_OPTIONS: { kind: BlockKind; label: string }[] = [
  { kind: "study", label: "Study" },
  { kind: "walk", label: "Walk" },
  { kind: "meal", label: "Meal" },
  { kind: "relax", label: "Relax" },
  { kind: "wrap", label: "Wrap-Up" },
  { kind: "reflect", label: "Reflect" },
  { kind: "custom", label: "Custom" },
];

interface SortableBlockRowProps {
  block: Block;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDurationChange: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

function SortableBlockRow({
  block,
  index,
  total,
  onMove,
  onDurationChange,
  onDelete,
  onRename,
}: SortableBlockRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(block.title);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleTitleSubmit = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== block.title) {
      onRename(block.id, trimmed);
    } else {
      setTitleInput(block.title);
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-3 sm:p-4 space-y-3 transition-colors ${
        isDragging ? "shadow-lg ring-2 ring-sage" : "shadow-sm"
      }`}
    >
      {/* Top Row: Drag Handle + Move Buttons + Title + Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Accessible Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
            aria-label={`Drag to reorder ${block.title}`}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-ink/40 dark:text-cream/40 hover:text-sage hover:bg-sage/10 active:scale-90 transition-all flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          {/* WCAG Single-Pointer Fallback: Move Up / Down Buttons */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`Move ${block.title} up`}
              className="w-7 h-5 rounded flex items-center justify-center text-ink/50 dark:text-cream/50 hover:bg-sage/15 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`Move ${block.title} down`}
              className="w-7 h-5 rounded flex items-center justify-center text-ink/50 dark:text-cream/50 hover:bg-sage/15 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Emoji Badge */}
          <span className="text-xl select-none flex-shrink-0 ml-1" aria-hidden="true">
            {block.emoji}
          </span>

          {/* Title or Title Editor */}
          <div className="flex-1 min-w-0 ml-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSubmit();
                    if (e.key === "Escape") {
                      setTitleInput(block.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-sm font-sans font-medium px-2 py-1 rounded-lg border border-sage bg-cream dark:bg-mocha text-ink dark:text-cream focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTitleSubmit}
                  aria-label="Save block title"
                  className="w-8 h-8 rounded-lg bg-sage text-cream flex items-center justify-center"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput(block.title);
                    setIsEditingTitle(false);
                  }}
                  aria-label="Cancel title edit"
                  className="w-8 h-8 rounded-lg border border-[#EBE7DF] dark:border-[#383530] text-ink/60 dark:text-cream/60 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <h3 className="text-sm font-serif font-semibold text-ink dark:text-cream truncate leading-snug">
                  {block.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  aria-label={`Rename ${block.title}`}
                  className="opacity-40 group-hover:opacity-100 hover:text-sage transition-opacity p-1"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-xs font-sans text-ink/50 dark:text-cream/50 tabular-nums">
              {fmtClock(block.start)} - {fmtClock(block.start + block.duration)}
            </p>
          </div>
        </div>

        {/* Delete Block (Only if total > 1) */}
        {total > 1 && (
          <button
            type="button"
            onClick={() => onDelete(block.id)}
            aria-label={`Delete ${block.title}`}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-ink/40 dark:text-cream/40 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Row: Duration Steppers (-15m, -5m, value, +5m, +15m) */}
      <div className="pt-2 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-sans text-ink/60 dark:text-cream/60">
          <Clock className="w-3.5 h-3.5 text-sage" />
          <span>Duration:</span>
          <span className="font-semibold text-ink dark:text-cream tabular-nums ml-1">
            {fmtHM(block.duration * 60000)} ({block.duration}m)
          </span>
        </div>

        {/* Stepper Buttons (>=44px touch targets) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={block.duration <= 15}
            onClick={() => onDurationChange(block.id, -15)}
            aria-label={`Decrease ${block.title} by 15 minutes`}
            className="min-h-[44px] min-w-[36px] px-2 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] hover:bg-sage/10 text-[11px] font-sans font-medium text-ink dark:text-cream disabled:opacity-30 disabled:cursor-not-allowed tabular-nums flex items-center justify-center active:scale-95 transition-all"
          >
            -15m
          </button>
          <button
            type="button"
            disabled={block.duration <= 15}
            onClick={() => onDurationChange(block.id, -5)}
            aria-label={`Decrease ${block.title} by 5 minutes`}
            className="min-h-[44px] min-w-[32px] px-1.5 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] hover:bg-sage/10 text-[11px] font-sans font-medium text-ink dark:text-cream disabled:opacity-30 disabled:cursor-not-allowed tabular-nums flex items-center justify-center active:scale-95 transition-all"
          >
            -5m
          </button>
          <button
            type="button"
            onClick={() => onDurationChange(block.id, 5)}
            aria-label={`Increase ${block.title} by 5 minutes`}
            className="min-h-[44px] min-w-[32px] px-1.5 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] hover:bg-sage/10 text-[11px] font-sans font-medium text-ink dark:text-cream tabular-nums flex items-center justify-center active:scale-95 transition-all"
          >
            +5m
          </button>
          <button
            type="button"
            onClick={() => onDurationChange(block.id, 15)}
            aria-label={`Increase ${block.title} by 15 minutes`}
            className="min-h-[44px] min-w-[36px] px-2 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] hover:bg-sage/10 text-[11px] font-sans font-medium text-ink dark:text-cream tabular-nums flex items-center justify-center active:scale-95 transition-all"
          >
            +15m
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleEditor({
  blocks: propBlocks,
  onSave,
  onClose,
  className = "",
}: ScheduleEditorProps) {
  const storeTemplate = useApp((s) => s.template);
  const setTemplate = useApp((s) => s.setTemplate);

  // Local state for editing template blocks
  const [blocks, setBlocks] = useState<Block[]>(() =>
    propBlocks ? [...propBlocks] : [...storeTemplate]
  );

  // Add Custom Block Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📚");
  const [newKind, setNewKind] = useState<BlockKind>("study");
  const [newDuration, setNewDuration] = useState(60);

  // DnD Sensors: Pointer, Touch with 180ms delay for scroll safety, Keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Update schedule and propagate to store/props
  const commitBlocks = (newBlocks: Block[]) => {
    const repacked = repack(newBlocks, newBlocks[0]?.start ?? 900);
    setBlocks(repacked);
    setTemplate(repacked);
    if (onSave) {
      onSave(repacked);
    }
  };

  // Drag End handler
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = blocks.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    commitBlocks(reordered);
  };

  // Move Up / Move Down single-pointer button handler
  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const reordered = arrayMove(blocks, from, to);
    commitBlocks(reordered);
  };

  // Duration modification handler
  const handleDurationChange = (id: string, delta: number) => {
    const updated = blocks.map((b) => {
      if (b.id !== id) return b;
      const nextDuration = Math.max(15, b.duration + delta);
      return { ...b, duration: nextDuration };
    });
    commitBlocks(updated);
  };

  // Delete block handler
  const handleDelete = (id: string) => {
    if (blocks.length <= 1) return;
    const filtered = blocks.filter((b) => b.id !== id);
    commitBlocks(filtered);
  };

  // Rename block handler
  const handleRename = (id: string, newTitle: string) => {
    const updated = blocks.map((b) => (b.id === id ? { ...b, title: newTitle } : b));
    commitBlocks(updated);
  };

  // Reset to default schedule handler
  const handleResetToDefault = () => {
    commitBlocks(DEFAULT_BLOCKS);
  };

  // Add custom block handler
  const handleAddBlock = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const newBlock: Block = {
      id: `custom_${Date.now().toString(36)}`,
      title: trimmed,
      emoji: newEmoji,
      kind: newKind,
      start: 900, // Will be repacked
      duration: newDuration,
    };

    // Insert before 'reflect' if present, otherwise append
    const reflectIndex = blocks.findIndex((b) => b.kind === "reflect");
    let nextList: Block[];
    if (reflectIndex >= 0) {
      nextList = [
        ...blocks.slice(0, reflectIndex),
        newBlock,
        ...blocks.slice(reflectIndex),
      ];
    } else {
      nextList = [...blocks, newBlock];
    }

    commitBlocks(nextList);
    setNewTitle("");
    setShowAddForm(false);
  };

  return (
    <section
      aria-label="Schedule Editor"
      className={`space-y-4 ${className}`}
    >
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div>
          <h2 className="text-lg font-serif font-semibold text-ink dark:text-cream">
            Schedule Editor
          </h2>
          <p className="text-xs font-sans text-ink/60 dark:text-cream/60">
            Drag blocks to reorder, adjust durations, or add custom blocks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Defaults Button (>=44px touch target) */}
          <button
            type="button"
            onClick={handleResetToDefault}
            aria-label="Reset schedule to default blocks"
            className="min-h-[44px] px-3 rounded-xl border border-[#EBE7DF] dark:border-[#383530] text-xs font-sans font-medium text-ink/70 dark:text-cream/70 hover:bg-sage/10 flex items-center gap-1 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          {/* Close Editor Button if requested */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close schedule editor"
              className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#EBE7DF] dark:border-[#383530] text-ink/60 dark:text-cream/60 hover:text-ink active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* DnD Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {blocks.map((block, index) => (
              <SortableBlockRow
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                onMove={handleMove}
                onDurationChange={handleDurationChange}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Custom Block Trigger or Form */}
      <div className="pt-2">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            aria-label="Add new custom schedule block"
            className="w-full min-h-[48px] rounded-2xl border-2 border-dashed border-sage/40 dark:border-matcha/40 hover:border-sage hover:bg-sage/5 dark:hover:bg-sage/10 flex items-center justify-center gap-2 text-sm font-sans font-medium text-sage dark:text-matcha active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Block</span>
          </button>
        ) : (
          <div className="rounded-2xl bg-paper dark:bg-obsidian border border-sage/40 p-4 space-y-4 shadow-sm animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#EBE7DF] dark:border-[#383530]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sage" />
                <h3 className="text-sm font-serif font-semibold text-ink dark:text-cream">
                  Add Schedule Block
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                aria-label="Cancel adding block"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink/50 dark:text-cream/50 hover:bg-sage/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label
                htmlFor="new-block-title"
                className="block text-xs font-sans font-medium text-ink/75 dark:text-cream/75"
              >
                Block Title
              </label>
              <input
                id="new-block-title"
                type="text"
                placeholder="e.g. Japanese Kanji Practice"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#EBE7DF] dark:border-[#383530] bg-cream dark:bg-mocha text-sm text-ink dark:text-cream focus:outline-none focus:border-sage"
              />
            </div>

            {/* Emoji Selector */}
            <div className="space-y-1.5">
              <span className="block text-xs font-sans font-medium text-ink/75 dark:text-cream/75">
                Emoji Marker
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewEmoji(emoji)}
                    aria-label={`Select ${emoji} icon`}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                      newEmoji === emoji
                        ? "bg-sage/20 border-sage scale-105"
                        : "border-[#EBE7DF] dark:border-[#383530] hover:bg-sage/10"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Kind Selector */}
            <div className="space-y-1.5">
              <span className="block text-xs font-sans font-medium text-ink/75 dark:text-cream/75">
                Category
              </span>
              <div className="flex flex-wrap gap-1.5">
                {KIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setNewKind(opt.kind)}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-sans font-medium border transition-all ${
                      newKind === opt.kind
                        ? "bg-sage text-cream border-sage"
                        : "border-[#EBE7DF] dark:border-[#383530] text-ink/70 dark:text-cream/70 hover:bg-sage/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-1.5">
              <span className="block text-xs font-sans font-medium text-ink/75 dark:text-cream/75">
                Duration: <strong className="tabular-nums">{newDuration}m</strong> ({fmtHM(newDuration * 60000)})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[15, 30, 45, 60, 90, 120].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setNewDuration(dur)}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-sans font-medium tabular-nums border transition-all ${
                      newDuration === dur
                        ? "bg-sage text-cream border-sage"
                        : "border-[#EBE7DF] dark:border-[#383530] text-ink/70 dark:text-cream/70 hover:bg-sage/10"
                    }`}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button (>=44px touch target) */}
            <button
              type="button"
              disabled={!newTitle.trim()}
              onClick={handleAddBlock}
              aria-label="Save and add block to schedule"
              className="w-full min-h-[44px] rounded-xl bg-sage text-cream font-sans font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Add to Schedule</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
