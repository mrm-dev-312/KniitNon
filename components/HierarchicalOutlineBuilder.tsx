'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  FileText,
  Move,
  FolderOpen,
  Folder,
  Target,
  Brain
} from 'lucide-react';

interface OutlineSection {
  id: string;
  title: string;
  content?: string;
  type: 'chapter' | 'section' | 'subsection' | 'paragraph';
  depth: number;
  children: OutlineSection[];
  nodeIds: string[];
  isExpanded: boolean;
  isEditing: boolean;
  parentId?: string;
}

interface HierarchicalOutlineBuilderProps {
  onStructureChange?: (outline: OutlineSection[]) => void;
  onNodeAssociation?: (sectionId: string, nodeIds: string[]) => void;
  availableNodes?: Array<{ id: string; title: string; type: string }>;
  maxDepth?: number;
}

const HierarchicalOutlineBuilder: React.FC<HierarchicalOutlineBuilderProps> = ({
  onStructureChange,
  onNodeAssociation,
  availableNodes = [],
  maxDepth = 4
}) => {
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Initialize with a default structure if empty
  useEffect(() => {
    if (outline.length === 0) {
      setOutline([
        {
          id: 'intro',
          title: 'Introduction',
          content: '',
          type: 'chapter',
          depth: 0,
          children: [
            {
              id: 'intro-background',
              title: 'Background',
              content: '',
              type: 'section',
              depth: 1,
              children: [],
              nodeIds: [],
              isExpanded: true,
              isEditing: false,
              parentId: 'intro'
            }
          ],
          nodeIds: [],
          isExpanded: true,
          isEditing: false
        },
        {
          id: 'literature-review',
          title: 'Literature Review',
          content: '',
          type: 'chapter',
          depth: 0,
          children: [],
          nodeIds: [],
          isExpanded: true,
          isEditing: false
        },
        {
          id: 'methodology',
          title: 'Methodology',
          content: '',
          type: 'chapter',
          depth: 0,
          children: [],
          nodeIds: [],
          isExpanded: true,
          isEditing: false
        },
        {
          id: 'conclusion',
          title: 'Conclusion',
          content: '',
          type: 'chapter',
          depth: 0,
          children: [],
          nodeIds: [],
          isExpanded: true,
          isEditing: false
        }
      ]);
    }
  }, [outline.length]);

  // Notify parent component when structure changes
  useEffect(() => {
    onStructureChange?.(outline);
  }, [outline, onStructureChange]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chapter': return <FileText className="h-4 w-4" />;
      case 'section': return <FolderOpen className="h-4 w-4" />;
      case 'subsection': return <Folder className="h-4 w-4" />;
      case 'paragraph': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chapter': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'section': return 'bg-green-100 text-green-800 border-green-200';
      case 'subsection': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paragraph': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const addSection = useCallback((parentId?: string, type: 'chapter' | 'section' | 'subsection' | 'paragraph' = 'section') => {
    const newSection: OutlineSection = {
      id: `section-${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: '',
      type,
      depth: parentId ? (findSectionById(outline, parentId)?.depth || 0) + 1 : 0,
      children: [],
      nodeIds: [],
      isExpanded: true,
      isEditing: true,
      parentId
    };

    if (parentId) {
      setOutline(prev => updateSectionInTree(prev, parentId, section => ({
        ...section,
        children: [...section.children, newSection]
      })));
    } else {
      setOutline(prev => [...prev, newSection]);
    }
  }, [outline]);

  const deleteSection = useCallback((sectionId: string) => {
    setOutline(prev => removeSectionFromTree(prev, sectionId));
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<OutlineSection>) => {
    setOutline(prev => updateSectionInTree(prev, sectionId, section => ({
      ...section,
      ...updates
    })));
  }, []);

  const toggleExpanded = useCallback((sectionId: string) => {
    updateSection(sectionId, { isExpanded: !findSectionById(outline, sectionId)?.isExpanded });
  }, [outline, updateSection]);

  const startEditing = useCallback((sectionId: string) => {
    updateSection(sectionId, { isEditing: true });
  }, [updateSection]);

  const saveEdit = useCallback((sectionId: string, title: string, content?: string) => {
    updateSection(sectionId, { 
      title: title.trim() || 'Untitled Section',
      content: content?.trim() || '',
      isEditing: false 
    });
  }, [updateSection]);

  const cancelEdit = useCallback((sectionId: string) => {
    updateSection(sectionId, { isEditing: false });
  }, [updateSection]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    // For now, we'll implement basic reordering within the same level
    // More complex cross-level dragging can be implemented later
    if (source.droppableId === destination.droppableId) {
      const newOutline = reorderSections(outline, source.index, destination.index);
      setOutline(newOutline);
    }
  };

  const associateNode = useCallback((sectionId: string, nodeId: string) => {
    const section = findSectionById(outline, sectionId);
    if (section && !section.nodeIds.includes(nodeId)) {
      updateSection(sectionId, {
        nodeIds: [...section.nodeIds, nodeId]
      });
      onNodeAssociation?.(sectionId, [...section.nodeIds, nodeId]);
    }
  }, [outline, updateSection, onNodeAssociation]);

  const removeNodeAssociation = useCallback((sectionId: string, nodeId: string) => {
    const section = findSectionById(outline, sectionId);
    if (section) {
      const newNodeIds = section.nodeIds.filter(id => id !== nodeId);
      updateSection(sectionId, { nodeIds: newNodeIds });
      onNodeAssociation?.(sectionId, newNodeIds);
    }
  }, [outline, updateSection, onNodeAssociation]);

  const generateAIStructure = useCallback(async () => {
    // This would call the AI API to suggest an outline structure
    // For now, we'll create a sample structure
    const aiSuggestedOutline: OutlineSection[] = [
      {
        id: 'ai-intro',
        title: 'Introduction',
        content: 'Provide context and background for your research',
        type: 'chapter',
        depth: 0,
        children: [
          {
            id: 'ai-problem-statement',
            title: 'Problem Statement',
            content: 'Define the specific problem or question being addressed',
            type: 'section',
            depth: 1,
            children: [],
            nodeIds: [],
            isExpanded: true,
            isEditing: false,
            parentId: 'ai-intro'
          },
          {
            id: 'ai-objectives',
            title: 'Research Objectives',
            content: 'List specific goals and objectives',
            type: 'section',
            depth: 1,
            children: [],
            nodeIds: [],
            isExpanded: true,
            isEditing: false,
            parentId: 'ai-intro'
          }
        ],
        nodeIds: [],
        isExpanded: true,
        isEditing: false
      },
      {
        id: 'ai-literature',
        title: 'Literature Review',
        content: 'Review existing research and identify gaps',
        type: 'chapter',
        depth: 0,
        children: [
          {
            id: 'ai-theoretical-framework',
            title: 'Theoretical Framework',
            content: 'Establish theoretical foundations',
            type: 'section',
            depth: 1,
            children: [],
            nodeIds: [],
            isExpanded: true,
            isEditing: false,
            parentId: 'ai-literature'
          },
          {
            id: 'ai-previous-studies',
            title: 'Previous Studies',
            content: 'Review relevant previous research',
            type: 'section',
            depth: 1,
            children: [],
            nodeIds: [],
            isExpanded: true,
            isEditing: false,
            parentId: 'ai-literature'
          }
        ],
        nodeIds: [],
        isExpanded: true,
        isEditing: false
      }
    ];

    setOutline(aiSuggestedOutline);
  }, []);

  const filteredAvailableNodes = availableNodes.filter(node =>
    node.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hierarchical Outline Builder
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateAIStructure}
            >
              <Brain className="h-4 w-4 mr-1" />
              AI Structure
            </Button>
            <Button
              size="sm"
              onClick={() => addSection(undefined, 'chapter')}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Chapter
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Available Nodes Panel */}
        {availableNodes.length > 0 && (
          <div className="border rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Available Research Nodes</h4>
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-32 overflow-y-auto space-y-1">
              {filteredAvailableNodes.map(node => (
                <div
                  key={node.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="flex-1 truncate">{node.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {node.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outline Structure */}
        <div className="flex-1 overflow-y-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <OutlineLevel
              sections={outline}
              level={0}
              maxDepth={maxDepth}
              onAddSection={addSection}
              onDeleteSection={deleteSection}
              onToggleExpanded={toggleExpanded}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onAssociateNode={associateNode}
              onRemoveNodeAssociation={removeNodeAssociation}
              availableNodes={filteredAvailableNodes}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
            />
          </DragDropContext>
        </div>

        {/* Structure Summary */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Total sections: {countSections(outline)}</div>
            <div>Max depth: {getMaxDepth(outline)}</div>
            <div>Associated nodes: {getTotalAssociatedNodes(outline)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Outline Level Component for Recursive Rendering
interface OutlineLevelProps {
  sections: OutlineSection[];
  level: number;
  maxDepth: number;
  onAddSection: (parentId?: string, type?: 'chapter' | 'section' | 'subsection' | 'paragraph') => void;
  onDeleteSection: (sectionId: string) => void;
  onToggleExpanded: (sectionId: string) => void;
  onStartEditing: (sectionId: string) => void;
  onSaveEdit: (sectionId: string, title: string, content?: string) => void;
  onCancelEdit: (sectionId: string) => void;
  onAssociateNode: (sectionId: string, nodeId: string) => void;
  onRemoveNodeAssociation: (sectionId: string, nodeId: string) => void;
  availableNodes: Array<{ id: string; title: string; type: string }>;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeColor: (type: string) => string;
}

const OutlineLevel: React.FC<OutlineLevelProps> = ({
  sections,
  level,
  maxDepth,
  onAddSection,
  onDeleteSection,
  onToggleExpanded,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onAssociateNode,
  onRemoveNodeAssociation,
  availableNodes,
  selectedSectionId,
  onSelectSection,
  getTypeIcon,
  getTypeColor
}) => {
  return (
    <Droppable droppableId={`level-${level}`}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="space-y-2"
        >
          {sections.map((section, index) => (
            <OutlineSectionComponent
              key={section.id}
              section={section}
              index={index}
              level={level}
              maxDepth={maxDepth}
              onAddSection={onAddSection}
              onDeleteSection={onDeleteSection}
              onToggleExpanded={onToggleExpanded}
              onStartEditing={onStartEditing}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onAssociateNode={onAssociateNode}
              onRemoveNodeAssociation={onRemoveNodeAssociation}
              availableNodes={availableNodes}
              selectedSectionId={selectedSectionId}
              onSelectSection={onSelectSection}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

// Individual Section Component
interface OutlineSectionComponentProps extends Omit<OutlineLevelProps, 'sections'> {
  section: OutlineSection;
  index: number;
}

const OutlineSectionComponent: React.FC<OutlineSectionComponentProps> = ({
  section,
  index,
  level,
  maxDepth,
  onAddSection,
  onDeleteSection,
  onToggleExpanded,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onAssociateNode,
  onRemoveNodeAssociation,
  availableNodes,
  selectedSectionId,
  onSelectSection,
  getTypeIcon,
  getTypeColor
}) => {
  const [editTitle, setEditTitle] = useState(section.title);
  const [editContent, setEditContent] = useState(section.content || '');

  const handleSave = () => {
    onSaveEdit(section.id, editTitle, editContent);
  };

  const handleCancel = () => {
    setEditTitle(section.title);
    setEditContent(section.content || '');
    onCancelEdit(section.id);
  };

  const getNextType = (currentType: string): 'chapter' | 'section' | 'subsection' | 'paragraph' => {
    switch (currentType) {
      case 'chapter': return 'section';
      case 'section': return 'subsection';
      case 'subsection': return 'paragraph';
      default: return 'paragraph';
    }
  };

  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`border rounded-lg bg-white ${
            snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
          } ${selectedSectionId === section.id ? 'ring-2 ring-blue-500' : ''}`}
          style={{
            marginLeft: `${level * 16}px`,
            ...provided.draggableProps.style
          }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div {...provided.dragHandleProps}>
                  <Move className="h-4 w-4 text-gray-400 cursor-grab" />
                </div>
                
                {section.children.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleExpanded(section.id)}
                  >
                    {section.isExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                )}
                
                {getTypeIcon(section.type)}
                <Badge className={getTypeColor(section.type)}>
                  {section.type}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                {section.nodeIds.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {section.nodeIds.length} nodes
                  </Badge>
                )}
                
                {level < maxDepth && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddSection(section.id, getNextType(section.type))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStartEditing(section.id)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteSection(section.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {section.isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Section title..."
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Section content..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => onSelectSection(section.id)}
              >
                <h4 className="font-medium">{section.title}</h4>
                {section.content && (
                  <p className="text-sm text-gray-600 mt-1">{section.content}</p>
                )}
              </div>
            )}

            {/* Associated Nodes */}
            {section.nodeIds.length > 0 && (
              <div className="mt-3 space-y-1">
                <h5 className="text-xs font-medium text-gray-500">Associated Nodes:</h5>
                <div className="flex flex-wrap gap-1">
                  {section.nodeIds.map(nodeId => {
                    const node = availableNodes.find(n => n.id === nodeId);
                    return (
                      <Badge
                        key={nodeId}
                        variant="secondary"
                        className="text-xs cursor-pointer"
                        onClick={() => onRemoveNodeAssociation(section.id, nodeId)}
                      >
                        {node?.title || nodeId} ×
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Child Sections */}
          {section.isExpanded && section.children.length > 0 && (
            <div className="border-t bg-gray-50">
              <OutlineLevel
                sections={section.children}
                level={level + 1}
                maxDepth={maxDepth}
                onAddSection={onAddSection}
                onDeleteSection={onDeleteSection}
                onToggleExpanded={onToggleExpanded}
                onStartEditing={onStartEditing}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onAssociateNode={onAssociateNode}
                onRemoveNodeAssociation={onRemoveNodeAssociation}
                availableNodes={availableNodes}
                selectedSectionId={selectedSectionId}
                onSelectSection={onSelectSection}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
              />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// Utility Functions
function findSectionById(sections: OutlineSection[], id: string): OutlineSection | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const found = findSectionById(section.children, id);
    if (found) return found;
  }
  return null;
}

function updateSectionInTree(
  sections: OutlineSection[],
  id: string,
  updater: (section: OutlineSection) => OutlineSection
): OutlineSection[] {
  return sections.map(section => {
    if (section.id === id) {
      return updater(section);
    }
    return {
      ...section,
      children: updateSectionInTree(section.children, id, updater)
    };
  });
}

function removeSectionFromTree(sections: OutlineSection[], id: string): OutlineSection[] {
  return sections
    .filter(section => section.id !== id)
    .map(section => ({
      ...section,
      children: removeSectionFromTree(section.children, id)
    }));
}

function reorderSections(sections: OutlineSection[], startIndex: number, endIndex: number): OutlineSection[] {
  const result = Array.from(sections);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

function countSections(sections: OutlineSection[]): number {
  return sections.reduce((count, section) => count + 1 + countSections(section.children), 0);
}

function getMaxDepth(sections: OutlineSection[]): number {
  return sections.reduce((max, section) => 
    Math.max(max, section.depth + 1, getMaxDepth(section.children)), 0
  );
}

function getTotalAssociatedNodes(sections: OutlineSection[]): number {
  return sections.reduce((total, section) => 
    total + section.nodeIds.length + getTotalAssociatedNodes(section.children), 0
  );
}

export default HierarchicalOutlineBuilder;
