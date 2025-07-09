"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  FolderOpen,
  Trash2,
  Calendar,
  FileText,
  Plus,
} from "lucide-react";
import { useOutlineStore } from "@/lib/stores/outline-store";

interface SavedPath {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: any;
}

interface ProjectManagerProps {
  children?: React.ReactNode;
}

export function ProjectManager({ children }: ProjectManagerProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [savedPaths, setSavedPaths] = useState<SavedPath[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const { nodes, conflicts, summary, loadProject: storeLoadProject } = useOutlineStore();

  useEffect(() => {
    if (session && isOpen) {
      loadSavedPaths();
    }
  }, [session, isOpen]);

  const loadSavedPaths = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const paths = await response.json();
        setSavedPaths(paths);
      }
    } catch (error) {
      console.error("Failed to load saved paths:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentProject = async () => {
    if (!saveTitle.trim() || !session) return;

    setIsSaving(true);
    try {
      const projectData = {
        nodes,
        conflicts,
        summary,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: saveTitle,
          data: projectData,
        }),
      });

      if (response.ok) {
        setSaveTitle("");
        loadSavedPaths();
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = async (path: SavedPath) => {
    try {
      // Use the new loadProject method from the store
      storeLoadProject(path.data);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to load project:", error);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadSavedPaths();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            My Projects
          </DialogTitle>
          <DialogDescription>
            Save and load your research projects to continue your work later.
          </DialogDescription>
        </DialogHeader>

        {/* Save Current Project */}
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Current Project
          </h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="save-title" className="sr-only">
                Project Title
              </Label>
              <Input
                id="save-title"
                placeholder="Enter project title..."
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    saveCurrentProject();
                  }
                }}
              />
            </div>
            <Button
              onClick={saveCurrentProject}
              disabled={!saveTitle.trim() || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Saved Projects List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="font-medium mb-3">Saved Projects</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              </div>
            ) : savedPaths.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p>No saved projects yet</p>
                <p className="text-sm">Save your current research to get started</p>
              </div>
            ) : (
              savedPaths.map((path) => (
                <div
                  key={path.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{path.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(path.createdAt).toLocaleDateString()}
                        </span>
                        {path.data?.nodes && (
                          <Badge variant="secondary" className="text-xs">
                            {path.data.nodes.length} nodes
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadProject(path)}
                        className="flex items-center gap-1"
                      >
                        <FolderOpen className="w-3 h-3" />
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject(path.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
