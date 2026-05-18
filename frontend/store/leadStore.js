import { create } from 'zustand';
import { api } from '../lib/api';

const useLeadStore = create((set, get) => ({
  leads: [],
  activeLead: null,
  stages: [],
  loading: false,

  fetchLeads: async (params = {}) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams(params).toString();
      const response = await api.get(`/leads?${query}`);
      if (response.success) {
        set({ leads: response.data, loading: false });
      }
    } catch (error) {
      set({ loading: false });
    }
  },

  fetchLeadDetails: async (leadId) => {
    set({ loading: true });
    try {
      const response = await api.get(`/leads/${leadId}`);
      if (response.success) {
        set({ activeLead: response.data, loading: false });
      }
    } catch (error) {
      set({ loading: false });
    }
  },

  fetchKanbanBoard: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/pipeline/board');
      if (response.success) {
        set({ stages: response.data, loading: false });
      }
    } catch (error) {
      set({ loading: false });
    }
  },

  moveLeadStage: async (leadId, stageId) => {
    try {
      // Optimistic state update in UI for high responsivity
      const previousStages = get().stages;
      const updatedStages = previousStages.map((stage) => {
        // Remove lead from original stage
        const filteredLeads = stage.leads.filter((l) => l.id !== leadId);
        // Add lead to target stage
        if (stage.id === stageId) {
          const leadToMove = previousStages
            .flatMap((s) => s.leads)
            .find((l) => l.id === leadId);

          if (leadToMove) {
            leadToMove.stageId = stageId;
            return {
              ...stage,
              leads: [...filteredLeads, leadToMove],
            };
          }
        }
        return { ...stage, leads: filteredLeads };
      });

      set({ stages: updatedStages });

      // Persist to backend
      await api.patch(`/pipeline/leads/${leadId}/stage`, { stageId });
    } catch (error) {
      // Revert stats if update fails
      get().fetchKanbanBoard();
    }
  },

  createLead: async (leadData) => {
    try {
      const response = await api.post('/leads', leadData);
      if (response.success) {
        set((state) => ({ leads: [response.data, ...state.leads] }));
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
}));

export default useLeadStore;
