"use client"
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdDelete } from "react-icons/md";
import { saveAs } from 'file-saver';

type StickNotes = {
    id: string;
    textArea: string;
    color: string;
    isDone: boolean;
    isEditing: boolean;
};

const colors = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F"];

const StickyNotes = () => {
    const [notes, setNotes] = useState<StickNotes[]>([]);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [draggedNote, setDraggedNote] = useState<string | null>(null);
    const [draggedOverNote, setDraggedOverNote] = useState<string | null>(null);

    // Generate unique IDs for notes
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // Load from LocalStorage once
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

    // Persist to LocalStorage whenever notes change
    useEffect(() => {
        localStorage.setItem("stickyNotes", JSON.stringify(notes));
    }, [notes]);

    const handleNoteAdd = (color: string) => {
        const newNote: StickNotes = {
            id: generateId(),
            textArea: "",
            color,
            isDone: false,
            isEditing: true,
        };
        setNotes(prev => [...prev, newNote]);
        setIsOpen(false);
    };

    const handleTextChange = (id: string, value: string) => {
        setNotes((prev) =>
            prev.map((note) =>
                note.id === id ? { ...note, textArea: value } : note
            )
        );
    };

    const downloadNotesAsTxt = () => {
        const textContent = notes
            .map((note) => note.textArea.trim())
            .join("\n\n");

        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "sticky-notes.txt");
    };

    const handleNoteRemove = (id: string) => {
        setNotes((prev) => prev.filter((note) => note.id !== id));
    };

    const handleDone = (id: string, done: boolean) => {
        setNotes((prev) =>
            prev.map((note) =>
                note.id === id ? { ...note, isDone: done, isEditing: false } : note
            )
        );
    };

    const handleEditToggle = (id: string, editing: boolean) => {
        setNotes((prev) =>
            prev.map((note) =>
                note.id === id ? { ...note, isEditing: editing } : note
            )
        );
    };

    const handleDragStart = (e: React.DragEvent, noteId: string) => {
        setDraggedNote(noteId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", noteId);
    };

    const handleDragOver = (e: React.DragEvent, noteId: string) => {
        e.preventDefault();
        setDraggedOverNote(noteId);
    };

    const handleDragLeave = () => {
        setDraggedOverNote(null);
    };

    const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");

        if (draggedId && draggedId !== dropTargetId) {
            setNotes((prev) => {
                const draggedNote = prev.find(note => note.id === draggedId);
                const targetNote = prev.find(note => note.id === dropTargetId);

                if (draggedNote && targetNote) {
                    const mergedContent = targetNote.textArea.trim()
                        ? `${targetNote.textArea}\n\n${draggedNote.textArea}`
                        : draggedNote.textArea;

                    return prev
                        .map(note =>
                            note.id === dropTargetId
                                ? { ...note, textArea: mergedContent, isEditing: true }
                                : note
                        )
                        .filter(note => note.id !== draggedId);
                }

                return prev;
            });
        }

        setDraggedNote(null);
        setDraggedOverNote(null);
    };

    const handleDragEnd = () => {
        setDraggedNote(null);
        setDraggedOverNote(null);
    };

    return (
        <div className="relative h-screen p-4 bg-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-24">
                {notes.map((note) => (
                    <motion.div
                        key={note.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, note.id)}
                        onDragOver={(e) => handleDragOver(e, note.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, note.id)}
                        onDragEnd={handleDragEnd}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        style={{ backgroundColor: note.color, color: "white" }}
                        className={
                            `relative rounded-lg p-3 shadow-md select-none transition-all duration-200 ` +
                            (draggedNote === note.id ? 'opacity-50 scale-95 ' : '') +
                            (draggedOverNote === note.id
                                ? 'scale-105 ring-2 ring-yellow-400 ring-opacity-70 bg-opacity-90'
                                : '')
                        }
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="font-bold italic text-white text-sm">
                                Drag to merge notes
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="cursor-move text-white opacity-60 hover:opacity-100 text-lg">
                                    ⋮⋮
                                </div>
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
                            style={{
                                textDecoration: note.isDone ? "line-through" : "none",
                            }}
                            disabled={!note.isEditing || note.isDone}
                            onDragStart={(e) => { e.preventDefault(); }}
                        />

                        <div className="flex gap-2 mt-3 flex-wrap">
                            {(!note.isDone && note.textArea.length > 0) && (
                                <>
                                    {note.isEditing ? (
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleEditToggle(note.id, false)}
                                            className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500"
                                            onMouseDown={e => e.stopPropagation()}
                                        >
                                            Save
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleEditToggle(note.id, true)}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                            onMouseDown={e => e.stopPropagation()}
                                        >
                                            Edit
                                        </motion.button>
                                    )}
                                </>
                            )}
                            {note.textArea.length > 0 && (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleDone(note.id, !note.isDone)}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        {note.isDone ? "Undo" : "Done"}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-green-600 text-white w-32 h-11 rounded-lg shadow-lg"
                                        onClick={downloadNotesAsTxt}
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        Download Note
                                    </motion.button>
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="fixed bottom-6 right-6 z-50">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg"
                    onClick={() => setIsOpen((prev) => !prev)}
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
                            {colors.map((color) => (
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
