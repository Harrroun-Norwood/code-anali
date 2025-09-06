import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, BookOpen, Users, Calendar, Award, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Program {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: string;
  is_active: boolean;
}

interface ProgramDetailsModalProps {
  program: Program | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProgramDetailsModal = ({ program, isOpen, onClose }: ProgramDetailsModalProps) => {
  const { user } = useAuth();

  if (!program) return null;

  // Enhanced program details (would normally come from database)
  const programDetails = {
    objectives: [
      'Develop critical thinking and problem-solving skills',
      'Build strong foundation in core subject areas',
      'Foster creativity and innovation',
      'Enhance communication and collaboration abilities'
    ],
    curriculum: [
      'Interactive learning modules',
      'Hands-on practical exercises',
      'Regular assessments and feedback',
      'Personalized learning paths'
    ],
    requirements: [
      'Basic computer literacy',
      'Commitment to regular attendance',
      'Willingness to participate actively',
      'Access to learning materials'
    ],
    benefits: [
      'Certified completion certificate',
      'Access to online resources',
      'Mentorship opportunities',
      'Career guidance and support'
    ]
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{program.name}</DialogTitle>
              <DialogDescription className="text-base mt-2">
                {program.description}
              </DialogDescription>
            </div>
            {program.category && (
              <Badge variant="secondary" className="ml-4">{program.category}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Program Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Program Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{program.duration || 'Flexible'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Investment</p>
                    <p className="text-muted-foreground">₱{program.price?.toLocaleString() || 'Contact us'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Class Size</p>
                    <p className="text-muted-foreground">Small groups (8-12)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Learning Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {programDetails.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">{objective}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Curriculum & Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Curriculum Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {programDetails.curriculum.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {programDetails.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Program Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Gain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {programDetails.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {user ? (
              <>
                <Button size="lg" className="flex-1" asChild>
                  <Link to="/enrollment">Enroll Now</Link>
                </Button>
                <Button size="lg" variant="outline" className="flex-1" asChild>
                  <Link to="/book-consultation">Schedule Consultation</Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" className="flex-1" asChild>
                  <Link to="/auth">Sign In to Enroll</Link>
                </Button>
                <Button size="lg" variant="outline" className="flex-1" asChild>
                  <Link to="/book-consultation">Book Free Consultation</Link>
                </Button>
              </>
            )}
            <Button size="lg" variant="secondary" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>

          {/* Additional Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium mb-2">Ready to get started?</p>
                  <p className="text-sm text-muted-foreground">
                    New cohorts start every month. Contact us to learn about upcoming start dates 
                    and secure your spot in this popular program.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramDetailsModal;