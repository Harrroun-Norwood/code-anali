import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Clock, DollarSign, Users, Star, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import ProgramDetailsModal from '@/components/ProgramDetailsModal';

interface Program {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: string;
  is_active: boolean;
}

const Programs = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load programs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLearnMoreClick = (program: Program) => {
    setSelectedProgram(program);
    setIsModalOpen(true);
  };

  const getFeaturedPrograms = () => programs.slice(0, 3);
  const getRegularPrograms = () => programs.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">Educational Excellence</span>
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-6">Our Programs</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover our comprehensive educational programs designed to nurture young minds and build strong foundations for lifelong learning. Each program is carefully crafted to ensure maximum engagement and learning outcomes.
          </p>
        </div>

        {/* Featured Programs */}
        {getFeaturedPrograms().length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Star className="h-6 w-6 text-yellow-500" />
              <h2 className="text-3xl font-bold text-foreground">Featured Programs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getFeaturedPrograms().map((program) => (
                <Card key={program.id} className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 group">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                      {program.category && (
                        <Badge variant="outline">{program.category}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {program.name}
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {program.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col justify-between flex-1">
                    <div className="space-y-4 mb-6">
                      {program.duration && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Duration</p>
                            <p className="text-muted-foreground">{program.duration}</p>
                          </div>
                        </div>
                      )}
                      {program.price && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Investment</p>
                            <p className="text-muted-foreground">₱{program.price.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Class Size</p>
                          <p className="text-muted-foreground">Small groups (8-12)</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleLearnMoreClick(program)}
                      className="w-full group-hover:bg-primary group-hover:text-white transition-all"
                      size="lg"
                    >
                      Learn More
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Programs */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8">All Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <Card key={program.id} className="h-full hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {program.name}
                    </CardTitle>
                    {program.category && (
                      <Badge variant="secondary">{program.category}</Badge>
                    )}
                  </div>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col justify-between flex-1">
                  <div className="space-y-3 mb-6">
                    {program.duration && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {program.duration}</span>
                      </div>
                    )}
                    {program.price && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>₱{program.price.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>Comprehensive curriculum</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleLearnMoreClick(program)}
                    className="w-full"
                    variant="outline"
                  >
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {programs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">No Programs Available</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              We're working on bringing you amazing educational programs. Check back soon for new offerings.
            </p>
            <Button variant="outline" size="lg" asChild>
              <Link to="/contact">Contact Us for Updates</Link>
            </Button>
          </div>
        )}

        {/* Call to Action */}
        <section className="mt-20 bg-primary/5 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who have transformed their learning journey with ANALI. 
            Our experienced educators are ready to help you achieve your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Button size="lg" className="flex-1" asChild>
              <Link to="/book-consultation">Book Free Consultation</Link>
            </Button>
            <Button size="lg" variant="outline" className="flex-1" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </div>

      {/* Program Details Modal */}
      <ProgramDetailsModal 
        program={selectedProgram}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProgram(null);
        }}
      />
    </div>
  );
};

export default Programs;