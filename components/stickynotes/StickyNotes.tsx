"use client";

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveAs } from "file-saver";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";

type StickNotes = {
    id: string;
    textArea: string;
    color: string;
    isDone: boolean;
    isEditing: boolean;
};

const colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F"];

const SortableItem = ({ note, handleTextChange, handleNoteRemove, handleEditToggle, handleDone, downloadNotesAsTxt }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: note.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={{ ...style, backgroundColor: note.color, color: "white" }}
            {...attributes}
            {...listeners}
            className={`relative rounded-lg p-3 shadow-md select-none transition-all duration-200 ${isDragging ? "opacity-50 scale-95" : ""}`}
        >
            <div className="flex items-center justify-between mb-2">
                <h1 className="font-bold italic text-white text-sm">Drag to reorder or merge (hold Shift)</h1>
                <div className="flex items-center gap-2">
                    <div className="cursor-move text-white opacity-60 hover:opacity-100 text-lg">⋮⋮</div>
                    <MdDelete
                        onClick={() => handleNoteRemove(note.id)}
                        className="text-white text-xl cursor-pointer hover:text-red-300 transition"
                    />
                </div>
            </div>

            <textarea
                value={note.textArea}
                onChange={(e) => handleTextChange(note.id, e.target.value)}
                className="w-full h-32 bg-transparent resize-none outline-none text-sm"
                style={{ textDecoration: note.isDone ? "line-through" : "none" }}
                disabled={!note.isEditing || note.isDone}
            />

            <div className="flex gap-2 mt-3 flex-wrap">
                {(!note.isDone && note.textArea.length > 0) && (
                    note.isEditing ? (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditToggle(note.id, false)}
                            className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500"
                        >
                            Save
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleEditToggle(note.id, true)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Edit
                        </motion.button>
                    )
                )}
                {note.textArea.length > 0 && (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDone(note.id, !note.isDone)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {note.isDone ? "Undo" : "Done"}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-green-600 text-white w-32 h-11 rounded-lg shadow-lg"
                            onClick={downloadNotesAsTxt}
                        >
                            Download Note
                        </motion.button>
                    </>
                )}
            </div>
        </motion.div>
    );
};

const StickyNotes = () => {
    const [notes, setNotes] = useState<StickNotes[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        const saved = localStorage.getItem("stickyNotes");
        if (saved) {
            try {
                setNotes(JSON.parse(saved));
            } catch (err) {
                console.warn("Failed to parse saved notes", err);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("stickyNotes", JSON.stringify(notes));
    }, [notes]);

    const handleNoteAdd = (color: string) => {
        const newNote: StickNotes = {
            id: uuidv4(),
            textArea: "",
            color,
            isDone: false,
            isEditing: true,
        };
        setNotes(prev => [...prev, newNote]);
        setIsOpen(false);
    };

    const handleTextChange = (id: string, value: string) => {
        setNotes(prev => prev.map(note => note.id === id ? { ...note, textArea: value } : note));
    };

    const downloadNotesAsTxt = () => {
        const textContent = notes.map(note => note.textArea.trim()).join("\n\n");
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "sticky-notes.txt");
    };

    const handleNoteRemove = (id: string) => {
        setNotes(prev => prev.filter(note => note.id !== id));
    };

    const handleDone = (id: string, done: boolean) => {
        setNotes(prev => prev.map(note => note.id === id ? { ...note, isDone: done, isEditing: false } : note));
    };

    const handleEditToggle = (id: string, editing: boolean) => {
        setNotes(prev => prev.map(note => note.id === id ? { ...note, isEditing: editing } : note));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, activatorEvent } = event;
        if (!over || active.id === over.id) return;

        const activeIndex = notes.findIndex(n => n.id === active.id);
        const overIndex = notes.findIndex(n => n.id === over.id);

        if (activeIndex === -1 || overIndex === -1) return;

        const isShiftMerge =
            activatorEvent instanceof PointerEvent &&
            activatorEvent.shiftKey &&
            notes[activeIndex].textArea.trim() &&
            notes[overIndex].textArea.trim();

        if (isShiftMerge) {
            const updatedNotes = [...notes];
            updatedNotes[overIndex] = {
                ...updatedNotes[overIndex],
                textArea: `${updatedNotes[overIndex].textArea}\n\n${updatedNotes[activeIndex].textArea}`.trim(),
                isEditing: true,
            };
            updatedNotes.splice(activeIndex, 1);
            setNotes(updatedNotes);
        } else {
            setNotes(arrayMove(notes, activeIndex, overIndex));
        }
    };

    return (
        <div className="relative h-screen p-4 bg-gray-100">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={notes.map(note => note.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-24">
                        {notes.map(note => (
                            <SortableItem
                                key={note.id}
                                note={note}
                                handleTextChange={handleTextChange}
                                handleNoteRemove={handleNoteRemove}
                                handleEditToggle={handleEditToggle}
                                handleDone={handleDone}
                                downloadNotesAsTxt={downloadNotesAsTxt}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="fixed bottom-6 right-6 z-50">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg"
                    onClick={() => setIsOpen(prev => !prev)}
                >
                    Choose a color
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-16 right-0 bg-white shadow-lg rounded-lg p-3 flex gap-3"
                        >
                            {colors.map(color => (
                                <motion.button
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    key={color}
                                    onClick={() => handleNoteAdd(color)}
                                    className="w-8 h-8 rounded-full border border-gray-300"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StickyNotes;
