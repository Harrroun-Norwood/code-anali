import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MapPin, Users, Award, Target, Heart, BookOpen, Calendar } from 'lucide-react';

const About = () => {
  const branches = [
    {
      name: 'ANALI Main Campus',
      address: '123 Education Street, Makati City',
      contact: '+63 2 8123-4567',
      programs: ['All Programs Available']
    },
    {
      name: 'ANALI Quezon City Branch',
      address: '456 Learning Avenue, Quezon City',
      contact: '+63 2 8765-4321',
      programs: ['Abacus Math', 'Singapore Math', 'Robotics']
    },
    {
      name: 'ANALI Cebu Branch',
      address: '789 Knowledge Blvd, Cebu City',
      contact: '+63 32 234-5678',
      programs: ['Abacus Math', 'Singapore Math']
    }
  ];

  const values = [
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Excellence',
      description: 'We strive for the highest standards in education and student development.'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Care',
      description: 'We nurture each student with compassion and individual attention.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community',
      description: 'We build strong relationships between students, parents, and educators.'
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Achievement',
      description: 'We celebrate every milestone and encourage continuous growth.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              About <span className="text-primary">ANALI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Advancing Nurturing and Learning Initiative - Your partner in educational excellence since 2010.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To provide innovative, high-quality educational programs that nurture young minds, 
                  develop critical thinking skills, and prepare students for success in an ever-evolving world. 
                  We are committed to creating a supportive learning environment where every student can thrive.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" />
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To be the leading educational institution in the Philippines, recognized for our excellence 
                  in mathematics, technology, and holistic education. We envision a future where our graduates 
                  become confident, innovative, and responsible global citizens.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Educational Philosophy</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We believe that every child has unique potential waiting to be unlocked through personalized learning experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 text-primary">
                    {value.icon}
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Our Branches */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Branches</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find an ANALI center near you. We have multiple locations to serve families across the Philippines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {branches.map((branch, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {branch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Address:</p>
                    <p className="text-sm">{branch.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contact:</p>
                    <p className="text-sm font-medium">{branch.contact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Available Programs:</p>
                    <div className="flex flex-wrap gap-1">
                      {branch.programs.map((program, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {program}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose ANALI */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose ANALI?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Expert Educators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Our certified teachers have years of experience and specialized training in innovative teaching methodologies.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Proven Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Over 95% of our students show significant improvement in their academic performance and confidence levels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Comprehensive Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  From traditional abacus to modern robotics, we offer diverse programs to suit different learning styles and interests.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl mb-4">
                Ready to Join the ANALI Family?
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg">
                Experience the difference quality education makes. Contact us today to learn more about our programs.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild> 
                  <Link to="/contact">Contact Us</Link> 
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  asChild
                >
                  <Link to="/book-consultation" className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Visit
                  </Link>
                </Button>

              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default About;