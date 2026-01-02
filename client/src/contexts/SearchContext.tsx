import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'wouter';

interface SearchResult {
  id: string;
  type: 'post' | 'alumni' | 'event' | 'job' | 'message' | 'user';
  title: string;
  description: string;
  image?: string;
  url: string;
  relevance?: number;
}

interface SearchFilters {
  type?: 'all' | 'post' | 'alumni' | 'event' | 'job';
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'year';
  location?: string;
  batch?: string;
  skills?: string[];
  expertise?: string[];
  industry?: string;
  graduationYear?: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchHistory: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  performGlobalSearch: (query: string, filters?: SearchFilters) => Promise<void>;
  showSearchModal: boolean;
  setShowSearchModal: (show: boolean) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearchResults: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ type: 'all', dateRange: 'all' });

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    const emptyHistory: string[] = [];
    setSearchHistory(emptyHistory);
    localStorage.removeItem('searchHistory');
  }, []);

  const performGlobalSearch = useCallback(async (query: string, filters: SearchFilters = { type: 'all', dateRange: 'all' }) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchResults([]); // Clear previous results
    const userId = localStorage.getItem('userId');
    const results: SearchResult[] = [];

    // Save to recently searched only after successful search
    const shouldAddToHistory = query.trim().length > 2;

    try {
      // Search Posts (if type is 'all' or 'post')
      if (filters.type === 'all' || filters.type === 'post') {
        const postsResponse = await fetch(`/api/posts?limit=5&search=${encodeURIComponent(query)}`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          postsData.posts?.forEach((post: any) => {
            results.push({
              id: post.id,
              type: 'post',
              title: `Post by ${post.author?.username || 'Unknown'}`,
              description: post.content.substring(0, 100) + '...',
              image: post.image_url,
              url: '/feed',
              relevance: calculateRelevance(query, post.content),
            });
          });
        }
      }

      // Search Alumni (if type is 'all' or 'alumni')
      if (filters.type === 'all' || filters.type === 'alumni') {
        let alumniUrl = `/api/alumni/search?search=${encodeURIComponent(query)}&limit=5`;
        if (filters.batch) alumniUrl += `&batch=${filters.batch}`;
        if (filters.location) alumniUrl += `&location=${filters.location}`;

        const alumniResponse = await fetch(alumniUrl);
        if (alumniResponse.ok) {
          const alumniData = await alumniResponse.json();
          alumniData.alumni?.forEach((alumni: any) => {
            // Ensure all fields are strings to prevent trim errors
            const firstName = String(alumni.first_name || '');
            const lastName = String(alumni.last_name || '');
            const fullName = `${firstName} ${lastName}`.trim() || 'Alumni Member';
            const position = String(alumni.current_position || '');
            const bio = String(alumni.bio || '');
            const company = String(alumni.current_company || '');

            results.push({
              id: alumni.user_id || alumni.id,
              type: 'alumni',
              title: fullName,
              description: position || company || bio || 'Alumni member',
              image: alumni.profile_picture,
              url: `/profile/${alumni.user_id || alumni.id}`,
              relevance: calculateRelevance(query, `${firstName} ${lastName} ${company} ${position} ${bio}`),
            });
          });
        }
      }

      // Search Events (if type is 'all' or 'event')
      if (filters.type === 'all' || filters.type === 'event') {
        let eventsUrl = `/api/events?search=${encodeURIComponent(query)}&limit=5`;
        if (filters.location) eventsUrl += `&location=${filters.location}`;

        const eventsResponse = await fetch(eventsUrl);
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          eventsData.events?.forEach((event: any) => {
            results.push({
              id: event.id,
              type: 'event',
              title: event.title,
              description: event.description?.substring(0, 100) + '...' || 'No description',
              image: event.cover_image,
              url: '/events',
              relevance: calculateRelevance(query, `${event.title} ${event.description}`),
            });
          });
        }
      }

      // Search Jobs (if type is 'all' or 'job')
      if (filters.type === 'all' || filters.type === 'job') {
        let jobsUrl = `/api/jobs?search=${encodeURIComponent(query)}&limit=5`;
        if (filters.location) jobsUrl += `&location=${filters.location}`;

        const jobsResponse = await fetch(jobsUrl);
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          jobsData.jobs?.forEach((job: any) => {
            results.push({
              id: job.id,
              type: 'job',
              title: job.title,
              description: `${job.company} - ${job.location || 'Remote'}`,
              url: '/job-portal',
              relevance: calculateRelevance(query, `${job.title} ${job.company}`),
            });
          });
        }
      }

      // Sort by relevance
      results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      setSearchResults(results);
      
      // Only add to history if we got results and query is long enough
      if (shouldAddToHistory && results.length > 0) {
        addToHistory(query);
      }
    } catch (error) {
      console.error('Global search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addToHistory]);

  // Simple relevance calculation
  const calculateRelevance = (query: string, text: string): number => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    let score = 0;

    // Exact match
    if (lowerText === lowerQuery) score += 100;
    // Starts with query
    else if (lowerText.startsWith(lowerQuery)) score += 50;
    // Contains query
    else if (lowerText.includes(lowerQuery)) score += 25;

    // Word boundary matches
    const words = lowerQuery.split(' ');
    words.forEach(word => {
      if (lowerText.includes(word)) score += 10;
    });

    return score;
  };

  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchFilters({ type: 'all', dateRange: 'all' });
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchHistory,
        addToHistory,
        clearHistory,
        performGlobalSearch,
        showSearchModal,
        setShowSearchModal,
        searchFilters,
        setSearchFilters,
        clearSearchResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};