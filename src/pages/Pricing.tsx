import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, CreditCard, Building2, Bitcoin, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckoutDialog } from '@/components/payments/CheckoutDialog';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

type PlanKey = 'starter' | 'professional' | 'enterprise';

const pricingPlans: Array<{
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  key: PlanKey;
}> = [
  {
    name: 'Starter',
    key: 'starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for small businesses',
    features: [
      'Up to 25 locations',
      'Basic analytics dashboard',
      'Email support',
      'Custom branding',
      'Mobile responsive',
    ],
    popular: false,
  },
  {
    name: 'Professional',
    key: 'professional',
    price: '$79',
    period: '/month',
    description: 'For growing companies',
    features: [
      'Up to 100 locations',
      'Advanced analytics & reports',
      'Priority support',
      'API access',
      'Custom domains',
      'Team management (5 users)',
      'CSV export',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Unlimited locations',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
      'White-label solution',
      'Unlimited team members',
      'On-premise deployment option',
    ],
    popular: false,
  },
];

const faqs = [
  {
    question: 'Can I try LocatePro for free?',
    answer: 'Yes! We offer a 14-day free trial with full access to all Professional features. No credit card required.',
  },
  {
    question: 'What happens when I exceed my location limit?',
    answer: "You'll receive a notification and can easily upgrade to a higher plan. Your existing locations will continue to work.",
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time. You will retain access until the end of your billing period.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Save 20% when you choose annual billing. Contact us for enterprise pricing.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Your data is encrypted in transit and at rest. We use enterprise-grade security and are SOC 2 compliant.',
  },
];

const paymentMethods = [
  { icon: CreditCard, label: 'Credit Cards', description: 'Visa, Mastercard, Amex' },
  { icon: Building2, label: 'PayPal', description: 'Coming Soon' },
  { icon: Bitcoin, label: 'Crypto', description: 'Coming Soon' },
  { icon: Landmark, label: 'Bank Transfer', description: 'ACH/Wire' },
];

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'canceled') {
      toast({
        title: 'Payment Canceled',
        description: 'Your payment was canceled. Feel free to try again.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const handleSelectPlan = (plan: typeof pricingPlans[0]) => {
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, transparent <span className="text-gradient">pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business. Start free and upgrade as you grow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 sm:py-16 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-6 sm:p-8 rounded-2xl border ${
                  plan.popular
                    ? 'border-primary bg-card shadow-xl shadow-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? 'hero' : 'outline'}
                  className="w-full"
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground mb-4">Accepted payment methods</p>
            <div className="flex flex-wrap justify-center gap-6">
              {paymentMethods.map((method) => (
                <div key={method.label} className="flex items-center gap-2 text-muted-foreground">
                  <method.icon className="h-5 w-5" />
                  <span className="text-sm">{method.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-xl border border-border bg-card"
              >
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <Link to="/login">
            <Button variant="hero" size="lg">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Checkout Dialog */}
      {selectedPlan && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          plan={selectedPlan}
          planKey={selectedPlan.key}
        />
      )}
    </div>
  );
}
