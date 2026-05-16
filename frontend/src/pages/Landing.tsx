import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, MessageSquare, MapPin, Shield, Zap, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const Landing: React.FC = () => {
  const features = [
    {
      icon: MapPin,
      title: 'Location-Based Feed',
      description: 'See what\'s happening in your neighborhood and stay connected with local issues that matter to you.',
    },
    {
      icon: MessageSquare,
      title: 'Community Engagement',
      description: 'Share, comment, and collaborate with your neighbors to solve community problems together.',
    },
    {
      icon: Shield,
      title: 'AI-Powered Moderation',
      description: 'Smart content validation ensures quality posts while maintaining community standards.',
    },
    {
      icon: CheckCircle,
      title: 'Issue Tracking',
      description: 'Track the progress of community issues from report to resolution with real-time updates.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Community Organizer',
      content: 'Bol Bhidu helped us fix the streetlight issue on our block within a week. The tracking system kept everyone informed!',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Mike Rodriguez',
      role: 'Local Resident',
      content: 'Finally, a platform where our voices are heard. The community response to local issues has been incredible.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Emma Thompson',
      role: 'Neighborhood Leader',
      content: 'The real-time progress updates and admin transparency make this app a game-changer for civic engagement.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-primary text-primary-foreground rounded-xl p-2">
                <span className="font-bold">BB</span>
              </div>
              <span className="text-xl font-bold text-primary">Bol Bhidu</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Testimonials
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  🚀 AI-Powered Community Platform
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
                  Connect. Share.{' '}
                  <span className="text-primary">Transform</span> Your Community
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Join thousands of community members using Bol Bhidu to solve local issues, 
                  share updates, and build stronger neighborhoods together.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Building Community
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    I Already Have an Account
                  </Button>
                </Link>
              </div>

              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>10K+ Active Users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>500+ Issues Resolved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Free to Use</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1752145446644-2e6069c79e95?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tdW5pdHklMjBwZW9wbGUlMjBjaXR5JTIwdXJiYW58ZW58MXx8fHwxNzU5NDk3MTk1fDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Community members collaborating"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-card border rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Issue Resolved!</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Streetlight fixed ✨</p>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-card border rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">5 New Comments</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Community discussing...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="secondary" className="w-fit mx-auto">
              ✨ Powerful Features
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold">
              Everything You Need for{' '}
              <span className="text-primary">Community Building</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the tools and features that make Bol Bhidu the perfect platform 
              for strengthening your community connections.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="secondary" className="w-fit mx-auto">
              🔄 Simple Process
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold">
              How <span className="text-primary">Bol Bhidu</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Getting started is easy. Follow these simple steps to begin making 
              a difference in your community.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold">Share Community Issues</h3>
              <p className="text-muted-foreground">
                Post about local problems, improvements needed, or community events. 
                Add photos, descriptions, and location details.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold">Community Engagement</h3>
              <p className="text-muted-foreground">
                Neighbors like, comment, and share issues that matter to them. 
                High engagement signals prioritize important problems.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold">Track Progress</h3>
              <p className="text-muted-foreground">
                Admin teams review, validate, and work on issues. 
                You'll get real-time updates until resolution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="secondary" className="w-fit mx-auto">
              💬 Community Stories
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold">
              What Our <span className="text-primary">Community</span> Says
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real stories from real people who are making a difference 
              in their communities with Bol Bhidu.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex text-accent">
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>⭐</span>
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <ImageWithFallback
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 lg:p-20 text-center text-primary-foreground">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-3xl lg:text-5xl font-bold">
                Ready to Transform Your Community?
              </h2>
              <p className="text-xl opacity-90">
                Join thousands of community members who are already making a difference. 
                Start building stronger neighborhoods today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="bg-primary text-primary-foreground rounded-xl p-2">
                  <span className="font-bold">BB</span>
                </div>
                <span className="text-xl font-bold text-primary">Bol Bhidu</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting communities and empowering civic engagement through technology.
              </p>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#features" className="block hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="block hover:text-foreground transition-colors">How it Works</a>
                <a href="#" className="block hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="block hover:text-foreground transition-colors">FAQ</a>
              </div>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h3 className="font-semibold">Company</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-foreground transition-colors">About</a>
                <a href="#" className="block hover:text-foreground transition-colors">Blog</a>
                <a href="#" className="block hover:text-foreground transition-colors">Careers</a>
                <a href="#" className="block hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>

            {/* Legal Links */}
            <div className="space-y-4">
              <h3 className="font-semibold">Legal</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="#" className="block hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-foreground transition-colors">Terms of Service</a>
                <a href="#" className="block hover:text-foreground transition-colors">Cookie Policy</a>
                <a href="#" className="block hover:text-foreground transition-colors">Guidelines</a>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Bol Bhidu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;