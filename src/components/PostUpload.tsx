import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, X, Plus } from "lucide-react";

interface PostUploadProps {
  onPostCreated: () => void;
}

export const PostUpload = ({ onPostCreated }: PostUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const oversized = files.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      toast({
        title: "File too large",
        description: "Each image must be under 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImages(files);

    // Generate previews for all selected images
    const readers: Promise<string>[] = files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || "");
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((results) => setImagePreviews(results));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create posts",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const imageUrls: string[] = [];

      // Upload all selected images (if any)
      for (const file of selectedImages) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-images").getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Create post (store first image as legacy image_url for compatibility)
      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim(),
          image_url: imageUrls[0] || null,
          tags: tags,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Store all images in post_images for multi-image gallery
      if (newPost && imageUrls.length > 0) {
        const payload = imageUrls.map((url, index) => ({
          post_id: newPost.id,
          file_url: url,
          position: index,
        }));

        const { error: imagesError } = await supabase
          .from("post_images")
          .insert(payload);

        if (imagesError) throw imagesError;
      }

      toast({
        title: "Post created!",
        description: "Your post has been shared successfully",
      });

      // Reset form
      setContent("");
      setTags([]);
      setSelectedImages([]);
      setImagePreviews([]);
      setIsOpen(false);
      onPostCreated();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <Button 
            onClick={() => setIsOpen(true)}
            variant="outline" 
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Share a new post
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Image Upload */}
          <div className="flex items-center gap-4">
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <Camera className="w-4 h-4" />
                Add Photos
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="relative">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {imagePreviews.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Preview ${idx + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                ))}
              </div>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => {
                  setSelectedImages([]);
                  setImagePreviews([]);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddTag} size="sm" variant="outline">
                Add
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || !content.trim()}
            >
              {isUploading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};