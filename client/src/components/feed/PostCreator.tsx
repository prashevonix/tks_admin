
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface PostCreatorProps {
  postText: string;
  attachedFiles: File[];
  isPosting: boolean;
  onPostTextChange: (text: string) => void;
  onFileAttachment: (type: 'document' | 'photo' | 'video') => void;
  onCreateEvent: () => void;
  onPost: () => void;
  onRemoveFile: (index: number) => void;
}

export const PostCreator: React.FC<PostCreatorProps> = ({
  postText,
  attachedFiles,
  isPosting,
  onPostTextChange,
  onFileAttachment,
  onCreateEvent,
  onPost,
  onRemoveFile,
}) => {
  const { user, alumni } = useAuth();
  
  const displayName = `${alumni?.first_name || ''} ${alumni?.last_name || ''}`.trim() || user?.username || 'User';
  
  const getProfilePicture = () => {
    if (alumni?.profile_picture && alumni.profile_picture.trim() !== '') {
      return alumni.profile_picture;
    }
    
    const seed = encodeURIComponent(displayName);
    switch (alumni?.gender) {
      case 'male':
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
      case 'female':
        return `https://api.dicebear.com/7.x/avataaars-neutral/svg?seed=${seed}&backgroundColor=ff69b4`;
      case 'other':
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=ffa500`;
      case 'prefer_not_to_say':
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6c63ff`;
      default:
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=008060`;
    }
  };
  
  return (
    <Card className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 mb-6">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={getProfilePicture()} alt="Profile" />
            <AvatarFallback className="bg-[#008060] text-white">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Input
              placeholder="What's happening ?"
              value={postText}
              onChange={(e) => onPostTextChange(e.target.value)}
              className="border-0 bg-transparent text-lg placeholder:text-gray-400 focus-visible:ring-0 p-0 h-auto"
            />
            
            {attachedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <button 
                      onClick={() => onRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 text-xs ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => onFileAttachment('document')}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#008060] transition-colors"
                >
                  <span className="text-lg">📄</span>
                  <span className="text-sm font-medium">Document</span>
                </button>
                <button 
                  onClick={() => onFileAttachment('photo')}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#008060] transition-colors"
                >
                  <span className="text-lg">📸</span>
                  <span className="text-sm font-medium">Photo</span>
                </button>
                <button 
                  onClick={() => onFileAttachment('video')}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#008060] transition-colors"
                >
                  <span className="text-lg">🎥</span>
                  <span className="text-sm font-medium">Video</span>
                </button>
              </div>
              <Button 
                onClick={onPost}
                disabled={isPosting || (!postText.trim() && attachedFiles.length === 0)}
                className="bg-[#008060] hover:bg-[#007055] text-white px-8 py-2 rounded-full font-medium disabled:opacity-50"
              >
                {isPosting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
