import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, GripVertical, Upload, Download } from "lucide-react";
import type { Color } from "@shared/schema";

interface ColorPaletteManagerProps {
  colors: Color[];
  onColorsChange: (colors: Color[]) => void;
  maxColors?: number;
}

export function ColorPaletteManager({
  colors,
  onColorsChange,
  maxColors = 10,
}: ColorPaletteManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newColor, setNewColor] = useState<Color>({
    name: "",
    hex: "#000000",
    role: "primary",
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddColor = () => {
    if (newColor.name && newColor.hex) {
      if (editingIndex !== null) {
        const updated = [...colors];
        updated[editingIndex] = newColor;
        onColorsChange(updated);
        setEditingIndex(null);
      } else {
        onColorsChange([...colors, newColor]);
      }
      setNewColor({ name: "", hex: "#000000", role: "primary" });
      setIsAddDialogOpen(false);
    }
  };

  const handleRemoveColor = (index: number) => {
    onColorsChange(colors.filter((_, i) => i !== index));
  };

  const handleEditColor = (index: number) => {
    setNewColor(colors[index]);
    setEditingIndex(index);
    setIsAddDialogOpen(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newColors = [...colors];
    const [draggedColor] = newColors.splice(draggedIndex, 1);
    newColors.splice(dropIndex, 0, draggedColor);
    onColorsChange(newColors);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ colors }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "color-palette.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.colors && Array.isArray(data.colors)) {
          onColorsChange(data.colors.slice(0, maxColors));
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNewColor({ name: "", hex: "#000000", role: "primary" });
            setEditingIndex(null);
            setIsAddDialogOpen(true);
          }}
          disabled={colors.length >= maxColors}
          data-testid="button-add-color"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Color
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("color-json-upload")?.click()}
          data-testid="button-upload-json"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload JSON
        </Button>
        <input
          id="color-json-upload"
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSON}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          disabled={colors.length === 0}
          data-testid="button-export-json"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {colors.map((color, index) => (
            <motion.div
              key={`${color.hex}-${index}`}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center gap-3 p-3 bg-card border rounded-md cursor-move ${
                dragOverIndex === index && draggedIndex !== index
                  ? "border-primary"
                  : ""
              }`}
              data-testid={`color-card-${index}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div
                className="w-10 h-10 rounded-md border"
                style={{ backgroundColor: color.hex }}
              />
              <div className="flex-1">
                <div className="font-medium">{color.name}</div>
                <div className="text-sm text-muted-foreground">
                  {color.hex} {color.role && `• ${color.role}`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditColor(index)}
                data-testid={`button-edit-color-${index}`}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveColor(index)}
                data-testid={`button-remove-color-${index}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        {colors.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No colors added yet. Click "Add Color" to start.
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Edit Color" : "Add Color"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="color-name">Color Name</Label>
              <Input
                id="color-name"
                value={newColor.name}
                onChange={(e) =>
                  setNewColor({ ...newColor, name: e.target.value })
                }
                placeholder="e.g., Primary Blue"
                data-testid="input-color-name"
              />
            </div>
            <div>
              <Label htmlFor="color-hex">Hex Code</Label>
              <div className="flex gap-2">
                <Input
                  id="color-hex"
                  value={newColor.hex}
                  onChange={(e) =>
                    setNewColor({ ...newColor, hex: e.target.value })
                  }
                  placeholder="#000000"
                  data-testid="input-color-hex"
                />
                <input
                  type="color"
                  value={newColor.hex}
                  onChange={(e) =>
                    setNewColor({ ...newColor, hex: e.target.value })
                  }
                  className="w-16 h-10 rounded-md border cursor-pointer"
                  data-testid="input-color-picker"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="color-role">Role (Optional)</Label>
              <Select
                value={newColor.role || "primary"}
                onValueChange={(value) =>
                  setNewColor({ ...newColor, role: value })
                }
              >
                <SelectTrigger data-testid="select-color-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                  <SelectItem value="outlines">Outlines</SelectItem>
                  <SelectItem value="fills">Fills</SelectItem>
                  <SelectItem value="highlights">Highlights</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingIndex(null);
              }}
              data-testid="button-cancel-color"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddColor}
              disabled={!newColor.name || !newColor.hex}
              data-testid="button-save-color"
            >
              {editingIndex !== null ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
