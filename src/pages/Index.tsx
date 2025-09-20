import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Users, Book, Bell, Edit, Lock, GraduationCap, Star, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const features = [
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Real-time Notifications',
      description: 'Receive instant updates about grades and school-wide announcements.'
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Secure Access',
      description: 'Role-based secure access ensures that users can only view information relevant to them.'
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: 'Academic Excellence',
      description: 'Comprehensive academic management system designed to support student success and growth.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Welcome To<br />
                <span className="text-primary">ANALI</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Assist N Achieve Leaders International - Empowering Students to reach their full potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link to="/programs">Learn More</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Log In</Link>
                </Button>
              </div>
            </div>
            
            {/* Right side - Enhanced Promotional Banner */}
            <div className="relative">
              <div className="bg-gradient-to-br from-primary via-primary to-primary/90 rounded-2xl p-8 text-white relative overflow-hidden min-h-[400px]">
                <div className="relative z-10">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mr-4 p-1">
                      <img 
                        src="/assets/anali-logo.png" 
                        alt="ANALI Logo" 
                        className="w-14 h-14 rounded-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white mb-1">ANALI</div>
                      <div className="text-sm text-white/90">Leaders International</div>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-3 leading-tight">"TODAY'S CHILD,<br />TOMORROW'S LEADER."</h2>
                  
                  <div className="inline-flex items-center justify-center bg-yellow-400 text-primary rounded-full px-6 py-2 font-bold mb-6 text-lg">
                    ENROLL NOW
                  </div>
                  
                  <div className="space-y-2 text-lg">
                    <p className="font-bold text-yellow-300 text-2xl">EDUCATION</p>
                    <p>is a <span className="font-bold text-yellow-300">Gift</span> and</p>
                    <p>Educating children</p>
                    <p>is our <span className="font-bold text-yellow-300">Passion.</span></p>
                  </div>
                  
                  {/* Achievement badges */}
                  <div className="absolute top-4 right-4 space-y-2">
                    <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-8 h-8 text-primary" />
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute bottom-4 left-4 w-20 h-20 bg-white/10 rounded-full"></div>
                <div className="absolute top-1/2 right-8 w-8 h-8 bg-yellow-400/30 rounded-full"></div>
                <div className="absolute bottom-8 right-16 w-6 h-6 bg-white/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-primary font-semibold text-lg mb-2">FEATURES</p>
              <h2 className="text-4xl font-bold text-foreground mb-4">Everything You Need In One Place</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Our comprehensive platform provides tools for students, parents, teachers, and administrators.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors duration-300 p-6">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mb-4 text-white">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="py-20 bg-primary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Bell className="w-6 h-6 text-primary" />
                <p className="text-primary font-semibold text-lg">ANNOUNCEMENTS</p>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-4">Latest News & Updates</h2>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Stay informed with the latest announcements and important updates from ANALI.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight">{announcement.title}</CardTitle>
                      {announcement.is_featured && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {announcement.content.length > 150 
                        ? `${announcement.content.substring(0, 150)}...` 
                        : announcement.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" asChild>
                <Link to="/contact">Contact Us for More Info</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* About ANALI Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mr-4 p-1 shadow-md">
                  <img 
                    src="/assets/anali-logo.png" 
                    alt="ANALI Logo" 
                    className="w-18 h-18 rounded-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-foreground">ANALI</h3>
                  <p className="text-muted-foreground">Assist N Achieve Leaders International</p>
                </div>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Empowering Students in the <span className="text-primary">Philippines</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Based in the Philippines, ANALI is dedicated to nurturing young minds through innovative 
                educational programs. We believe that education is a gift, and our passion lies in helping 
                every child reach their full potential as tomorrow's leaders.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-muted-foreground">Students Served</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">15+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
              </div>
              <Button size="lg" asChild>
                <Link to="/programs">Explore Our Programs</Link>
              </Button>
            </div>
            <div className="space-y-6">
              <Card className="p-6 bg-white border-2 border-primary/20">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-lg">Excellence in Education</h4>
                </div>
                <p className="text-muted-foreground">
                  Our proven methodology combines traditional learning with innovative approaches 
                  to ensure student success.
                </p>
              </Card>
              <Card className="p-6 bg-white border-2 border-primary/20">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-lg">Personalized Learning</h4>
                </div>
                <p className="text-muted-foreground">
                  One-on-one tutoring sessions and small class sizes ensure each student 
                  receives individual attention.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-2">Ready to join ANALI?</h2>
              <p className="text-xl text-white/90">Achieve Leaders, Achieve Success</p>
            </div>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-50" asChild>
              <Link to="/auth">Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src="/assets/anali-logo.png" 
                  alt="ANALI Logo" 
                  className="w-8 h-8 rounded-full mr-3 object-contain"
                />
                <h3 className="text-xl font-bold">ANALI</h3>
              </div>
              <p className="text-white/80">Assist N Achieve Leaders International</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/" className="block text-white/80 hover:text-white">Home</Link>
                <Link to="/about" className="block text-white/80 hover:text-white">About Us</Link>
                <Link to="/programs" className="block text-white/80 hover:text-white">Programs</Link>
                <Link to="/announcements" className="block text-white/80 hover:text-white">Announcements</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <div className="space-y-2">
                <Link to="/student-dashboard" className="block text-white/80 hover:text-white">Student Portal</Link>
                <Link to="/teacher-dashboard" className="block text-white/80 hover:text-white">Teacher Portal</Link>
                <Link to="/about" className="block text-white/80 hover:text-white">FAQs</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>
              <div className="space-y-2 text-white/80">
                <p>395 Brgy, Aguinaldo Hwy</p>
                <p>Bacoor, Cavite, Philippines</p>
                <p>Phone: 09190671960, 09673008378</p>
                <p>Email: analilearningigloo@gmail.com</p>
                <Button variant="ghost" className="text-white/80 hover:text-white mt-3 p-0 h-auto" asChild>
                  <Link to="/auth">Log In</Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/60">
            © 2025 ANALI - Assist N Achieve Leaders International. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
