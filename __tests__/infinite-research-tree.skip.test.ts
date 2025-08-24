import { InfiniteResearchTree, ResearchNode } from '@/lib/utils/infinite-research-tree';
import { OutlineNode } from '@/lib/stores/outline-store';

describe('InfiniteResearchTree', () => {
  describe('convertOutlineToResearch', () => {
    it('should convert outline node to research node format', () => {
      const outlineNode: OutlineNode = {
        id: 'test-basic-operations',
        title: 'Basic Operations',
        content: 'Fundamental mathematical operations',
        type: 'topic',
        order: 1,
        metadata: {
          source: 'user-created',
          confidence: 0.9,
          relationships: []
        }
      };

      const researchNode = InfiniteResearchTree.convertOutlineToResearch(outlineNode);

      expect(researchNode.id).toBe('test-basic-operations');
      expect(researchNode.title).toBe('Basic Operations');
      expect(researchNode.content).toBe('Fundamental mathematical operations');
      expect(researchNode.type).toBe('topic');
      expect(researchNode.level).toBe(0);
      expect(researchNode.parentId).toBeUndefined();
      expect(researchNode.children).toEqual([]);
      expect(researchNode.isExpandable).toBe(true);
      expect(researchNode.isExpanded).toBe(false);
      expect(researchNode.isLoading).toBe(false);
      expect(researchNode.expansionCount).toBe(0);
      expect(researchNode.pathContext).toEqual(['Basic Operations']);
    });

    it('should handle outline node with parentId', () => {
      const outlineNode: OutlineNode = {
        id: 'child-node',
        title: 'Addition',
        content: 'Adding numbers together',
        type: 'subtopic',
        order: 2,
        parentId: 'parent-node',
        metadata: {
          source: 'user-created',
          confidence: 0.9,
          relationships: []
        }
      };

      const researchNode = InfiniteResearchTree.convertOutlineToResearch(outlineNode);

      expect(researchNode.parentId).toBe('parent-node');
      expect(researchNode.level).toBe(0); // Will be root level initially
      expect(researchNode.isExpandable).toBe(true);
    });
  });

  describe('createRootNode', () => {
    it('should create a properly structured root research node', () => {
      const rootNode = InfiniteResearchTree.createRootNode(
        'Mathematics Fundamentals',
        'Core mathematical concepts and operations'
      );

      expect(rootNode.title).toBe('Mathematics Fundamentals');
      expect(rootNode.content).toBe('Core mathematical concepts and operations');
      expect(rootNode.type).toBe('topic');
      expect(rootNode.level).toBe(0);
      expect(rootNode.parentId).toBeUndefined();
      expect(rootNode.children).toEqual([]);
      expect(rootNode.isExpandable).toBe(true);
      expect(rootNode.isExpanded).toBe(false);
      expect(rootNode.isLoading).toBe(false);
      expect(rootNode.expansionCount).toBe(0);
      expect(rootNode.pathContext).toEqual(['Mathematics Fundamentals']);

      // Check that ID is generated and unique
      expect(rootNode.id).toBeDefined();
      expect(typeof rootNode.id).toBe('string');
      expect(rootNode.id.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases for node expansion fix', () => {
    it('should handle empty outline nodes gracefully', () => {
      const outlineNode: OutlineNode = {
        id: 'empty-node',
        title: '',
        content: '',
        type: 'topic',
        order: 1,
        metadata: {
          source: 'user-created',
          confidence: 0.5,
          relationships: []
        }
      };

      const researchNode = InfiniteResearchTree.convertOutlineToResearch(outlineNode);
      
      expect(researchNode.title).toBe('');
      expect(researchNode.content).toBe('');
      expect(researchNode.pathContext).toEqual(['']);
      expect(researchNode.isExpandable).toBe(true); // Still expandable even if empty
    });

    it('should maintain metadata from outline node', () => {
      const outlineNode: OutlineNode = {
        id: 'metadata-test',
        title: 'Test Node',
        content: 'Test content',
        type: 'detail',
        order: 3,
        metadata: {
          source: 'ai-generated',
          confidence: 0.75,
          relationships: ['related-node-1', 'related-node-2']
        }
      };

      const researchNode = InfiniteResearchTree.convertOutlineToResearch(outlineNode);
      
      expect(researchNode.metadata).toEqual({
        source: 'ai-generated',
        confidence: 0.75,
        relationships: ['related-node-1', 'related-node-2']
      });
    });
  });
});
