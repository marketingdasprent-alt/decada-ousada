
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CampaignTagsManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  placeholder?: string;
}

export const CampaignTagsManager: React.FC<CampaignTagsManagerProps> = ({
  tags = [],
  onTagsChange,
  availableTags = [],
  placeholder = "Selecionar campanha..."
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
  };

  const handleCreateNewTag = () => {
    const trimmedTag = newTagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      setNewTagInput('');
      setShowNewTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };


  const getTagColor = (tag: string) => {
    const colors = [
      'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'bg-green-500/20 text-green-300 border-green-500/30',
      'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    ];
    
    const hash = tag.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Tag className="h-4 w-4" />
        <span>Campanhas</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Badge 
                className={`${getTagColor(tag)} px-2 py-1 text-xs border flex items-center gap-1`}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>

        {availableTags.filter(tag => !tags.includes(tag)).length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="h-7 px-2 text-xs border-border text-muted-foreground hover:bg-muted hover:text-primary hover:border-primary/50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Selecionar Tag
          </Button>
        )}
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewTagInput(!showNewTagInput)}
          className="h-7 px-2 text-xs border-dashed border-border text-muted-foreground hover:bg-muted hover:text-primary hover:border-primary/50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Criar Nova Tag
        </Button>
      </div>

      {showNewTagInput && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 items-center"
        >
          <Input
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Nome da nova tag..."
            className="h-8 text-sm bg-background border-border"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateNewTag();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleCreateNewTag}
            disabled={!newTagInput.trim()}
            className="h-8 px-3"
          >
            Criar
          </Button>
        </motion.div>
      )}

      {showSuggestions && availableTags.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-muted-foreground">Campanhas disponíveis:</p>
          <div className="flex flex-wrap gap-1">
            {availableTags
              .filter(tag => !tags.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    handleAddTag(tag);
                    setShowSuggestions(false);
                  }}
                  className={`${getTagColor(tag)} px-2 py-1 text-xs border rounded-md hover:bg-opacity-80 transition-colors`}
                >
                  {tag}
                </button>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
