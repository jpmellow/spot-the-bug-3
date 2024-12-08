import { create } from 'zustand';
import { GameState } from '../types';
import * as db from '../db';
import { initialScenes, initialBugs } from '../data/initialData';

export const useGameStore = create<GameState>((set, get) => ({
  scenes: initialScenes,
  currentSceneId: null,
  bugs: initialBugs,
  currentBugId: null,
  isAdmin: false,
  showIntro: true,

  addScene: async (scene) => {
    try {
      const newScene = { ...scene, id: crypto.randomUUID() };
      await db.addScene(newScene);
      const scenes = await db.getScenes();
      set((state) => ({ 
        scenes,
        currentSceneId: state.currentSceneId || newScene.id
      }));
    } catch (error) {
      console.error('Failed to add scene:', error);
    }
  },

  updateScene: async (id, updatedScene) => {
    try {
      await db.updateScene(id, updatedScene);
      const scenes = await db.getScenes();
      const currentState = get();
      
      // Find the updated scene in the new scenes array
      const updatedSceneExists = scenes.find(scene => scene.id === currentState.currentSceneId);
      
      set({
        scenes,
        // Keep the current scene if it still exists, otherwise select the first scene
        currentSceneId: updatedSceneExists ? currentState.currentSceneId : (scenes[0]?.id || null)
      });
    } catch (error) {
      console.error('Failed to update scene:', error);
    }
  },

  deleteScene: async (id) => {
    try {
      await db.deleteScene(id);
      const [scenes, bugs] = await Promise.all([db.getScenes(), db.getBugs()]);
      set((state) => ({
        scenes,
        bugs,
        currentSceneId: state.currentSceneId === id ? 
          (scenes[0]?.id || null) : 
          state.currentSceneId,
      }));
    } catch (error) {
      console.error('Failed to delete scene:', error);
    }
  },

  setCurrentScene: (sceneId) => {
    const state = get();
    // Get bugs for the new scene
    const sceneBugs = state.bugs.filter(bug => bug.sceneId === sceneId);
    
    set({ 
      currentSceneId: sceneId,
      // Always set the first bug of the new scene as current
      currentBugId: sceneBugs.length > 0 ? sceneBugs[0].id : null
    });
  },

  addBug: async (bug) => {
    try {
      const newBug = { ...bug, id: crypto.randomUUID() };
      await db.addBug(newBug);
      const bugs = await db.getBugs();
      const state = get();
      
      set((state) => ({ 
        bugs,
        // If this is the first bug in the scene, set it as current
        currentBugId: state.currentBugId || (newBug.sceneId === state.currentSceneId ? newBug.id : state.currentBugId)
      }));
    } catch (error) {
      console.error('Failed to add bug:', error);
    }
  },

  updateBug: async (id, updatedBug) => {
    try {
      await db.updateBug(id, updatedBug);
      const bugs = await db.getBugs();
      set({ bugs });
    } catch (error) {
      console.error('Failed to update bug:', error);
    }
  },

  deleteBug: async (id) => {
    try {
      await db.deleteBug(id);
      const bugs = await db.getBugs();
      set((state) => {
        const newState = { bugs };
        if (state.currentBugId === id) {
          const sceneBugs = bugs.filter(bug => bug.sceneId === state.currentSceneId);
          newState.currentBugId = sceneBugs.length > 0 ? sceneBugs[0].id : null;
        }
        return newState;
      });
    } catch (error) {
      console.error('Failed to delete bug:', error);
    }
  },

  setCurrentBug: (bugId) =>
    set({ currentBugId: bugId }),

  toggleAdmin: () =>
    set((state) => ({ isAdmin: !state.isAdmin })),

  hideIntro: () =>
    set({ showIntro: false }),
}));