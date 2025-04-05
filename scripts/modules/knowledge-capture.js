/**
 * knowledge-capture.js
 * System for capturing and retrieving knowledge with contextual relevance
 */

import fs from 'fs';
import path from 'path';
import { log, CONFIG, readJSON, writeJSON } from './utils.js';
import { MemoryBridge } from './memory-bridge.js';
import { OptimizationAdapter } from './optimization-adapter.js';

// Configuration for KnowledgeCapture
const KNOWLEDGE_CAPTURE_CONFIG = {
  enabled: process.env.ENABLE_KNOWLEDGE_CAPTURE === 'true' || true,
  storagePath: process.env.KNOWLEDGE_STORAGE_PATH || './knowledge',
  indexUpdateInterval: parseInt(process.env.KNOWLEDGE_INDEX_UPDATE_INTERVAL || '300000'), // 5 minutes
  minRelevanceScore: parseFloat(process.env.KNOWLEDGE_MIN_RELEVANCE || '0.3'),
  maxResults: parseInt(process.env.KNOWLEDGE_MAX_RESULTS || '10'),
};

/**
 * Knowledge entity model representing a piece of captured knowledge
 */
class KnowledgeEntity {
  /**
   * Create a new knowledge entity
   * @param {Object} data - Knowledge data
   */
  constructor(data = {}) {
    this.id = data.id || `k-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this.content = data.content || '';
    this.type = data.type || 'general';
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.metadata = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: data.author || 'system',
      source: data.source || 'manual',
      ...data.metadata,
    };
    this.relatedTasks = Array.isArray(data.relatedTasks) ? data.relatedTasks : [];
    this.relationships = Array.isArray(data.relationships) ? data.relationships : [];
    this.importance = Math.min(Math.max(parseInt(data.importance || 3), 1), 5); // 1-5 scale
  }

  /**
   * Add a tag to the knowledge entity
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (tag && typeof tag === 'string' && !this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Add a related task to the knowledge entity
   * @param {string|number} taskId - Task ID to relate
   */
  addRelatedTask(taskId) {
    if (taskId && !this.relatedTasks.includes(taskId.toString())) {
      this.relatedTasks.push(taskId.toString());
    }
  }

  /**
   * Add a relationship to another knowledge entity
   * @param {string} entityId - Entity ID to relate to
   * @param {string} type - Relationship type
   */
  addRelationship(entityId, type = 'related') {
    if (entityId && typeof entityId === 'string') {
      this.relationships.push({
        entityId,
        type,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Update the knowledge entity
   * @param {Object} data - Updated data
   */
  update(data) {
    if (data.content) this.content = data.content;
    if (data.type) this.type = data.type;
    if (Array.isArray(data.tags)) this.tags = [...new Set([...this.tags, ...data.tags])];
    if (data.importance) this.importance = Math.min(Math.max(parseInt(data.importance), 1), 5);
    
    // Update metadata
    if (data.metadata) {
      this.metadata = {
        ...this.metadata,
        ...data.metadata,
        updatedAt: new Date().toISOString(),
      };
    } else {
      this.metadata.updatedAt = new Date().toISOString();
    }
    
    // Update relations
    if (Array.isArray(data.relatedTasks)) {
      this.relatedTasks = [...new Set([...this.relatedTasks, ...data.relatedTasks.map(t => t.toString())])];
    }
  }
}

/**
 * Knowledge capture system for storing and retrieving project insights
 */
class KnowledgeCapture {
  /**
   * Create a new KnowledgeCapture instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = { ...KNOWLEDGE_CAPTURE_CONFIG, ...options };
    this.memoryBridge = options.memoryBridge || new MemoryBridge();
    this.optimizationAdapter = new OptimizationAdapter();
    
    // In-memory indices for fast lookups
    this.knowledgeIndex = {
      byId: new Map(),
      byTag: new Map(),
      byTask: new Map(),
      byType: new Map(),
      contentWords: new Map(),
    };
    
    this.isInitialized = false;
    this.lastIndexUpdate = null;
    
    // Initialize storage paths
    this._initializeStorage();
  }
  
  /**
   * Initialize the knowledge storage
   * @private
   */
  _initializeStorage() {
    try {
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(this.config.storagePath)) {
        fs.mkdirSync(this.config.storagePath, { recursive: true });
        log('info', `Created knowledge storage directory: ${this.config.storagePath}`);
      }
      
      // Create entities directory
      const entitiesPath = path.join(this.config.storagePath, 'entities');
      if (!fs.existsSync(entitiesPath)) {
        fs.mkdirSync(entitiesPath, { recursive: true });
      }
      
      // Create index file if it doesn't exist
      const indexPath = path.join(this.config.storagePath, 'index.json');
      if (!fs.existsSync(indexPath)) {
        writeJSON(indexPath, { 
          lastUpdated: new Date().toISOString(),
          entities: [],
        });
      }
      
      this.isInitialized = true;
      log('info', 'Knowledge capture system initialized');
    } catch (error) {
      log('error', `Failed to initialize knowledge storage: ${error.message}`);
      this.isInitialized = false;
    }
  }
  
  /**
   * Capture a new knowledge entity
   * @param {Object} data - Knowledge data
   * @returns {Promise<Object>} Result with created entity
   */
  async captureKnowledge(data) {
    try {
      if (!this.isInitialized) {
        await this._initializeStorage();
      }
      
      // Create new knowledge entity
      const entity = new KnowledgeEntity(data);
      
      // Validate entity
      if (!entity.content || typeof entity.content !== 'string') {
        throw new Error('Knowledge content is required');
      }
      
      // Add to persistent storage
      await this._saveKnowledgeEntity(entity);
      
      // Update indices
      this._indexEntity(entity);
      
      // Mirror to Holocron memory system if available
      if (this.memoryBridge.isInitialized) {
        try {
          await this.memoryBridge.captureKnowledge({
            content: entity.content,
            type: entity.type,
            tags: entity.tags,
            metadata: {
              knowledgeId: entity.id,
              importance: entity.importance,
              source: 'knowledge-capture',
              ...entity.metadata,
            }
          });
        } catch (mirrorError) {
          // Log but don't fail the operation
          log('warn', `Failed to mirror knowledge to memory system: ${mirrorError.message}`);
        }
      }
      
      return {
        success: true,
        entity: {
          id: entity.id,
          type: entity.type,
          tags: entity.tags,
          importance: entity.importance,
          createdAt: entity.metadata.createdAt,
        }
      };
    } catch (error) {
      log('error', `Knowledge capture error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Retrieve knowledge by ID
   * @param {string} id - Knowledge entity ID
   * @returns {Promise<Object>} Result with retrieved entity
   */
  async getKnowledge(id) {
    try {
      // Check in-memory index first
      if (this.knowledgeIndex.byId.has(id)) {
        return {
          success: true,
          entity: this.knowledgeIndex.byId.get(id),
        };
      }
      
      // Try to load from storage
      const entity = await this._loadKnowledgeEntity(id);
      if (!entity) {
        return { success: false, error: 'Knowledge entity not found' };
      }
      
      return { success: true, entity };
    } catch (error) {
      log('error', `Get knowledge error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update an existing knowledge entity
   * @param {string} id - Knowledge entity ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Result with updated entity
   */
  async updateKnowledge(id, data) {
    try {
      // Load the entity
      const getResult = await this.getKnowledge(id);
      if (!getResult.success) {
        return getResult;
      }
      
      const entity = getResult.entity;
      
      // Update the entity
      entity.update(data);
      
      // Save back to storage
      await this._saveKnowledgeEntity(entity);
      
      // Update indices
      this._updateEntityIndex(entity);
      
      return { success: true, entity };
    } catch (error) {
      log('error', `Update knowledge error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Delete a knowledge entity
   * @param {string} id - Knowledge entity ID
   * @returns {Promise<Object>} Result of deletion
   */
  async deleteKnowledge(id) {
    try {
      // Check if entity exists
      const getResult = await this.getKnowledge(id);
      if (!getResult.success) {
        return getResult;
      }
      
      // Remove from storage
      const entityPath = path.join(this.config.storagePath, 'entities', `${id}.json`);
      fs.unlinkSync(entityPath);
      
      // Remove from indices
      this._removeEntityFromIndex(id);
      
      // Update index file
      await this._updateIndexFile();
      
      return { success: true };
    } catch (error) {
      log('error', `Delete knowledge error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Find knowledge related to a specific task
   * @param {string|number} taskId - Task ID
   * @returns {Promise<Object>} Result with related knowledge entities
   */
  async findKnowledgeForTask(taskId) {
    try {
      const taskIdStr = taskId.toString();
      
      // Check index first
      if (this.knowledgeIndex.byTask.has(taskIdStr)) {
        const entityIds = this.knowledgeIndex.byTask.get(taskIdStr);
        const entities = [];
        
        for (const id of entityIds) {
          const entity = this.knowledgeIndex.byId.get(id);
          if (entity) {
            entities.push(entity);
          }
        }
        
        return {
          success: true,
          entities: entities.sort((a, b) => b.importance - a.importance),
        };
      }
      
      // Force index refresh if no results
      await this._refreshIndices();
      
      // Try again
      if (this.knowledgeIndex.byTask.has(taskIdStr)) {
        const entityIds = this.knowledgeIndex.byTask.get(taskIdStr);
        const entities = [];
        
        for (const id of entityIds) {
          const entity = this.knowledgeIndex.byId.get(id);
          if (entity) {
            entities.push(entity);
          }
        }
        
        return {
          success: true,
          entities: entities.sort((a, b) => b.importance - a.importance),
        };
      }
      
      // No results
      return { success: true, entities: [] };
    } catch (error) {
      log('error', `Find knowledge for task error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Search knowledge by tags
   * @param {Array<string>} tags - Tags to search for
   * @returns {Promise<Object>} Result with matching entities
   */
  async searchKnowledgeByTags(tags) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) {
        return { success: false, error: 'No tags provided' };
      }
      
      const matchingSets = [];
      let initialized = false;
      
      // Find entities that have all the requested tags
      for (const tag of tags) {
        if (this.knowledgeIndex.byTag.has(tag)) {
          const entityIds = this.knowledgeIndex.byTag.get(tag);
          if (!initialized) {
            matchingSets.push(new Set(entityIds));
            initialized = true;
          } else {
            // Intersect with existing matches (AND logic)
            const intersection = new Set();
            const firstSet = matchingSets[0];
            for (const id of firstSet) {
              if (entityIds.includes(id)) {
                intersection.add(id);
              }
            }
            matchingSets[0] = intersection;
          }
        } else {
          // If any tag has no matches, the intersection will be empty
          return { success: true, entities: [] };
        }
      }
      
      if (!initialized || matchingSets.length === 0) {
        return { success: true, entities: [] };
      }
      
      // Get entities from IDs
      const matches = Array.from(matchingSets[0]);
      const entities = [];
      
      for (const id of matches) {
        const entity = this.knowledgeIndex.byId.get(id);
        if (entity) {
          entities.push(entity);
        }
      }
      
      return { 
        success: true, 
        entities: entities.sort((a, b) => b.importance - a.importance) 
      };
    } catch (error) {
      log('error', `Search knowledge by tags error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Find knowledge contextually based on text relevance
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Result with relevant entities
   */
  async findRelevantKnowledge(options) {
    try {
      const context = options.context || '';
      const limit = options.limit || this.config.maxResults;
      const minRelevance = options.minRelevance || this.config.minRelevanceScore;
      
      if (!context) {
        return { success: false, error: 'Search context is required' };
      }
      
      // Ensure indices are up to date
      if (!this.lastIndexUpdate || Date.now() - this.lastIndexUpdate > this.config.indexUpdateInterval) {
        await this._refreshIndices();
      }
      
      // Extract relevant terms from context
      const contextTerms = this._extractSearchTerms(context);
      
      // Calculate relevance scores
      const scores = new Map();
      
      for (const [entityId, entity] of this.knowledgeIndex.byId.entries()) {
        const score = this._calculateRelevanceScore(entity, contextTerms);
        if (score >= minRelevance) {
          scores.set(entityId, score);
        }
      }
      
      // Sort by score and limit results
      const sortedResults = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
      
      // Get entities with scores
      const entities = sortedResults.map(([id, score]) => {
        const entity = this.knowledgeIndex.byId.get(id);
        return {
          ...entity,
          relevanceScore: score,
        };
      });
      
      return { success: true, entities };
    } catch (error) {
      log('error', `Find relevant knowledge error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Refresh the knowledge indices
   * @returns {Promise<boolean>} True if refresh was successful
   */
  async refreshIndices() {
    try {
      await this._refreshIndices();
      return true;
    } catch (error) {
      log('error', `Refresh indices error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get statistics about captured knowledge
   * @returns {Object} Knowledge statistics
   */
  getKnowledgeStats() {
    return {
      totalEntities: this.knowledgeIndex.byId.size,
      byType: Object.fromEntries(
        Array.from(this.knowledgeIndex.byType.entries()).map(
          ([type, entities]) => [type, entities.length]
        )
      ),
      topTags: Array.from(this.knowledgeIndex.byTag.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10)
        .map(([tag, entities]) => ({ tag, count: entities.length })),
      lastIndexUpdate: this.lastIndexUpdate,
    };
  }
  
  // Private methods
  
  /**
   * Load a knowledge entity from storage
   * @param {string} id - Entity ID
   * @returns {Promise<Object|null>} Knowledge entity or null if not found
   * @private
   */
  async _loadKnowledgeEntity(id) {
    try {
      const entityPath = path.join(this.config.storagePath, 'entities', `${id}.json`);
      
      if (!fs.existsSync(entityPath)) {
        return null;
      }
      
      const reader = this.optimizationAdapter.createOptimizedReader(entityPath);
      const content = reader();
      
      return JSON.parse(content);
    } catch (error) {
      log('error', `Load knowledge entity error: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Save a knowledge entity to storage
   * @param {Object} entity - Knowledge entity
   * @private
   */
  async _saveKnowledgeEntity(entity) {
    try {
      const entityPath = path.join(this.config.storagePath, 'entities', `${entity.id}.json`);
      const writer = this.optimizationAdapter.createOptimizedWriter(entityPath);
      writer(JSON.stringify(entity, null, 2));
      
      // Update index file
      await this._updateIndexFile();
      
      return true;
    } catch (error) {
      log('error', `Save knowledge entity error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update the index file
   * @private
   */
  async _updateIndexFile() {
    try {
      const indexPath = path.join(this.config.storagePath, 'index.json');
      const entities = Array.from(this.knowledgeIndex.byId.keys());
      
      const indexData = {
        lastUpdated: new Date().toISOString(),
        entities,
      };
      
      writeJSON(indexPath, indexData);
      
      return true;
    } catch (error) {
      log('error', `Update index file error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Refresh all indices from storage
   * @private
   */
  async _refreshIndices() {
    try {
      // Clear current indices
      this.knowledgeIndex = {
        byId: new Map(),
        byTag: new Map(),
        byTask: new Map(),
        byType: new Map(),
        contentWords: new Map(),
      };
      
      // Load index file
      const indexPath = path.join(this.config.storagePath, 'index.json');
      const indexData = readJSON(indexPath);
      
      if (!indexData || !Array.isArray(indexData.entities)) {
        // Initialize with empty index
        writeJSON(indexPath, { 
          lastUpdated: new Date().toISOString(),
          entities: [],
        });
        return;
      }
      
      // Load all entities and build indices
      for (const entityId of indexData.entities) {
        const entity = await this._loadKnowledgeEntity(entityId);
        if (entity) {
          this._indexEntity(entity);
        }
      }
      
      this.lastIndexUpdate = Date.now();
      log('info', `Refreshed knowledge indices with ${this.knowledgeIndex.byId.size} entities`);
      
      return true;
    } catch (error) {
      log('error', `Refresh indices error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Index a knowledge entity
   * @param {Object} entity - Knowledge entity
   * @private
   */
  _indexEntity(entity) {
    // Add to ID index
    this.knowledgeIndex.byId.set(entity.id, entity);
    
    // Add to type index
    if (!this.knowledgeIndex.byType.has(entity.type)) {
      this.knowledgeIndex.byType.set(entity.type, []);
    }
    this.knowledgeIndex.byType.get(entity.type).push(entity.id);
    
    // Add to tag index
    for (const tag of entity.tags) {
      if (!this.knowledgeIndex.byTag.has(tag)) {
        this.knowledgeIndex.byTag.set(tag, []);
      }
      this.knowledgeIndex.byTag.get(tag).push(entity.id);
    }
    
    // Add to task index
    for (const taskId of entity.relatedTasks) {
      if (!this.knowledgeIndex.byTask.has(taskId)) {
        this.knowledgeIndex.byTask.set(taskId, []);
      }
      this.knowledgeIndex.byTask.get(taskId).push(entity.id);
    }
    
    // Index content words for search
    const terms = this._extractSearchTerms(entity.content);
    for (const term of terms) {
      if (!this.knowledgeIndex.contentWords.has(term)) {
        this.knowledgeIndex.contentWords.set(term, []);
      }
      this.knowledgeIndex.contentWords.get(term).push(entity.id);
    }
  }
  
  /**
   * Update an entity in the index
   * @param {Object} entity - Updated entity
   * @private
   */
  _updateEntityIndex(entity) {
    // Remove old entity from indices
    this._removeEntityFromIndex(entity.id);
    
    // Add updated entity to indices
    this._indexEntity(entity);
  }
  
  /**
   * Remove an entity from all indices
   * @param {string} entityId - Entity ID to remove
   * @private
   */
  _removeEntityFromIndex(entityId) {
    // Get the entity to remove its data from other indices
    const entity = this.knowledgeIndex.byId.get(entityId);
    if (!entity) return;
    
    // Remove from ID index
    this.knowledgeIndex.byId.delete(entityId);
    
    // Remove from type index
    if (this.knowledgeIndex.byType.has(entity.type)) {
      this.knowledgeIndex.byType.set(
        entity.type,
        this.knowledgeIndex.byType.get(entity.type).filter(id => id !== entityId)
      );
    }
    
    // Remove from tag index
    for (const tag of entity.tags) {
      if (this.knowledgeIndex.byTag.has(tag)) {
        this.knowledgeIndex.byTag.set(
          tag,
          this.knowledgeIndex.byTag.get(tag).filter(id => id !== entityId)
        );
      }
    }
    
    // Remove from task index
    for (const taskId of entity.relatedTasks) {
      if (this.knowledgeIndex.byTask.has(taskId)) {
        this.knowledgeIndex.byTask.set(
          taskId,
          this.knowledgeIndex.byTask.get(taskId).filter(id => id !== entityId)
        );
      }
    }
    
    // Remove from content words index
    const terms = this._extractSearchTerms(entity.content);
    for (const term of terms) {
      if (this.knowledgeIndex.contentWords.has(term)) {
        this.knowledgeIndex.contentWords.set(
          term,
          this.knowledgeIndex.contentWords.get(term).filter(id => id !== entityId)
        );
      }
    }
  }
  
  /**
   * Extract search terms from text
   * @param {string} text - Text to extract terms from
   * @returns {Set<string>} Set of normalized search terms
   * @private
   */
  _extractSearchTerms(text) {
    if (!text) return new Set();
    
    // Convert to lowercase
    const normalizedText = text.toLowerCase();
    
    // Split into words and remove common stop words
    const words = normalizedText
      .split(/\W+/)
      .filter(word => word.length > 2) // Skip very short words
      .filter(word => !this._isStopWord(word));
    
    return new Set(words);
  }
  
  /**
   * Check if a word is a common stop word
   * @param {string} word - Word to check
   * @returns {boolean} True if the word is a stop word
   * @private
   */
  _isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'had',
      'not', 'are', 'will', 'should', 'would', 'could', 'may', 'might', 'can',
      'its', 'their', 'them', 'they', 'was', 'were', 'been', 'being', 'when',
      'where', 'what', 'why', 'how', 'any', 'all', 'some', 'our', 'yours'
    ]);
    
    return stopWords.has(word);
  }
  
  /**
   * Calculate relevance score between entity and search terms
   * @param {Object} entity - Knowledge entity
   * @param {Set<string>} searchTerms - Search terms
   * @returns {number} Relevance score (0-1)
   * @private
   */
  _calculateRelevanceScore(entity, searchTerms) {
    // No search terms means no relevance
    if (!searchTerms.size) return 0;
    
    // Get entity terms
    const entityTerms = this._extractSearchTerms(entity.content);
    const entityTags = new Set(entity.tags.map(tag => tag.toLowerCase()));
    
    // Calculate term overlap
    let matchingTerms = 0;
    for (const term of searchTerms) {
      if (entityTerms.has(term)) {
        matchingTerms++;
      }
      
      // Check if any tag matches or contains the term
      for (const tag of entityTags) {
        if (tag === term || tag.includes(term)) {
          matchingTerms += 0.5; // Partial credit for tag matches
          break;
        }
      }
    }
    
    // Calculate score
    let score = matchingTerms / searchTerms.size;
    
    // Apply importance multiplier (1-5 scale normalized to 1.0-1.4 multiplier)
    score *= (1 + (entity.importance - 1) * 0.1);
    
    // Apply recency factor
    const createdDate = new Date(entity.metadata.createdAt);
    const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.8, 1 - (ageInDays / 365));
    score *= recencyFactor;
    
    return Math.min(1, score); // Cap at 1.0
  }
}

export { KnowledgeCapture, KnowledgeEntity, KNOWLEDGE_CAPTURE_CONFIG };