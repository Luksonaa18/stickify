"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

interface StickNote {
  id: string;
  textArea: string;
  color: string;
  isDone: boolean;
  isEditing: boolean;
  x: number;
  y: number;
}

const colors: string[] = ["#FF5733", "#33FF57", "#3357FF", "#F1C40F"];

const StickyNotes = () => {
  const [notes, setNotes] = useState<StickNote[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleNoteAdd = (color: string) => {
    const newNote: StickNote = {
      id: generateId(),
      textArea: "",
      color,
      isDone: false,
      isEditing: true,
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
    };
    setNotes((prev) => [...prev, newNote]);
    setIsOpen(false);
  };

  const handleTextChange = (id: string, value: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, textArea: value } : note))
    );
  };

  const downloadNotesAsTxt = () => {
    const textContent = notes
      .filter(note => note.textArea.trim())
      .map((note) => note.textArea.trim())
      .join("\n\n");
    
    if (!textContent) return;
    
    const blob = new Blob([textContent], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sticky-notes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const getOverlappingNote = (draggedId: string, x: number, y: number) => {
    const noteWidth = 256;
    const noteHeight = 200;
    
    return notes.find((note) => {
      if (note.id === draggedId) return false;
      
      // Check if rectangles overlap
      const draggedLeft = x;
      const draggedRight = x + noteWidth;
      const draggedTop = y;
      const draggedBottom = y + noteHeight;
      
      const noteLeft = note.x;
      const noteRight = note.x + noteWidth;
      const noteTop = note.y;
      const noteBottom = note.y + noteHeight;
      
      // Check for overlap
      const horizontalOverlap = draggedLeft < noteRight && draggedRight > noteLeft;
      const verticalOverlap = draggedTop < noteBottom && draggedBottom > noteTop;
      
      return horizontalOverlap && verticalOverlap;
    });
  };

  const handleDragEnd = (noteId: string, event: any, info: any) => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    // Calculate new position with proper bounds
    const noteWidth = 256;
    const noteHeight = 200;
    const maxX = container.clientWidth - noteWidth;
    const maxY = container.clientHeight - noteHeight;
    
    const newX = Math.max(0, Math.min(info.point.x - containerRect.left, maxX));
    const newY = Math.max(0, Math.min(info.point.y - containerRect.top, maxY));
    
    console.log(`Drag ended for note ${noteId} at position:`, { newX, newY });
    
    // Check for overlapping note
    const overlappingNote = getOverlappingNote(noteId, newX, newY);
    
    if (overlappingNote) {
      console.log(`Found overlapping note:`, overlappingNote.id);
      
      // Merge notes
      setNotes((prevNotes) => {
        const draggedNote = prevNotes.find(n => n.id === noteId);
        if (!draggedNote) return prevNotes;
        
        const draggedText = draggedNote.textArea.trim();
        const overlappingText = overlappingNote.textArea.trim();
        
        let mergedText = "";
        if (draggedText && overlappingText) {
          mergedText = `${overlappingText}\n\n${draggedText}`;
        } else if (draggedText) {
          mergedText = draggedText;
        } else if (overlappingText) {
          mergedText = overlappingText;
        }
        
        console.log(`Merging notes. Result:`, mergedText);
        
        // Return notes with merged content and dragged note removed
        return prevNotes
          .filter((n) => n.id !== noteId)
          .map((n) =>
            n.id === overlappingNote.id 
              ? { ...n, textArea: mergedText, isEditing: true } 
              : n
          );
      });
    } else {
      console.log(`No overlapping note found, just updating position`);
      
      // No merge, just update position
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId ? { ...note, x: newX, y: newY } : note
        )
      );
    }
    
    setDraggedNoteId(null);
    setIsDragging(false);
    setDragPosition(null);
  };

  const downloadSingleNote = (note: StickNote) => {
    const textContent = note.textArea.trim();
    if (!textContent) return;

    const blob = new Blob([textContent], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticky-note-${note.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDrag = (noteId: string, event: any, info: any) => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const x = info.point.x - containerRect.left;
    const y = info.point.y - containerRect.top;
    
    setDragPosition({ x, y });
  };

  const isNoteInMergeZone = (noteId: string) => {
    if (!dragPosition || !draggedNoteId || draggedNoteId === noteId) return false;
    
    const overlappingNote = getOverlappingNote(draggedNoteId, dragPosition.x, dragPosition.y);
    return overlappingNote && overlappingNote.id === noteId;
  };

  return (
    <main className="flex flex-col items-center">
      <div 
        ref={containerRef} 
        className="relative min-h-screen p-4 w-full bg-gray-100 overflow-hidden"
        style={{ minHeight: '100vh' }}
      >
      

        {notes.map((note) => (
          <motion.div
            key={note.id}
            className={`absolute w-64 rounded-lg p-3 shadow-md select-none ${
              isDragging && draggedNoteId === note.id ? 'cursor-grabbing z-50' : 'cursor-grab'
            } ${isNoteInMergeZone(note.id) ? 'ring-4 ring-yellow-400' : ''}`}
            style={{ 
              backgroundColor: note.color, 
              color: "white", 
              top: note.y, 
              left: note.x,
              zIndex: draggedNoteId === note.id ? 50 : 10
            }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={containerRef}
            onDragStart={() => {
              setDraggedNoteId(note.id);
              setIsDragging(true);
              console.log(`Started dragging note: ${note.id}`);
            }}
            onDrag={(event, info) => handleDrag(note.id, event, info)}
            onDragEnd={(event, info) => handleDragEnd(note.id, event, info)}
            whileDrag={{ 
              scale: 1.05, 
              rotate: 5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-bold italic text-white text-sm">
                {isDragging && draggedNoteId === note.id ? 'Drop on another note to merge' : 'Drag and edit'}
              </h1>
              <Trash2
                onClick={() => handleNoteRemove(note.id)}
                className="text-white text-lg cursor-pointer hover:text-red-300 transition"
              />
            </div>

            <textarea
              value={note.textArea}
              onChange={(e) => handleTextChange(note.id, e.target.value)}
              className="w-full h-32 bg-transparent resize-none outline-none text-sm placeholder-gray-200"
              style={{ textDecoration: note.isDone ? "line-through" : "none" }}
              disabled={!note.isEditing || note.isDone}
              placeholder="Write your note here..."
            />

            <div className="flex gap-2 mt-3 flex-wrap">
              {!note.isDone && note.textArea.length > 0 && (
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
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEditToggle(note.id, true)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => downloadSingleNote(note)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Download
                    </motion.button>
                  </>
                )
              )}
              {note.textArea.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDone(note.id, !note.isDone)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {note.isDone ? "Undo" : "Done"}
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}

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

        {notes.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 left-6 bg-green-600 text-white px-4 py-3 rounded-full shadow-lg"
            onClick={downloadNotesAsTxt}
          >
            Download All Notes
          </motion.button>
        )}
      </div>
    </main>
  );
};

export default StickyNotes;