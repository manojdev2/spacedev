import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Map, Brain, Layers, Shield, Zap, Globe, ArrowRight, CheckCircle2, Star, Quote, HelpCircle, Target, TrendingUp, Users, Play } from 'lucide-react';
import heroDemo from '@/assets/hero-demo.mp4';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const features = [
  {
    icon: Layers,
    title: 'Store Coverage Zones',
    description: 'Draw polygons, circles, or use zip codes to define store coverage areas with precision.',
  },
  {
    icon: Brain,
    title: 'AI Optimization',
    description: 'Identify coverage gaps and get AI-powered suggestions for new store locations.',
  },
  {
    icon: Target,
    title: 'Store Zone Assignment',
    description: 'Assign areas to teams or agents with automatic overlap detection and prevention.',
  },
  {
    icon: TrendingUp,
    title: 'Demand Heatmaps',
    description: 'Visualize where requests originate with time-based heat analysis and trends.',
  },
  {
    icon: Map,
    title: 'What-If Simulation',
    description: 'Simulate adding stores and instantly see how coverage would improve.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'JWT authentication, role-based access, and multi-tenant architecture built-in.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$99',
    period: '/month',
    description: 'Perfect for small teams',
    features: ['Up to 10 store zones', 'Basic heatmaps', 'Email support', 'Polygon & radius zones'],
    popular: false,
  },
  {
    name: 'Professional',
    price: '$299',
    period: '/month',
    description: 'For growing operations',
    features: ['Up to 50 store zones', 'AI optimization', 'Priority support', 'What-if simulation', 'API access'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['Unlimited store zones', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'White-label'],
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'VP of Operations',
    company: 'DeliveryMax',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    content: 'LocatePro transformed our delivery planning. We reduced coverage gaps by 40% and improved response times across all zones.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Director of Field Services',
    company: 'TechInstall Pro',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'The AI optimization is game-changing. It suggested 3 new service points that increased our coverage by 25% without adding staff.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of Logistics',
    company: 'GreenFleet Services',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'Finally, a platform that shows us exactly where demand is coming from. The heatmaps are incredibly actionable.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'CEO',
    company: 'FastFix Repairs',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    content: 'We eliminated all zone overlaps between our field teams. No more duplicate visits, no more confusion.',
    rating: 5,
  },
];

const faqs = [
  {
    question: 'How does LocatePro identify coverage gaps?',
    answer: 'Our AI analyzes your current service area boundaries against incoming demand data, geographic features, and population density to identify underserved zones. It then provides actionable recommendations for expanding coverage.',
  },
  {
    question: 'Can I import my existing store zone data?',
    answer: 'Absolutely! LocatePro supports importing store zones via GeoJSON, KML, and CSV formats. You can also draw zones directly on the map or define them by zip code boundaries.',
  },
  {
    question: 'How accurate are the demand heatmaps?',
    answer: 'Heatmaps are generated from real request data you provide, combined with demographic and foot traffic data. You can view historical patterns, seasonal trends, and time-of-day variations for maximum accuracy.',
  },
  {
    question: 'Can teams see only their assigned store zones?',
    answer: 'Yes! Role-based access control allows you to restrict visibility so field teams only see their assigned zones, while managers get the complete picture.',
  },
  {
    question: 'What does the What-If simulation show?',
    answer: "You can place a hypothetical new store on the map and instantly see how it affects your overall coverage percentage, drive-time radius, and overlap with existing zones. It's like having a strategic planning tool at your fingertips.",
  },
  {
    question: 'Is my data secure?',
    answer: 'Security is our top priority. We use enterprise-grade encryption, secure data centers, and comply with GDPR and CCPA regulations. Your store zone and customer data is never shared.',
  },
  {
    question: 'How does overlap detection work?',
    answer: 'When you create or modify store zones, our system automatically checks for intersections with existing zones. You can choose to allow overlaps (for multi-team coverage) or prevent them entirely.',
  },
  {
    question: 'Do you provide analytics and reporting?',
    answer: 'All plans include dashboards showing coverage metrics, demand distribution, and store zone performance. Professional and Enterprise plans add custom reports, export capabilities, and API access.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-hero">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-primary">Trusted by 2,500+ field operations teams</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Know Where to Grow.
              <br />
              <span className="text-gradient">Decide With Confidence.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop guessing where to expand. LocatePro uses AI-powered heatmaps and What-If simulations to show you exactly where demand is—and where your next location should be.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/locator">
                <Button variant="hero" size="xl">
                  Try Live Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl">
                  Start Free Trial
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • Set up in 5 minutes • Cancel anytime
            </p>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-card group">
              <div className="aspect-[16/9] relative">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={heroDemo} type="video/mp4" />
                </video>
                {/* Overlay with CTA */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8">
                  <Link to="/locator">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-lg"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Try Interactive Demo
                    </motion.div>
                  </Link>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-2xl blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-2xl blur-2xl" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background" id="features">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to <span className="text-gradient">optimize</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for store zone planning, coverage analysis, and strategic decision-making.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Star className="h-4 w-4 fill-current" />
              Customer Stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by <span className="text-gradient">industry leaders</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See why operations teams choose LocatePro for strategic store zone planning.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                variants={itemVariants}
                className="relative p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/20"
              >
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-warning fill-warning" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-2xl bg-card border border-border"
          >
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient">50,000+</p>
              <p className="text-sm text-muted-foreground mt-1">Store Zones Managed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient">2,500+</p>
              <p className="text-sm text-muted-foreground mt-1">Field Teams</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient">35%</p>
              <p className="text-sm text-muted-foreground mt-1">Avg. Coverage Improvement</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient">4.9/5</p>
              <p className="text-sm text-muted-foreground mt-1">Customer Rating</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-background" id="pricing">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent <span className="text-gradient">pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your operations. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                className={`relative p-8 rounded-2xl border ${
                  plan.popular
                    ? 'border-primary bg-card shadow-xl shadow-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button
                    variant={plan.popular ? 'hero' : 'outline'}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently asked <span className="text-gradient">questions</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about LocatePro. Can't find what you're looking for? Contact our support team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border rounded-xl px-6 bg-card data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-12 text-center p-8 rounded-2xl border border-border bg-card"
            >
              <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">
                Our support team is here to help you get started.
              </p>
              <Link to="/contact">
                <Button variant="outline">
                  Contact Support
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to optimize your store coverage?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of operations teams already using LocatePro to make smarter decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button variant="hero" size="lg">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/locator">
                <Button variant="outline" size="lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}