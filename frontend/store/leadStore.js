import { create } from 'zustand';
import { api, isDemoMode } from '../lib/api';
import { DEMO_KANBAN_STAGES } from '../lib/demoData';

const cloneStages = () =>
  DEMO_KANBAN_STAGES.map((stage) => ({
    ...stage,
    leads: stage.leads.map((lead) => ({ ...lead, assignedTo: lead.assignedTo ? { ...lead.assignedTo } : null })),
  }));

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

    if (isDemoMode()) {
      set({ stages: cloneStages(), loading: false });
      return;
    }

    try {
      const response = await api.get('/pipeline/board');
      if (response.success) {
        set({ stages: response.data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      if (isDemoMode()) {
        set({ stages: cloneStages(), loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  moveLeadStage: async (leadId, stageId) => {
    const previousStages = get().stages;
    const updatedStages = previousStages.map((stage) => {
      const filteredLeads = stage.leads.filter((l) => l.id !== leadId);
      if (stage.id === stageId) {
        const leadToMove = previousStages
          .flatMap((s) => s.leads)
          .find((l) => l.id === leadId);

        if (leadToMove) {
          return {
            ...stage,
            leads: [...filteredLeads, { ...leadToMove, stageId }],
          };
        }
      }
      return { ...stage, leads: filteredLeads };
    });

    set({ stages: updatedStages });

    if (isDemoMode()) return;

    try {
      await api.patch(`/pipeline/leads/${leadId}/stage`, { stageId });
    } catch (error) {
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

  addLead: (lead) => {
    set((state) => {
      // Avoid duplicates
      if (state.leads.some((l) => l.id === lead.id)) {
        return {};
      }
      const updatedLeads = [lead, ...state.leads];
      const updatedStages = state.stages.map((stage) => {
        // Optimistically put in stage matching stageId
        if (stage.id === lead.stageId || (!lead.stageId && stage.order === 1)) {
          return {
            ...stage,
            leads: [lead, ...stage.leads],
          };
        }
        return stage;
      });
      return { leads: updatedLeads, stages: updatedStages };
    });
  },

  updateLead: (updatedLead) => {
    set((state) => {
      const activeLead = state.activeLead && state.activeLead.id === updatedLead.id
        ? { ...state.activeLead, ...updatedLead }
        : state.activeLead;

      const leads = state.leads.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l));

      // Remove and re-add in case stageId changed, or just swap if stage is the same
      const stages = state.stages.map((stage) => {
        const contains = stage.leads.some((l) => l.id === updatedLead.id);
        const belongs = stage.id === updatedLead.stageId;

        if (contains && belongs) {
          // just update attributes
          return {
            ...stage,
            leads: stage.leads.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l)),
          };
        } else if (contains && !belongs) {
          // remove from this stage
          return {
            ...stage,
            leads: stage.leads.filter((l) => l.id !== updatedLead.id),
          };
        } else if (!contains && belongs) {
          // add to this stage
          return {
            ...stage,
            leads: [updatedLead, ...stage.leads],
          };
        }
        return stage;
      });

      return { activeLead, leads, stages };
    });
  },
}));

export default useLeadStore;
