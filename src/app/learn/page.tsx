"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Github, Linkedin, Globe, Mail, User, Filter } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(user =>
        user.skills.some(skill => skill.category.toLowerCase() === selectedCategory.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchTerm, selectedCategory, users]);

  // Get unique categories for filter
  const categories = ['all', ...new Set(users.flatMap(user => user.skills.map(skill => skill.category)))];

  const getSkillLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Discovering talented individuals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Skills</h1>
            <p className="text-gray-600 text-lg">Connect with talented individuals and explore their expertise</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none min-w-40"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
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
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="bg-white hover:shadow-lg transition-all duration-300 border-0 shadow-sm hover:scale-[1.02]">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-14 h-14 ring-2 ring-gray-100">
                      <AvatarImage src={user.imageUrl} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-600 text-white font-semibold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </CardTitle>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Social Links */}
                  {(user.githubUrl || user.linkedinUrl || user.portfolioUrl) && (
                    <div className="flex gap-2 mb-4">
                      {user.githubUrl && (
                        <a
                          href={user.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
                          title="GitHub"
                        >
                          <Github className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                        </a>
                      )}
                      {user.linkedinUrl && (
                        <a
                          href={user.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors duration-200 group"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                        </a>
                      )}
                      {user.portfolioUrl && (
                        <a
                          href={user.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors duration-200 group"
                          title="Portfolio"
                        >
                          <Globe className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Skills Section */}
                  {user.skills.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="secondary"
                            className={`px-3 py-1 text-xs font-medium border ${getSkillLevelColor(skill.level)} hover:scale-105 transition-transform duration-200`}
                          >
                            {skill.name}
                            <span className="ml-1 opacity-75">({skill.level})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No skills listed yet</p>
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