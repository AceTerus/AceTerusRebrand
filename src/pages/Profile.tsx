import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  MapPin,
  Calendar,
  Mail,
  GraduationCap,
  MessageCircle,
  Download,
  Upload,
  Star,
  Heart,
  Flame,
  Trophy,
  Award,
  Target,
  Zap,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState({
    name: "Alex Johnson",
    username: "@alexj",
    email: "alex.johnson@university.edu",
    bio: "Computer Science major passionate about AI and machine learning. Love helping classmates with coding projects!",
    location: "University of Tech",
    joinDate: "September 2023",
    major: "Computer Science",
    year: "Sophomore",
    avatar: "",
    stats: {
      posts: 24,
      uploads: 12,
      downloads: 89,
      followers: 156,
      following: 92,
    },
    streak: {
      current: 15,
      longest: 28,
      lastActive: new Date().toISOString(),
    },
    achievements: [
      {
        id: 1,
        title: "First Upload",
        description: "Uploaded your first study material",
        icon: "Upload",
        earnedAt: "2024-01-10",
        category: "milestone",
      },
      {
        id: 2,
        title: "Helpful Helper",
        description: "Received 10+ likes on your posts",
        icon: "Heart",
        earnedAt: "2024-01-15",
        category: "engagement",
      },
      {
        id: 3,
        title: "Study Streak",
        description: "Maintained a 7-day activity streak",
        icon: "Flame",
        earnedAt: "2024-01-20",
        category: "consistency",
      },
      {
        id: 4,
        title: "Knowledge Sharer",
        description: "Uploaded 10+ study materials",
        icon: "Award",
        earnedAt: "2024-01-25",
        category: "contribution",
      },
    ],
  });

  const [editForm, setEditForm] = useState({ ...user });

  const mockPosts = [
    {
      id: 1,
      content:
        "Just finished my machine learning project! The neural network achieved 94% accuracy on the test set. 🎉",
      timestamp: "2 hours ago",
      likes: 15,
      comments: 4,
      tags: ["MachineLearning", "AI", "Project"],
    },
    {
      id: 2,
      content:
        "Study group for Data Structures tomorrow at 3 PM in the library. We'll be covering binary trees and graph algorithms.",
      timestamp: "1 day ago",
      likes: 8,
      comments: 12,
      tags: ["StudyGroup", "DataStructures", "Algorithms"],
    },
  ];

  const mockUploads = [
    {
      id: 1,
      title: "Python Data Structures Cheat Sheet",
      type: "Cheat Sheet",
      downloads: 45,
      rating: 4.8,
      uploadDate: "2024-01-15",
    },
    {
      id: 2,
      title: "Linear Algebra Notes - Chapter 5",
      type: "Notes",
      downloads: 32,
      rating: 4.6,
      uploadDate: "2024-01-10",
    },
  ];

  const mockActivities = [
    {
      id: 1,
      action: 'Uploaded "Python Data Structures Cheat Sheet"',
      timestamp: "2 days ago",
      icon: Upload,
      color: "text-primary",
    },
    {
      id: 2,
      action: "Posted about machine learning project",
      timestamp: "3 days ago",
      icon: MessageCircle,
      color: "text-secondary",
    },
    {
      id: 3,
      action: 'Downloaded "Calculus II - Integration Techniques"',
      timestamp: "5 days ago",
      icon: Download,
      color: "text-primary",
    },
  ];

  const handleSaveProfile = () => {
    setUser({ ...editForm });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden shadow-elegant">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-hero relative">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 shadow-sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          <CardContent className="px-6 pb-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col md:flex-row md:items-end md:space-x-4 -mt-12">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-elegant bg-gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>

              <div className="flex-1 mt-4 md:mt-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-xl font-bold"
                    />
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-muted-foreground mb-2">{user.username}</p>
                    <p className="text-sm mb-3">{user.bio}</p>
                  </>
                )}

                {/* Profile Details */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="h-6 text-sm w-32"
                      />
                    ) : (
                      <span>{user.location}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <GraduationCap className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.major}
                        onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                        className="h-6 text-sm w-32"
                      />
                    ) : (
                      <span>{user.major}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {user.joinDate}</span>
                  </div>
                </div>
              </div>

              {isEditing && (
                <Button onClick={handleSaveProfile} className="mt-4 md:mt-0 bg-gradient-primary shadow-glow">
                  Save Changes
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t border-border/50">
              {Object.entries(user.stats).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground capitalize">{key}</p>
                </div>
              ))}
              
              {/* Streak Badge */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="relative">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{user.streak.current}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Section */}
        <div className="space-y-6 mb-6">
          {/* Streak Stats */}
          <Card className="shadow-elegant">
            <CardHeader>
              <h3 className="font-semibold text-lg flex items-center">
                <Flame className="w-5 h-5 text-orange-500 mr-2" />
                Streak Statistics
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gradient-primary/10 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{user.streak.current}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-gradient-hero/10 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-secondary" />
                  </div>
                  <p className="text-2xl font-bold text-secondary">{user.streak.longest}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements Grid */}
          <Card className="shadow-elegant">
            <CardHeader>
              <h3 className="font-semibold text-lg flex items-center">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                Trophy Collection ({user.achievements.length})
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.achievements.map((achievement) => {
                  const getIcon = (iconName: string) => {
                    const icons = { Upload, Heart, Flame, Award, Trophy, Target };
                    return icons[iconName as keyof typeof icons] || Trophy;
                  };
                  const Icon = getIcon(achievement.icon);
                  
                  const getCategoryColor = (category: string) => {
                    const colors = {
                      milestone: "text-blue-500 bg-blue-500/10",
                      engagement: "text-pink-500 bg-pink-500/10",
                      consistency: "text-orange-500 bg-orange-500/10",
                      contribution: "text-green-500 bg-green-500/10",
                    };
                    return colors[category as keyof typeof colors] || "text-gray-500 bg-gray-500/10";
                  };

                  return (
                    <div
                      key={achievement.id}
                      className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getCategoryColor(achievement.category)}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {achievement.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Earned {achievement.earnedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            {mockPosts.map((post) => (
              <Card key={post.id} className="shadow-elegant hover:shadow-glow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-sm">{user.name}</h3>
                        <span className="text-muted-foreground text-xs">{post.timestamp}</span>
                      </div>
                      <p className="text-sm mb-3">{post.content}</p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-4 text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm">{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockUploads.map((upload) => (
                <Card key={upload.id} className="shadow-elegant hover:shadow-glow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{upload.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {upload.type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{upload.rating}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Download className="w-3 h-3" />
                        <span>{upload.downloads} downloads</span>
                      </div>
                      <span>{upload.uploadDate}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="shadow-elegant">
              <CardHeader>
                <h3 className="font-semibold text-lg">Recent Activity</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                      <div className={`w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center ${activity.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;