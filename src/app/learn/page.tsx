"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Github, Linkedin, Globe, Mail, User, Filter, Users } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  level: string;
  category: string;
  type: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  email: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skills: Skill[];
}

export default function LearnPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mentorCount, setMentorCount] = useState<number>(0);
  
  useEffect(() => {
    async function fetchUsersWithSkills() {
      try {
        const response = await fetch('/api/all-users-with-skills');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: User[] = await response.json();
        setUsers(data);
        setFilteredUsers(data);

        // Set mentor count to the total number of filtered users
        setMentorCount(data.length);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsersWithSkills();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.skills.some(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredUsers(filtered);

    // Update mentor count to the total number of filtered users
    setMentorCount(filtered.length);
  }, [searchTerm, users]);

  const getSkillLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-50 text-green-700 border-green-200';
      case 'intermediate': return 'bg-green-100 text-green-800 border-green-300';
      case 'advanced': return 'bg-green-200 text-green-900 border-green-400';
      case 'expert': return 'bg-green-300 text-green-900 border-green-500';
      default: return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 font-medium">Discovering talented individuals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-8 relative">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Skills</h1>
            <p className="text-gray-700 text-lg">Connect with talented individuals and explore their expertise</p>
          </div>

          {/* Mentor Count at top right */}
          <div className="absolute top-8 right-4 border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm bg-white">
            <Users className="inline-block w-4 h-4 mr-2 -mt-0.5" />
            {mentorCount} Mentors available
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 bg-white text-gray-900"
              />
            </div>
            {/* Results count */}
            
          </div>

          {/* Results count */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} individuals
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-700">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="bg-white hover:shadow-lg transition-all duration-300 border border-black shadow-sm hover:scale-[1.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12 ring-1 ring-gray-200">
                      <AvatarImage src={user.imageUrl} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="bg-gray-800 text-white text-sm font-semibold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </CardTitle>
                      <div className="flex items-center mt-0.5 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-gray-500" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Social Links */}
                  {(user.githubUrl || user.linkedinUrl || user.portfolioUrl) && (
                    <div className="flex gap-1.5 mb-3">
                      {user.githubUrl && (
                        <a
                          href={user.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 group border border-gray-200"
                          title="GitHub"
                        >
                          <Github className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-900" />
                        </a>
                      )}
                      {user.linkedinUrl && (
                        <a
                          href={user.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 group border border-gray-200"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-900" />
                        </a>
                      )}
                      {user.portfolioUrl && (
                        <a
                          href={user.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 group border border-gray-200"
                          title="Portfolio"
                        >
                          <Globe className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-900" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Skills Section */}
                  {user.skills.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-medium text-gray-900 mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {user.skills.map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="secondary"
                            className={`px-2.5 py-0.5 text-xs font-medium border ${getSkillLevelColor(skill.level)} hover:scale-105 transition-transform duration-200`}
                          >
                            {skill.name}
                            <span className="ml-1 opacity-75">({skill.level})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500">No skills listed yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}