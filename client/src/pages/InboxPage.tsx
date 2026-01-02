import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Send, ArrowLeft, Check, CheckCheck, MoreVertical, Paperclip, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    email: string;
  };
  receiver?: {
    id: string;
    username: string;
    email: string;
  };
}

interface Conversation {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  isOnline?: boolean;
}

interface AlumniUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  batch?: string;
}

export const InboxPage = (): JSX.Element => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Set page title
  React.useEffect(() => {
    document.title = "Inbox - TKS Alumni Portal";
  }, []);

  // User search states
  const [allUsers, setAllUsers] = useState<AlumniUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AlumniUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AlumniUser | null>(null);

  useEffect(() => {
    fetchAllMessages();
    fetchAllUsers();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchAllMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (allMessages.length > 0) {
      buildConversations();
    }
  }, [allMessages]);

  // Fuzzy search function
  const fuzzyMatch = (str: string, pattern: string): boolean => {
    const strLower = str.toLowerCase();
    const patternLower = pattern.toLowerCase();

    if (strLower.includes(patternLower)) return true;

    let patternIdx = 0;
    let strIdx = 0;
    let matches = 0;

    while (strIdx < strLower.length && patternIdx < patternLower.length) {
      if (strLower[strIdx] === patternLower[patternIdx]) {
        matches++;
        patternIdx++;
      }
      strIdx++;
    }

    return matches >= Math.floor(patternLower.length * 0.7);
  };

  const fetchAllUsers = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch('/api/alumni/search?limit=1000', {
        headers: {
          'user-id': userId || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        const users = data.alumni.map((alumni: any) => ({
          id: alumni.user_id,
          username: alumni.user?.username || alumni.email,
          email: alumni.email,
          first_name: alumni.first_name,
          last_name: alumni.last_name,
          profile_picture: alumni.profile_picture,
          batch: alumni.batch
        }));
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers([]);
      return;
    }

    const query = searchQuery.trim();
    const currentUserId = user?.id || localStorage.getItem('userId');

    const filtered = allUsers
      .filter(u => u.id !== currentUserId)
      .filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const username = u.username || '';
        const email = u.email || '';

        return (
          fuzzyMatch(fullName, query) ||
          fuzzyMatch(username, query) ||
          fuzzyMatch(email, query) ||
          (u.batch && fuzzyMatch(u.batch, query))
        );
      })
      .slice(0, 10);

    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  const fetchAllMessages = async () => {
    try {
      const userId = user?.id || localStorage.getItem('userId');

      const [inboxRes, sentRes] = await Promise.all([
        fetch('/api/messages/inbox', {
          headers: { 'user-id': userId || '' }
        }),
        fetch('/api/messages/sent', {
          headers: { 'user-id': userId || '' }
        })
      ]);

      if (inboxRes.ok && sentRes.ok) {
        const inboxData = await inboxRes.json();
        const sentData = await sentRes.json();

        const combined = [
          ...(inboxData.messages || []),
          ...(sentData.messages || [])
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setAllMessages(combined);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildConversations = () => {
    const currentUserId = user?.id || localStorage.getItem('userId');
    const conversationMap = new Map<string, Conversation>();

    allMessages.forEach(msg => {
      const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === currentUserId ? msg.receiver : msg.sender;

      if (!otherUser) return;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          username: otherUser.username,
          email: otherUser.email,
          firstName: otherUser.username?.split(' ')[0],
          lastName: otherUser.username?.split(' ')[1],
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: [],
        });
      }

      const conv = conversationMap.get(otherUserId)!;
      conv.messages.push(msg);

      // Update last message if this one is newer
      if (new Date(msg.created_at) > new Date(conv.lastMessageTime)) {
        conv.lastMessage = msg.content;
        conv.lastMessageTime = msg.created_at;
      }

      // Count unread messages (only received messages)
      if (msg.receiver_id === currentUserId && !msg.is_read) {
        conv.unreadCount++;
      }
    });

    const convArray = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    setConversations(convArray);
  };

  const getTimeDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getDateSeparator = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, previousMsg?: Message): boolean => {
    if (!previousMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.created_at).toDateString();
    return currentDate !== previousDate;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    if (!selectedConversation && !selectedUser) {
      toast({
        title: "Error",
        description: "Please select a recipient",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const receiverId = selectedConversation?.userId || selectedUser?.id;

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId || ''
        },
        body: JSON.stringify({
          receiverId,
          subject: 'Chat Message',
          content: messageText,
          senderName: user?.username
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage = data.message;

        setMessageText("");
        // Reset textarea height
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = 'auto';
        }

        // Immediately update the conversation with the new message
        if (selectedConversation) {
          const updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, newMessage],
            lastMessage: newMessage.content,
            lastMessageTime: newMessage.created_at
          };
          setSelectedConversation(updatedConversation);

          // Update conversations list
          setConversations(prev => {
            const index = prev.findIndex(c => c.userId === selectedConversation.userId);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = updatedConversation;
              // Sort by most recent
              return updated.sort((a, b) => 
                new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
              );
            }
            return prev;
          });
        } else if (selectedUser) {
          // New conversation - fetch messages to get the full conversation
          fetchAllMessages();
          setIsComposeOpen(false);
          setSelectedUser(null);
          setSearchQuery("");
        }

        setTimeout(scrollToBottom, 100);

        // Refresh messages in background
        setTimeout(fetchAllMessages, 1000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation?.messages]);

  const handleConversationClick = async (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Mark all unread messages in this conversation as read
    const currentUserId = user?.id || localStorage.getItem('userId');
    const unreadMessages = conversation.messages.filter(
      msg => msg.receiver_id === currentUserId && !msg.is_read
    );

    for (const msg of unreadMessages) {
      try {
        await fetch(`/api/messages/${msg.id}/read`, {
          method: 'PUT',
          headers: { 'user-id': currentUserId || '' }
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }

    // Update local state
    setTimeout(fetchAllMessages, 500);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = user?.id || localStorage.getItem('userId');
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'user-id': userId || '' }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Message deleted successfully",
        });

        // Update the selected conversation by removing the deleted message
        if (selectedConversation) {
          const updatedMessages = selectedConversation.messages.filter(m => m.id !== messageId);

          if (updatedMessages.length === 0) {
            // If no messages left in conversation, close it
            setSelectedConversation(null);
          } else {
            setSelectedConversation({
              ...selectedConversation,
              messages: updatedMessages,
              lastMessage: updatedMessages[updatedMessages.length - 1].content,
              lastMessageTime: updatedMessages[updatedMessages.length - 1].created_at
            });
          }
        }

        // Refresh all messages
        fetchAllMessages();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Delete message error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const filteredConversations = React.useMemo(() => {
    if (!conversationSearchQuery.trim()) return conversations;
    const query = conversationSearchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.username?.toLowerCase().includes(query) ||
      conv.email?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, conversationSearchQuery]);

  if (loading) {
    return (
      <AppLayout currentPage="inbox">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#008060]/30 border-t-[#008060] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentPage="inbox">
      <div className="flex h-full bg-gray-100">
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] border-r border-gray-300 bg-white flex-col`}>
          {/* Header */}
          <div className="bg-[#008060] text-white p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex gap-2">
              <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-[#007055]">
                    <Send className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">New Message</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="text-sm font-medium">To</label>
                      {selectedUser ? (
                        <div className="flex items-center gap-3 p-3 border-2 border-[#008060]/20 rounded-lg bg-[#008060]/5 transition-all">
                          <div className="w-12 h-12 rounded-full bg-[#008060] text-white flex items-center justify-center font-semibold text-lg shadow-sm">
                            {selectedUser.first_name?.charAt(0) || selectedUser.username?.charAt(0) || 'A'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {selectedUser.first_name && selectedUser.last_name 
                                ? `${selectedUser.first_name} ${selectedUser.last_name}`
                                : selectedUser.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                            {selectedUser.batch && (
                              <p className="text-xs text-[#008060] font-medium">Batch {selectedUser.batch}</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(null);
                              setSearchQuery("");
                            }}
                            className="flex-shrink-0"
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Search by name, email..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="pl-10"
                          />
                          {showDropdown && filteredUsers.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {filteredUsers.map((u) => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setSearchQuery("");
                                    setShowDropdown(false);
                                  }}
                                  className="p-3 hover:bg-[#008060]/5 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0"
                                >
                                  <div className="w-10 h-10 rounded-full bg-[#008060] text-white flex items-center justify-center font-semibold">
                                    {u.first_name?.charAt(0) || u.username?.charAt(0) || 'A'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {u.first_name && u.last_name 
                                        ? `${u.first_name} ${u.last_name}`
                                        : u.username}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                    {u.batch && (
                                      <p className="text-xs text-[#008060] font-medium">Batch {u.batch}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <Textarea
                        placeholder="Type your message..."
                        rows={6}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!selectedUser || !messageText.trim() || sending}
                      className="w-full bg-[#008060] hover:bg-[#007055]"
                    >
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={conversationSearchQuery}
                onChange={(e) => setConversationSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-white"
              />
              {conversationSearchQuery && (
                <button
                  onClick={() => setConversationSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {conversationSearchQuery ? 'No conversations found' : 'No messages yet'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {conversationSearchQuery 
                    ? 'Try searching with different keywords'
                    : 'Start a conversation with an alumni'}
                </p>
                {!conversationSearchQuery && (
                  <Button
                    onClick={() => setIsComposeOpen(true)}
                    className="bg-[#008060] hover:bg-[#007055] text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.userId}
                  onClick={() => handleConversationClick(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${
                    selectedConversation?.userId === conv.userId 
                      ? 'bg-[#008060]/5 border-l-4 border-l-[#008060]' 
                      : 'border-l-4 border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#008060] text-white flex items-center justify-center font-semibold text-lg flex-shrink-0">
                      {conv.firstName?.charAt(0) || conv.username?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.firstName && conv.lastName 
                            ? `${conv.firstName} ${conv.lastName}`
                            : conv.username}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {getTimeDisplay(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 bg-[#008060] text-white rounded-full h-5 min-w-5 flex items-center justify-center text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-[#008060] text-white p-4 flex items-center gap-3 shadow-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="text-white hover:bg-[#007055] p-2 flex-shrink-0"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold text-lg overflow-hidden flex-shrink-0">
                  {selectedConversation.firstName?.charAt(0) || selectedConversation.username?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {selectedConversation.firstName && selectedConversation.lastName 
                      ? `${selectedConversation.firstName} ${selectedConversation.lastName}`
                      : selectedConversation.username}
                  </h3>
                  <p className="text-xs text-white/80 truncate">
                    {selectedConversation.isOnline ? 'Online' : 'Tap for info'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-[#007055] flex-shrink-0"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'%23f0f0f0\' fill-opacity=\'0.3\'/%3E%3C/svg%3E")' }}>
                {selectedConversation.messages
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((msg, index, array) => {
                    const currentUserId = user?.id || localStorage.getItem('userId');
                    const isSent = msg.sender_id === currentUserId;
                    const previousMsg = index > 0 ? array[index - 1] : undefined;
                    const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);

                    return (
                      <React.Fragment key={msg.id}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex justify-center my-4">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                              <span className="text-xs text-gray-600 font-medium">
                                {getDateSeparator(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-1 group`}>
                          <div
                            className={`max-w-[75%] sm:max-w-[70%] rounded-lg p-3 transition-shadow hover:shadow-md relative ${
                              isSent 
                                ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-sm shadow-sm' 
                                : 'bg-white text-gray-900 rounded-tl-sm shadow-md'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={`flex items-center gap-1 justify-end mt-1 text-[11px] ${
                              isSent ? 'text-gray-600' : 'text-gray-500'
                            }`}>
                              <span>{getMessageTime(msg.created_at)}</span>
                              {isSent && (
                                <span className="ml-1">
                                  {msg.is_read ? (
                                    <CheckCheck className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Check className="w-4 h-4 text-gray-500" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Edit/Delete Options (only for sent messages) */}
                            {isSent && (
                              <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                    title="Delete message"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-[#008060] mb-2"
                    title="Attach file (coming soon)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Textarea
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim()) {
                          handleSendMessage();
                        }
                      }
                    }}
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none py-3 px-4 rounded-3xl border-gray-300 focus:border-[#008060] focus:ring-1 focus:ring-[#008060]"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    className="bg-[#008060] hover:bg-[#007055] text-white rounded-full p-3 h-[44px] w-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <Send className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};