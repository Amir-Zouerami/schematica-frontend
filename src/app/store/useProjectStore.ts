import { create } from 'zustand';

interface ProjectState {
	activeProjectId: string | null;
	activeServerUrl: string | null;

	setActiveProjectId: (id: string | null) => void;
	setActiveServerUrl: (url: string | null) => void;
	resetProjectState: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
	activeProjectId: null,
	activeServerUrl: null,
	setActiveProjectId: (id) => set({ activeProjectId: id }),
	setActiveServerUrl: (url) => set({ activeServerUrl: url }),
	resetProjectState: () => set({ activeProjectId: null, activeServerUrl: null }),
}));
