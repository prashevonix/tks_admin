import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useSearch } from '@/contexts/SearchContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Clock, X, TrendingUp, FileText, Users, Calendar, Briefcase, MessageSquare } from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchHistory,
    clearHistory,
    performGlobalSearch,
    showSearchModal,
    setShowSearchModal,
    searchFilters,
    setSearchFilters,
    clearSearchResults,
  } = useSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearchModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearchModal]);

  const handleClose = () => {
    setShowSearchModal(false);
    // Reset search state
    setSearchQuery('');
    setShowFilters(false);
    // Use the context method to clear results properly
    clearSearchResults();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowSearchModal]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (showSearchModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchModal]);

  // Debounce search to avoid excessive API calls
  const debounceTimeout = useRef<NodeJS.Timeout>();
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    // Clear results immediately if query is empty
    if (query.trim().length === 0) {
      clearSearchResults();
      return;
    }
    
    // Only search if query has at least 2 characters
    if (query.trim().length >= 2) {
      debounceTimeout.current = setTimeout(() => {
        performGlobalSearch(query, searchFilters);
      }, 300); // 300ms debounce
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If there are search results, navigate to the first one
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        if (firstResult.type === 'alumni') {
          const profileUrl = `/profile/${firstResult.id}`;
          handleClose();
          setTimeout(() => setLocation(profileUrl), 100);
        } else {
          handleResultClick(firstResult.url);
        }
      } else if (searchQuery.trim().length >= 2) {
        // If no results yet but query is valid, trigger immediate search with filters
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        performGlobalSearch(searchQuery, searchFilters);
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleResultClick = (url: string) => {
    handleClose();
    setLocation(url);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-4 h-4" />;
      case 'alumni': return <Users className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'job': return <Briefcase className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  if (!showSearchModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20 px-4">
      <Card ref={modalRef} className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-up">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search posts, alumni, events, jobs..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 py-3 text-base border-0 focus-visible:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-1 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition-colors"
              >
                🔍 Filters
              </button>
              {searchFilters.type !== 'all' && (
                <span className="px-2 py-1 bg-[#008060]/10 text-[#008060] rounded text-xs font-medium">
                  {searchFilters.type}
                </span>
              )}
              {searchFilters.location && (
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                  📍 {searchFilters.location}
                </span>
              )}
              {searchFilters.batch && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                  🎓 {searchFilters.batch}
                </span>
              )}
            </div>
            <span>Press <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to close</span>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Type</label>
                  <select
                    value={searchFilters.type || 'all'}
                    onChange={(e) => {
                      const newFilters = { ...searchFilters, type: e.target.value as any };
                      setSearchFilters(newFilters);
                      if (searchQuery.trim().length >= 2) {
                        performGlobalSearch(searchQuery, newFilters);
                      }
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#008060]"
                  >
                    <option value="all">All</option>
                    <option value="post">Posts</option>
                    <option value="alumni">Alumni</option>
                    <option value="event">Events</option>
                    <option value="job">Jobs</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="Any location"
                    value={searchFilters.location || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#008060]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Batch</label>
                  <input
                    type="text"
                    placeholder="e.g., 2020"
                    value={searchFilters.batch || ''}
                    onChange={(e) => setSearchFilters({ ...searchFilters, batch: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#008060]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const resetFilters = { type: 'all' as const, dateRange: 'all' as const };
                    setSearchFilters(resetFilters);
                    if (searchQuery.trim().length >= 2) {
                      performGlobalSearch(searchQuery, resetFilters);
                    }
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (searchQuery.trim().length >= 2) {
                      performGlobalSearch(searchQuery, searchFilters);
                    }
                  }}
                  className="text-xs bg-[#008060] hover:bg-[#007055]"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Search Results or History */}
        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((result) => {
                if (result.type === 'alumni') {
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors text-left"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const profileUrl = `/profile/${result.id}`;
                        handleClose();
                        setTimeout(() => setLocation(profileUrl), 100);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {result.image ? (
                          <img src={result.image} alt={result.title} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {result.title?.split(' ')?.[0]?.[0]?.toUpperCase()}{result.title?.split(' ')?.[1]?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{result.title}</p>
                          <p className="text-sm text-gray-500 truncate">{result.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                }
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result.url)}
                    className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-start gap-3 text-left transition-colors"
                  >
                    <div className="mt-1 text-[#008060]">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{result.title}</span>
                        <span className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                          {result.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>
                    </div>
                    {result.image && (
                      <img src={result.image} alt="" className="w-12 h-12 rounded object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : searchQuery.trim().length > 0 && searchQuery.trim().length < 2 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">Type at least 2 characters to search</p>
            </div>
          ) : searchQuery ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-500 mt-2">Try different keywords or adjust filters</p>
            </div>
          ) : searchHistory.length > 0 ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(query)}
                    className="w-full p-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-left text-sm text-gray-700"
                  >
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">Start typing to search...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};