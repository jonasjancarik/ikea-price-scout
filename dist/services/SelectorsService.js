export const SelectorsService = {
    private: {
        selectors: null,
        GITHUB_URL: 'https://raw.githubusercontent.com/jonasjancarik/ikea-price-scout/main/dist/selectors/selectors.json',
        LOCAL_URL: chrome.runtime.getURL('selectors/selectors.json'),
        CACHE_DURATION: 1 * 60 * 1000, // 1 minute - we don't want to cache for too long because it would prolong the time it takes to load fixed selectors
        async checkIfDev() {
            try {
                const response = await fetch(chrome.runtime.getURL('main.js.map'));
                return response.ok;
            }
            catch {
                return false;
            }
        },
        async fetchSelectors() {
            const isDev = await this.checkIfDev();
            const url = isDev ? this.LOCAL_URL : this.GITHUB_URL;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch selectors');
                }
                return response.json();
            }
            catch (error) {
                throw new Error('Failed to fetch selectors');
            }
        },
        async getFromCache() {
            const { selectorsCache, lastFetched } = await chrome.storage.local.get(['selectorsCache', 'lastFetched']);
            if (selectorsCache && lastFetched && Date.now() - lastFetched < this.CACHE_DURATION) {
                return selectorsCache;
            }
            return null;
        },
        async saveToCache(selectors) {
            await chrome.storage.local.set({
                selectorsCache: selectors,
                lastFetched: Date.now()
            });
        }
    },
    async getSelectors() {
        if (this.private.selectors) {
            return this.private.selectors;
        }
        // In dev mode, always fetch from local file
        const isDev = await this.private.checkIfDev();
        if (isDev) {
            this.private.selectors = await this.private.fetchSelectors();
            return this.private.selectors;
        }
        // In prod, try cache first
        const cached = await this.private.getFromCache();
        if (cached) {
            this.private.selectors = cached;
            return cached;
        }
        try {
            this.private.selectors = await this.private.fetchSelectors();
            await this.private.saveToCache(this.private.selectors);
            return this.private.selectors;
        }
        catch (error) {
            console.error('Error fetching selectors:', error);
            throw error;
        }
    }
};
export default SelectorsService;
