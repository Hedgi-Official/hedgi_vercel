import { Header } from "@/components/header";
import { useUser } from "@/hooks/use-user";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { HelpCircle, Shield, TrendingUp, CreditCard, Globe, Users } from "lucide-react";

export default function FAQ() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const faqCategories = [
    {
      title: "Getting Started",
      icon: <HelpCircle className="h-5 w-5" />,
      questions: [
        {
          question: "What is currency hedging and why do I need it?",
          answer: "Currency hedging is a financial strategy used to protect against adverse movements in exchange rates. If you have international business dealings, investments, or payments in foreign currencies, hedging helps you lock in favorable exchange rates and avoid unexpected losses due to currency fluctuations. Hedgi makes this professional-grade financial tool accessible to everyone."
        },
        {
          question: "How do I get started with Hedgi?",
          answer: "Getting started is simple: 1) Create your free account by clicking 'Get Started', 2) Complete the quick verification process, 3) Use our simulator to practice and understand hedging, 4) Make your first hedge when you're ready. Our platform guides you through each step with educational resources and real-time market data."
        },
        {
          question: "Do I need trading experience to use Hedgi?",
          answer: "No trading experience is required! Hedgi is designed for everyone, from complete beginners to experienced traders. We provide educational resources, a practice simulator, and step-by-step guidance. Our AI assistant, HedgiBot, is also available 24/7 to answer your questions and help you understand currency markets."
        }
      ]
    },
    {
      title: "How Hedging Works",
      icon: <Shield className="h-5 w-5" />,
      questions: [
        {
          question: "How does Hedgi's hedging mechanism work?",
          answer: "Hedgi uses professional-grade forex trading infrastructure to create hedge positions that protect your currency exposure. When you create a hedge, we establish a position that gains value when your target currency moves unfavorably, offsetting your losses. This is done through our partnerships with regulated brokers and real-time market access."
        },
        {
          question: "What currencies can I hedge with Hedgi?",
          answer: "Hedgi supports all major currency pairs including USD, EUR, GBP, JPY, CAD, AUD, CHF, and many others. You can hedge any currency pair that you have exposure to, whether from business operations, investments, or personal finances. Our platform provides real-time rates for over 50 currency pairs."
        },
        {
          question: "How quickly can I activate a hedge?",
          answer: "Hedges can be activated instantly during market hours. Our platform provides real-time market data and executes trades within seconds. The forex market operates 24/5 (Monday to Friday), so you can create hedges almost anytime except during weekend market closures."
        },
        {
          question: "What's the minimum amount I can hedge?",
          answer: "You can start hedging with as little as $100 equivalent in any supported currency. This makes professional currency hedging accessible to small businesses, freelancers, and individuals who previously couldn't access these tools due to high minimum requirements from traditional banks."
        }
      ]
    },
    {
      title: "Costs and Pricing",
      icon: <CreditCard className="h-5 w-5" />,
      questions: [
        {
          question: "How much does it cost to use Hedgi?",
          answer: "Hedgi operates on a transparent, low-cost structure. We charge a small spread on the exchange rate and a minimal management fee for active hedges. There are no hidden fees, no monthly subscriptions, and no minimum balance requirements. You only pay when you actively use our hedging services."
        },
        {
          question: "Are there any hidden fees?",
          answer: "No, we believe in complete transparency. All costs are clearly displayed before you confirm any hedge. Our fee structure includes: 1) A competitive spread on exchange rates, 2) A small management fee for active hedges, 3) No account maintenance fees, 4) No withdrawal fees. Everything is clearly shown in your dashboard."
        },
        {
          question: "How do payment processing fees work?",
          answer: "Payment processing is handled through secure, industry-standard providers. Deposit fees vary by payment method: bank transfers are typically free, credit/debit cards may have a small processing fee (usually 1-3%), and alternative payment methods vary by region. All fees are clearly displayed before you complete any transaction."
        }
      ]
    },
    {
      title: "Security and Safety",
      icon: <Shield className="h-5 w-5" />,
      questions: [
        {
          question: "Is my money safe with Hedgi?",
          answer: "Yes, your funds are protected through multiple layers of security. We work only with regulated brokers, use bank-grade encryption, implement segregated account structures, and maintain strict compliance with financial regulations. Your funds are never mixed with operational funds and are held in secure, regulated financial institutions."
        },
        {
          question: "How is Hedgi regulated?",
          answer: "Hedgi operates under strict financial regulations and works exclusively with licensed, regulated broker partners. We comply with international financial standards, implement KYC (Know Your Customer) procedures, and maintain regulatory oversight. Our platform is designed to meet or exceed industry security and compliance standards."
        },
        {
          question: "What security measures protect my account?",
          answer: "Your account is protected by: 1) Two-factor authentication (2FA), 2) Bank-grade SSL encryption, 3) Secure login monitoring, 4) Regular security audits, 5) Fraud detection systems, 6) Secure data storage with encryption at rest. We also provide real-time notifications for all account activities."
        }
      ]
    },
    {
      title: "Platform Features",
      icon: <TrendingUp className="h-5 w-5" />,
      questions: [
        {
          question: "What is HedgiBot and how can it help me?",
          answer: "HedgiBot is our AI-powered assistant that provides 24/7 support and market insights. It can help you understand currency movements, explain hedging concepts, analyze market conditions, and provide personalized recommendations based on your exposure. HedgiBot learns from real market data and can answer questions in multiple languages."
        },
        {
          question: "Can I practice before risking real money?",
          answer: "Absolutely! Our simulation feature lets you practice currency hedging with virtual money using real market data. This helps you understand how hedging works, test different strategies, and build confidence before committing real funds. The simulator includes the same tools and features as the live platform."
        },
        {
          question: "Does Hedgi work on mobile devices?",
          answer: "Yes, Hedgi is fully responsive and works seamlessly on all devices including smartphones, tablets, and desktops. You can monitor your hedges, receive alerts, and manage your positions from anywhere. We're also developing dedicated mobile apps for iOS and Android for an even better mobile experience."
        },
        {
          question: "What kind of analytics and reporting does Hedgi provide?",
          answer: "Hedgi provides comprehensive analytics including: 1) Real-time profit/loss tracking, 2) Historical performance reports, 3) Currency exposure analysis, 4) Market trend insights, 5) Risk assessment tools, 6) Customizable dashboards, 7) Export capabilities for accounting purposes. All data is updated in real-time."
        }
      ]
    },
    {
      title: "Support and Contact",
      icon: <Users className="h-5 w-5" />,
      questions: [
        {
          question: "How can I get help if I have questions?",
          answer: "We offer multiple support channels: 1) HedgiBot AI assistant (available 24/7), 2) Live chat during business hours, 3) Email support with typical response within 4 hours, 4) Comprehensive help documentation, 5) Video tutorials and webinars, 6) Community forum for user discussions. Our goal is to ensure you always have the help you need."
        },
        {
          question: "What if I need to close a hedge urgently?",
          answer: "You can close any hedge instantly during market hours through your dashboard or mobile device. Emergency closure is available 24/5 when markets are open. If you need assistance, our support team can help you close positions immediately. We also offer automated closure options based on your predetermined criteria."
        },
        {
          question: "Does Hedgi offer educational resources?",
          answer: "Yes, we provide extensive educational content including: 1) Interactive tutorials on currency hedging, 2) Market analysis and insights, 3) Webinars with financial experts, 4) Practical case studies, 5) Glossary of financial terms, 6) Video guides for platform features. Education is a core part of our mission to democratize currency hedging."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} />

      <main className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Find answers to common questions about currency hedging, how Hedgi works, 
            and how to protect your finances from currency fluctuations.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/what-is-hedge')} variant="outline">
              Learn About Hedging
            </Button>
            <Button onClick={() => navigate('/using-hedgi')} variant="outline">
              How to Use Hedgi
            </Button>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="grid gap-8">
          {faqCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  {category.icon}
                  {category.title}
                </CardTitle>
                <CardDescription>
                  Common questions about {category.title.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${categoryIndex}-${index}`}>
                      <AccordionTrigger className="text-left text-base font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-2xl">Still have questions?</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Our support team is here to help.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contact Support
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Get Started Today
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}